/**!
 * Chameleon Viewer
 * A simple image viewer
 * 
 * Author:       Andrés López
 * Version:      0.7.0
 * Last update:  08/09/2016
 *
 * Requires:
 *  - jQuery v1.3+
 *  - jQuery Mousewheeel v3.1+
 *  - screenfull v3+
 *  - hammerJS v2.0.8+
 */

(function($, document, window, screenfull) {

	"use strict";

	// Changing images increments
	var NEXT_IMAGE = 1, PREV_IMAGE = -1;

	// Initialized chameleon viewers and their configuration (options + positions)
	var viewers = {};

	$.fn.chameleon = function (params, optParams){

		// If the options are a command and this command exists...
		if (typeof params === 'string' && params in $.fn.chameleon.externalFunctions){
			return $.fn.chameleon.externalFunctions[params]($(this).selector, optParams);
		}

		// Else, maybe they are a dict initializing the viewer...
		else if (typeof params === 'object' || params === undefined){
		
			var options = (params !== undefined && 'options' in params) ? params.options : {};
			var positions = (params !== undefined && 'positions' in params) ? params.positions : {};

			// If the selector succeeds and the viewer hasn't been initialized on this element, initialize it
			if (!($(this).selector in viewers) && $(this).length > 0){

				// TODO: check options and positions for good values

				// Override default configuration
				options = $.extend({}, $.fn.chameleon.options, options);
				positions = $.extend({}, $.fn.chameleon.positions, positions);

				// Add the width and height options
				options.width = 0;
				options.height = 0;

				// Add the background image position pixels
				options.pixelX = 0;
				options.pixelY = 0;

				// Add the cursor pixels positions
				options.cursorDown = { pixelX: 0, pixelY: 0 };

				// Add the hammer object which encapsulates the mobile devices touch events
				options.hammer = new Hammer($(this)[0]);
				options.hammer.get('pinch').set({ enable: true });
				options.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

				// Save the configuration and init the viewer
				viewers[$(this).selector] = { 'options': options, 'positions': positions };
				initViewer($(this).selector);

			}
		} // Else, they are a wrong parameter
	};


	/**
	 * Description: initializes the viewer on the specified selector.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function initViewer (selector){

		// Set the viewer class on the selector and make it selectable (for keyArrows navigation)
		$(selector).addClass('chameleon-viewer');
		$(selector).attr('tabindex', '1');

		// Append the container sections, where the rest of elements will be displayed
		_appendContainerAndSections(selector);

		// Add the elements to their specific section
		_addElementsToSections(selector);

		// Hide the disabled elements
		_hideDisabledElements(selector);

		// Show the first image
		_showImage(selector);

		// Set the viewer title
		$(selector + ' .chameleon-title').text(viewers[selector].options.title);

		// Set the images total number
		_setImagesTotalNumber(selector, viewers[selector].options.images.length);

		// Add the specific bindings for each element
		_setBindings(selector);

	}


	/**
	 * Description: adds the sections to the specified selector.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function _appendContainerAndSections (selector){

		// Append the viewer elements container, where every option (except the previews) will be
		$(selector).append('<div class="chameleon-elements-container"></div>');

		// Set the container selector for the rest of the sections
		var container = selector + ' .chameleon-elements-container';

		$(container).append(
			'<div class="chameleon-top-section">' +
				'<div class="chameleon-top-left-section"></div>' +
				'<div class="chameleon-top-center-section"></div>' +
				'<div class="chameleon-top-right-section"></div>' +
			'</div>'
		);

		$(container).append(
			'<div class="chameleon-bottom-section">' +
				'<div class="chameleon-bottom-left-section"></div>' +
				'<div class="chameleon-bottom-center-section"></div>' +
				'<div class="chameleon-bottom-right-section"></div>' +
			'</div>'
		);

		$(container).append(
			'<div class="chameleon-left-section">' +
				'<div class="chameleon-left-top-section"></div>' +
				'<div class="chameleon-left-center-section"></div>' +
				'<div class="chameleon-left-bottom-section"></div>' +
			'</div>'
		);

		$(container).append(
			'<div class="chameleon-right-section">' +
				'<div class="chameleon-right-top-section"></div>' +
				'<div class="chameleon-right-center-section"></div>' +
				'<div class="chameleon-right-bottom-section"></div>' +
			'</div>'
		);

		// Hide the container until the cursor hovers the it
		$(container).hide();

	}


	/**
	 * Description: adds all the desired elements to their corresponding sections in the specified selector.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function _addElementsToSections (selector){

		var sectionKeys = Object.keys(viewers[selector].positions);
		var subsectionKeys, i, j, section;

		for (i = 0; i < sectionKeys.length; i++){

			subsectionKeys = Object.keys(viewers[selector].positions[sectionKeys[i]]);

			for (j = 0; j < subsectionKeys.length; j++){

				// If this key value isn't an empty dict, load the specific section with this elements
				if (!$.isEmptyObject(viewers[selector].positions[sectionKeys[i]][subsectionKeys[j]])){

					section = selector + ' .chameleon-' + sectionKeys[i] + '-' + subsectionKeys[j] + '-section';
					_addElementsToSection(section, viewers[selector].positions[sectionKeys[i]][subsectionKeys[j]]);

					// If it is a vertical section...
					if (sectionKeys[i] === 'left' || sectionKeys[i] === 'right'){

						// ... push the elements to the border...
						if (sectionKeys[i] === 'left'){ $(section).children().addClass('chameleon-push-left'); }
						else { $(section).children().addClass('chameleon-push-right'); }

						// ... and add padding to the vertical section
						$(section).addClass('chameleon-vertical-section-padding');

					// Else, add the horizontal padding to this section
					} else { $(section).addClass('chameleon-horizontal-section-padding'); }
				}
			}
		}

		// Hide the slide container until the cursor hovers its container
		$(selector + ' .chameleon-zoom-slide-container').hide();

		// Set the maximum, minimum, default and step values for the slider
		$(selector + ' .chameleon-zoom-slider').attr('max', viewers[selector].options.maxZoom);
		$(selector + ' .chameleon-zoom-slider').attr('min', viewers[selector].options.minZoom);
		$(selector + ' .chameleon-zoom-slider').attr('value', viewers[selector].options.minZoom);
		$(selector + ' .chameleon-zoom-slider').attr('step', viewers[selector].options.zoomStep);

	}


	/**
	 * Description: adds the array of elements to the specified section in the specified selector.
	 * Params:
	 *     - section    {string}    the section where the elements will be added
	 *     - elements   {array}     elements to add in the specified section
	 */
	function _addElementsToSection (section, elements){

		for (var i = 0; i < elements.length; i++){ $(section).append(_getElementHtml(elements[i])); }

	}


	/**
	 * Description: returns a viewer element HTML code.
	 * Params:
	 *     - element    {string}    desired element to get its HTML code
	 * Returns: the HTML code of the specified element.
	 */
	function _getElementHtml (element){

		var elementHtml;

		switch (element){

			case 'fullscreen': elementHtml = '<img class="chameleon-fullscreen" src="chameleon_assets/fullscreen.png">'; break;
			case 'imagesNumber': elementHtml =
				'<div class="chameleon-images-counter">' +
					'<div class="chameleon-images-total-container">' +
						'<span class="chameleon-images-separator">/</span>' +
						'<span class="chameleon-images-total"></span>' +
					'</div>' +
					'<input type="text" class="chameleon-images-current">' +
				'</div>';
				break;
			case 'nextArrow': elementHtml = '<img class="chameleon-next-arrow" src="chameleon_assets/arrowNext.png" >'; break;
			case 'prevArrow': elementHtml = '<img class="chameleon-prev-arrow" src="chameleon_assets/arrowPrev.png" >'; break;
			case 'subtitle': elementHtml = '<div class="chameleon-subtitle"></div>'; break;
			case 'title': elementHtml = '<div class="chameleon-title"></div>'; break;
			case 'zoom': elementHtml =
				'<div class="chameleon-zoom-container">' +
					'<img class="chameleon-zoom-in" src="chameleon_assets/zoomIn.png" >' +
					'<div class="chameleon-zoom-slide-container">' +
						'<input type="range" class="chameleon-zoom-slider">' +
						'<img class="chameleon-zoom-out" src="chameleon_assets/zoomOut.png" >' +
					'</div>' +
				'</div>';
				break;
			default: elementHtml = ''; break;

		}

		return elementHtml;

	}


	/**
	 * Description: hides the viewer disabled elements.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function _hideDisabledElements (selector){

		var options = viewers[selector].options;

		if (options.title === ''){ $(selector + ' .chameleon-title').hide(); }
		if (!options.subtitle){ $(selector + ' .chameleon-subtitle').hide(); }
		if (!options.imagesCounter){ $(selector + ' .chameleon-images-counter').hide(); }
		if (!options.fullscreen){ $(selector + ' .chameleon-fullscreen').hide(); }
		if (!options.zoom){ $(selector + ' .chameleon-zoom').hide(); }

	}


	/**
	 * Description: shows an image on the viewer and updates the current image position.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function _showImage (selector){

		var options = viewers[selector].options, position = options.currentImage;

		// If the image position isn't bigger than the images total and the image position ins't negative...
		if (options.images.length > position && position >= 0){

			var image = options.images[position];

			// ... show the image,...
			if ('url' in image){
				$(selector).css('background-image', 'url("' + image.url + '")');
				// ... update the image size and center it,...
				_updateBackgroundImageSize(selector, image.url);
			}

			// ... show thhe image subtitle (if it is enabled)...
			if ('subtitle' in image){ $(selector + ' .chameleon-subtitle').text(image.subtitle); }

			// ... and update the image number
			_setImageNumber(selector, position + 1);

		// Else, the position is incorrect, show the images total number as image position (for example, when there isn't any image)
		} else { _setImageNumber(selector, viewers[selector].options.images.length); }

	}


	/**
	 * Description: updates the current image size and the background image position of the viewer element when
	 *              the image loads.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - imageURL    {string}    the image URL
	 */
	function _updateBackgroundImageSize (selector, imageURL){

		var image = new Image(), viewer = $(selector);
		image.src = imageURL;

		// Reset the background size to minimize the image size change contrast
		$(selector).css('background-size', 'contain');

		$(image).load(function (){

			var imageSize = _calcBackgroundImageSize(image.width, image.height, viewer.width(), viewer.height());
			viewers[selector].options.width = imageSize.width;
			viewers[selector].options.height = imageSize.height;

			$(selector).css('background-size', imageSize.width + 'px ' + imageSize.height + 'px');
			_updateBackgroundImagePosition(selector);

		});
	}


	/**
	 * Description: calculates the current background image size based on the  real image and viewer dimensions.
	 * Params:
	 *     - w1          {float}     image width
	 *     - h1          {float}     image height
	 *     - w2          {float}     viewer width
	 *     - h1          {float}     viewer height
	 * Returns: a dict containing the current image size.
	 */
	function _calcBackgroundImageSize (w1, h1, w2, h2){

		var ratio1 = w1/h1, ratio2 = w2/h2, result = [];

		if (w1 <= w2 && h1 <= h2){

			result.width = w1;
			result.height = h1;

		} else if (w1 <= w2 && h1 > h2){

			result.width = h2*ratio1;
			result.height = h2;

		} else if (w1 > w2 && h1 <= h2){

			result.width = w2;
			result.height = w2/ratio1;

		} else {

			if (ratio1 === ratio2){

				result.width = w2;
				result.height = h2;

			} else if (ratio1 > ratio2){

				result.width = w2;
				result.height = w2/ratio1;

			} else {

				result.width = h2*ratio1;
				result.height = h2;

			}
		}

		return result;

	}


	/**
	 * Description: updates the image position according to its current zoom and if the image has been resized
	 * (so, the image has been zoomed).
	 * Params:
	 *     - selector    {string}     viewer element
	 *     - zoom        {float}      new image zoom
	 */
	function _updateBackgroundImagePosition (selector, zoom){
		
		var options = viewers[selector].options,
			viewerWidth = $(selector).width(),
			viewerHeight = $(selector).height(),
			pixelX, pixelY;

		if (zoom === undefined){

			pixelX = _calcBackgroundImageCenteredAxis(options.width, viewerWidth, options.currentZoom);
			pixelY = _calcBackgroundImageCenteredAxis(options.height, viewerHeight, options.currentZoom);

		} else {

			pixelX = _calcBackgroundImagePoint(options.width, viewerWidth, options.pixelX, options.currentZoom, zoom);
			pixelY = _calcBackgroundImagePoint(options.height, viewerHeight, options.pixelY, options.currentZoom, zoom);

		}
		
		viewers[selector].options.pixelX = pixelX;
		viewers[selector].options.pixelY = pixelY;

		if (zoom === undefined && options.currentZoom === options.minZoom || zoom === options.minZoom){
			// Reset the image position if the zoom is the minimum
			$(selector).css('background-position', '');
		} else {
			$(selector).css('background-position', pixelX + 'px ' + pixelY + 'px');
		}
	}


	/**
	 * Description: calculates the point that centers the image inside its container.
	 * Params:
	 *     - imgDim      {float}     image dimension
	 *     - viewerDim   {float}     viewer dimension
	 *     - zoom        {float}     image zoom
	 * Return: the point which centers the image in its container.
	 */
	function _calcBackgroundImageCenteredAxis (imgDim, viewerDim, zoom){

		return (viewerDim - imgDim * zoom)/2;

	}


	/**
	 * Description: calculates the point which centers the image inside its container according to its new zoom
	 *              and the image position (which, maybe, has been moved), instead of just centering the image
	 *              axis.
	 * Params:
	 *     - imgDim      {float}     image dimension
	 *     - viewerDim   {float}     viewer dimension
	 *     - point       {float}     current image position dimension
	 *     - currentZoom {float}     current image zoom
	 *     - zoom        {float}     new image zoom
	 * Return: the point which centers the image in its container according to the new zoom and the image
	 *         position.
	 */
	function _calcBackgroundImagePoint (imgDim, viewerDim, point, currentZoom, zoom){

		if ((imgDim * zoom) <= viewerDim){ return _calcBackgroundImageCenteredAxis(imgDim, viewerDim, zoom); }
		else {

			var result = point + (imgDim * (currentZoom - zoom)/2);
			if (result > 0){ result = 0; }
			else if (result < viewerDim - imgDim*zoom){ result = viewerDim - imgDim*zoom; }
			return result;

		}
	}


	/**
	 * Description: sets the images total number on the specific element.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - number      {integer}   images total number
	 */
	function _setImagesTotalNumber (selector, number){

		$(selector + ' .chameleon-images-total').text(number);

	}


	/**
	 * Description: sets the current image number on the specific element.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - number      {integer}   current image number
	 */
	function _setImageNumber (selector, number){

		$(selector + ' .chameleon-images-current').val(number);

	}


	/**
	 * Description: changes the current image to the next or previous image direction.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - direction   {integer}   next or previous image
	 */
	function _changeImage (selector, direction){

		_calcImagePosition(selector, direction);
		_showImage(selector);

	}


	/**
	 * Description: calculates the image position and stores it in the currentImage option.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - increment   {integer}   step to calculate the image position to show
	 */
	function _calcImagePosition (selector, increment){

		var position = viewers[selector].options.currentImage + increment,
			total = viewers[selector].options.images.length;

		if (position >= total){ position = 0; }
		else if (position < 0){ position = total - 1; }
		viewers[selector].options.currentImage = position;

	}


	/**
	 * Description: zooms the image according to the specified zoom.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - zoom        {float}     new image zoom
	 */
	function _zoom (selector, zoom){

		var options = viewers[selector].options;

		if (viewers[selector].options.currentZoom !== zoom){

			$(selector).css('background-size', options.width * zoom + 'px ' + options.height * zoom+ 'px');
			_updateBackgroundImagePosition(selector, zoom);
			viewers[selector].options.currentZoom = zoom;

			// Show and hide next and prev arrows and change container background color on zoom change
			if (zoom === viewers[selector].options.minZoom){

				$(selector + ' .chameleon-next-arrow').show();
				$(selector + ' .chameleon-prev-arrow').show();
				$(selector + ' .chameleon-elements-container').removeClass('chameleon-elements-container-zoom');

			} else if ($(selector + ' .chameleon-next-arrow').is(':visible')){

				$(selector + ' .chameleon-next-arrow').hide();
				$(selector + ' .chameleon-prev-arrow').hide();
				$(selector + ' .chameleon-elements-container').addClass('chameleon-elements-container-zoom');

			}
		}
	}


	/**
	 * Description: changes the image position according to the image dimension increments of the move.
	 * Params:
	 *     - selector    {string}    the viewer element
	 *     - dimX        {integer}   increment on X axis
	 *     - dimY        {integer}   increment on Y axis
	 */
	function _moveBackgroundImage (selector, dimX, dimY){

		// Calculate the minimum pixel values to show the entire image but don't show the background when the
		// image is moved to the left
		var imageWidth = viewers[selector].options.width * viewers[selector].options.currentZoom,
			imageHeight = viewers[selector].options.height * viewers[selector].options.currentZoom,
			minPixelX = $(selector).width() - imageWidth, minPixelY = $(selector).height() - imageHeight,
			move = false;

		// If the image width is bigger than the container width, it can be moved
		if (imageWidth > $(selector).width()){

			viewers[selector].options.pixelX += dimX;
			move = true;

			if (viewers[selector].options.pixelX > 0){ viewers[selector].options.pixelX = 0; }
			else if (viewers[selector].options.pixelX < minPixelX){ viewers[selector].options.pixelX = minPixelX; }

		}

		// If the image height is bigger than the container height, it can be moved
		if (imageHeight > $(selector).height()){
			
			viewers[selector].options.pixelY += dimY;
			move = true;

			if (viewers[selector].options.pixelY > 0){ viewers[selector].options.pixelY = 0; }
			else if (viewers[selector].options.pixelY < minPixelY){ viewers[selector].options.pixelY = minPixelY; }

		}

		// If the image can be moved, change the position of the image according to the X and Y coordinates
		// previously calculated
		if (move){ $(selector).css('background-position', viewers[selector].options.pixelX + 'px ' + viewers[selector].options.pixelY + 'px'); }

	}


	/**
	 * Description: checks if an image position is valid (must be an integer between 1 and the images total
	 *              number).
	 * Params:
	 *     - number      {integer}   new image position
	 *     - current     {integer}   current image position
	 *     - total       {integer}   images total number
	 * Return: a valid image position.
	 */
	function _checkCorrectImagePosition (number, current, total){

		var result = 0;

		if (!isNaN(number)){

			// If the number is an integer...
			if (number % 1 === 0){ result = (number > 0 && number <= total) ? number-1 : current; }
			else { result = current; }

		}

		return result;

	}


	function _zoomRecognition (selector, delta){

		// If the current zoom is bigger than the minimum zoom and its being zoomed out or the current
		// zoom is smaller than the maximum zoom and its beeing zoomed in, zoom the viewer
		if ((viewers[selector].options.currentZoom > viewers[selector].options.minZoom && delta < 0) ||
			(viewers[selector].options.currentZoom < viewers[selector].options.maxZoom && delta > 0)){

			// New zoom value
			var newZoom = viewers[selector].options.currentZoom + viewers[selector].options.zoomStep * delta;
			_zoom(selector, newZoom);
			// Update slider value
			$(selector + ' .chameleon-zoom-slider').attr('value', newZoom);

		}
	}


	function _toggleContainer (selector){

		if ($(selector + ' .chameleon-elements-container').is(':visible')){

			$(selector + ' .chameleon-elements-container').hide();

		} else {

			$(selector + ' .chameleon-elements-container').show();

		}
	}


	/**
	 * Description: initializes the binding for all the elements, enabling the interaction with the viewer.
	 * Params:
	 *     - selector    {string}    the viewer element
	 */
	function _setBindings (selector){

		var options = viewers[selector].options;
		var lastScale = 0;
		var click = false;
		var dragging = false;
		var isMobile = /Mobi/.test(navigator.userAgent); // Checks if the device is mobile (quick & easy solution, but not the best one)

		// Hover binding for the container
		$(selector).hover(function (){

			// Shows the container and its elements with a fade
			if (!isMobile && !$(selector + ' .chameleon-images-current').is(':focus')){
				$(selector + ' .chameleon-elements-container').fadeIn(100);
			}

		}, function (){

			// Hides the container and its elements with a fade
			if (!isMobile && !$(selector + ' .chameleon-images-current').is(':focus')){
				$(selector + ' .chameleon-elements-container').fadeOut(100);
			}

		});

		// If fullscreen is enabled on the browser...
		if (screenfull.enabled) {

			// ... bind the fullscreen events to the fullscreen element...
			$(selector + ' .chameleon-fullscreen').click(function (){

				// ... if the fullscreen mode is enabled by the user
				if (options.fullscreen){
					if (!screenfull.isFullscreen){ screenfull.request($(selector)[0]); }
					else { screenfull.exit(); }
				}
			});

			// Also, when fullscreen changes, add/remove viewer fullscreen mode and change the fullscreen icons
			document.addEventListener(screenfull.raw.fullscreenchange, function (){

				if (screenfull.isFullscreen){
					$(selector + ' .chameleon-fullscreen').attr('src', 'chameleon_assets/normalscreen.png');
					$(selector).addClass('chameleon-fullscreen-viewer');
				} else {
					$(selector + ' .chameleon-fullscreen').attr('src', 'chameleon_assets/fullscreen.png');
					$(selector).removeClass('chameleon-fullscreen-viewer');
				}

				if (viewers[selector].options.images.length > 0){
					_updateBackgroundImageSize(selector,
						viewers[selector].options.images[viewers[selector].options.currentImage].url);
				}
			});
		}

		// Next image binding
		$(selector + ' .chameleon-next-arrow').click(function (){

			_changeImage(selector, NEXT_IMAGE);

		});

		// Previous image binding
		$(selector + ' .chameleon-prev-arrow').click(function (){

			_changeImage(selector, PREV_IMAGE);

		});

		// Keyboard arrow navigation and current image change
		$(selector).keydown(function(event) {

			// If the keyboard arrows navigation is enabled and the current image input hasn't the focus...
			if (options.keyArrows && !$(selector + ' .chameleon-images-current').is(':focus')){

				// ... change the displaying image according to the key pressed (if the background image isn't zoomed)
				if (event.which === 39 && viewers[selector].options.currentZoom === viewers[selector].options.minZoom){

					_changeImage(selector, NEXT_IMAGE); // Right arrow

				} else if (event.which === 37 && viewers[selector].options.currentZoom === viewers[selector].options.minZoom){

					_changeImage(selector, PREV_IMAGE); // Left arrow

				}
			}

			// If the image position is changed...
			if ($(selector + ' .chameleon-images-current').is(':focus') && event.which === 13){

				// ... check if its a valid position, put it as the new position and show the image
				options.currentImage = _checkCorrectImagePosition(
					$(selector + ' .chameleon-images-current').val(),
					options.currentImage,
					options.images.length);

				_showImage(selector);
				$(selector).focus();

				// If the cursor isn't hovering the viewer, fadeOut
				if ($(selector + ':hover').length === 0){
					$(selector + ' .chameleon-elements-container').fadeOut(100);
				}

			}
		});

		// Zoom slider container hovering event
		$(selector + ' .chameleon-zoom-container').hover(function (){

			$(selector + ' .chameleon-zoom-slide-container').slideDown(200);

		}, function (){

			$(selector + ' .chameleon-zoom-slide-container').slideUp(200);

		});

		// Moving slide (zoom) event
		$(selector).on('input', '.chameleon-zoom-slider', function() {

			_zoom(selector, parseFloat($(this).val()));

		});

		// Mouse wheel scroll
		$(selector).on('mousewheel', function (event) {

			_zoomRecognition(selector, event.deltaY);

		});

		// Disable moving the slider with th keyboard arrows
		$(selector + ' .chameleon-zoom-slider').keydown(function (){
			return false;
		});

		// Moving resized image
		/*$(selector).on('mousedown', function (event){

			cursorDown(event.pageX, event.pageY, $(this).offset().left, $(this).offset().top);

		}).on('mousemove', function (event){

			cursorMove(event.pageX, event.pageY, $(this).offset().left, $(this).offset().top);

		}).on('mouseup', function (){

			cursorUp();

		});*/

		// Hide/show elements container on click
		$(selector).on('mousedown', function (){

			click = true;

		});

		$(selector).click(function (){

			if (click && $(selector + ' .chameleon-prev-arrow:hover').length === 0 && 
				$(selector + ' .chameleon-next-arrow:hover').length === 0){

				_toggleContainer(selector);

			}

		});

		// Next and previous image binding
		viewers[selector].options.hammer.on('swipeleft', function (){

			if (viewers[selector].options.currentZoom === viewers[selector].options.minZoom){
				_changeImage(selector, NEXT_IMAGE);
			}

		}).on('swiperight', function (){

			if (viewers[selector].options.currentZoom === viewers[selector].options.minZoom){ 
				_changeImage(selector, PREV_IMAGE);
			}

		}).on('pinchstart', function (event){

			lastScale = event.scale;

		}).on('pinch', function (event){

			if (lastScale > event.scale){

				_zoomRecognition(selector, -1);

			} else {

				_zoomRecognition(selector, 1);

			}

			lastScale = event.scale;

		}).on('panstart', function (event){

			if (isMobile){
				cursorDown(event.srcEvent.touches[0].pageX, event.srcEvent.touches[0].pageY, $(selector).offset().left, $(selector).offset().top);
			} else {
				cursorDown(event.srcEvent.pageX, event.srcEvent.pageY, $(selector).offset().left, $(selector).offset().top);
			}

		}).on('panmove', function (event){

			if (isMobile){
				cursorMove(event.srcEvent.touches[0].pageX, event.srcEvent.touches[0].pageY, $(selector).offset().left, $(selector).offset().top);	
			} else {
				cursorMove(event.srcEvent.pageX, event.srcEvent.pageY, $(selector).offset().left, $(selector).offset().top);
			}

		}).on('panend', function (){

			cursorUp();

		});

		$(window).on('resize', function(){
			if (viewers[selector].options.images.length > 0){
				_updateBackgroundImageSize(selector,
					viewers[selector].options.images[viewers[selector].options.currentImage].url);
			}
		});


		var cursorDown = function _cursorDown (pageX, pageY, offsetLeft, offsetTop){

			viewers[selector].options.cursorDown.pixelX = pageX - offsetLeft;
			viewers[selector].options.cursorDown.pixelY = pageY - offsetTop;

			// Mark the selector as dragagable
			if (viewers[selector].options.currentZoom !== viewers[selector].options.minZoom &&
				$(selector + ' .chameleon-top-section:hover').length === 0 &&
				$(selector + ' .chameleon-bottom-section:hover').length === 0 &&
				$(selector + ' .chameleon-left-section:hover').length === 0 &&
				$(selector + ' .chameleon-right-section:hover').length === 0){

				dragging = true;

			}
		};


		var cursorMove = function _cursorMove (pageX, pageY, offsetLeft, offsetTop){

			//console.log(pageX, pageY, offsetLeft, offsetTop);

			// Prevent dragging over viewer sections
			if (dragging){

				if (click){ click = false; }

				// Hide sections
				$(selector + ' .chameleon-top-section').hide();
				$(selector + ' .chameleon-bottom-section').hide();
				$(selector + ' .chameleon-left-section').hide();
				$(selector + ' .chameleon-right-section').hide();

				// Calculate the increments on each axis
				var dimX = (pageX - offsetLeft) - viewers[selector].options.cursorDown.pixelX,
					dimY = (pageY - offsetTop) - viewers[selector].options.cursorDown.pixelY;

				// Calculate the pixel where the image is beeing moved from
				viewers[selector].options.cursorDown.pixelX = pageX - offsetLeft;
				viewers[selector].options.cursorDown.pixelY = pageY - offsetTop;

				_moveBackgroundImage(selector, dimX, dimY);

			}
		};


		var cursorUp = function _cursorUp (){

			if (!click){

				// Remove the selector dragagable mark
				dragging = false;

				// Show sections
				$(selector + ' .chameleon-top-section').show();
				$(selector + ' .chameleon-bottom-section').show();
				$(selector + ' .chameleon-left-section').show();
				$(selector + ' .chameleon-right-section').show();

			}
		};
	}


	// Default options
	$.fn.chameleon.options = {
		currentImage: 0,         // Sets the current image
		currentZoom: 1,          // Initial and current zoom
		fullscreen: true,        // Enables or disables the fullscreen
		images: [],              // Images list
		imagesCounter: true,     // Shows or hides the images counter
		keyArrows: true,         // Allows to pass the images with the arrow keys
		maxZoom: 3,              // Maximum zoom
		minZoom: 1,              // Minimum zoom
		preview: '',             // DOM element where the images preview will be shown
		previewType: 'arrows',   // Images preview visualization: with arrows or with a slider
		subtitle: true,          // Shows or hides the subtitles
		title: '',               // Viewer title
		zoom: true,              // Enables or disables the zooming property
		zoomStep: 0.1            // Increase or decrease of zoom for each tic or step
	};


	// Default positions
	$.fn.chameleon.positions =
	{
		top:
		{
			left: ['title'],
			center: [],
			right: ['zoom', 'fullscreen']
		},
		bottom:
		{
			left: ['subtitle'],
			center: [],
			right: ['imagesNumber']
		},
		left:
		{
			top: [],
			center: ['prevArrow'],
			bottom: []
		},
		right:
		{
			top: [],
			center: ['nextArrow'],
			bottom: []
		}
	};


	// External allowed functions
	$.fn.chameleon.externalFunctions = {

		images: function (selector, images){

			if (images === undefined){ return viewers[selector].options.images; }
			else {
				viewers[selector].options.images = images;
				viewers[selector].options.currentImage = 0;
				_setImagesTotalNumber(selector, images.length);
				_setImageNumber(selector, 0);
				_showImage(selector);
			}

		},
		title: function (selector, title){

			if (title === undefined){ return viewers[selector].options.title; }
			else {
				viewers[selector].options.title = title;
				$(selector + ' .chameleon-title').text(title);
				if (!$(selector + ' .chameleon-title').is(':visible')){ $(selector + ' .chameleon-title').show(); }
			}

		}
	};

})(jQuery, document, window, screenfull);