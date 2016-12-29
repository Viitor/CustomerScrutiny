'use strict';

/**
 * Some bare-bones Javascript
 *
 * Main goals here are to:
 * - Add top-level classes to each message to indicate open/closed and
 *   animations states.
 * - Add fixed/absolute position when scrolling an open message
 *
 * I like to use functional techniques where I can so you'll see some of that
 * below.
 */
(function () {

    // Throttle from lodash will limit our scroll handler calls, which is
    // generally good practice.
    //
    // I like to call lodash's `flowRight` `compose` locally because it's more
    // familiar to me.
    var _ref = _;
    var throttle = _ref.throttle;
    var compose = _ref.flowRight;

    var messages = Array.from(document.querySelectorAll('.message'));

    // We'll only have one scroll listener at a time so we store it globally
    var listener = null;

    /**
     * Side effecty stuff
     */

    function cleanMessage(message) {
        message.classList.remove('message--fixed');
        message.classList.remove('message--absolute');

        return message;
    }

    function bindScrollEvent(message) {
        listener = handleScroll.bind(null, message);

        document.addEventListener('scroll', listener);

        return message;
    }

    function unBindScrollEvent(message) {
        if (listener) {
            document.removeEventListener('scroll', listener);
        }

        return message;
    }

    // Small helper for listening for an animation/transition end event.
    function listenForEndEvent(el, endEventType, cb) {

        var onEnd = function onEnd() {
            cb();
            el.removeEventListener(endEventType, onEnd);
        };

        el.addEventListener(endEventType, onEnd);
    }

    /**
     * Transition a message from closed to open.  There can only be one open
     * message at a time.  So we first close any existing open messages and once
     * those are closed, we proceed with opening the clicked message.
     */
    function transitionToOpen(message) {
        var details = message.querySelector('.message__details');
        var grower = message.querySelector('.grower');
        var startingRectTop = message.getBoundingClientRect().top;

        // Is there a message already open?
        var existingOpenMessage = document.querySelector('.message--open');

        // Internal function for actually opening the message
        function open() {

            // We now try to save the scroll position.
            // We've saved the top position of the message we're trying to open
            // before closing or opening any other message.  After closing a
            // different message, this message may now be above the viewport, so
            // we move the scroll position back by that amount.  We also move
            // back by the amount of the starting top position.
            var newRectTop = message.getBoundingClientRect().top;

            if (newRectTop < 0) {
                var newScroll = document.body.scrollTop - Math.abs(newRectTop) - startingRectTop;

                document.body.scrollTop = newScroll;
            }

            // Start the opening transition by adding this class here
            message.classList.add('message--opening');

            // The grower should be the same height as the incoming details,
            // which are now displayed, but offscreen so we can still get the
            // height
            grower.style.height = details.offsetHeight + 'px';

            // When the grower has stopped height-transitioning, we remove the
            // animation class and add the open class
            listenForEndEvent(grower, 'transitionend', function () {
                message.classList.remove('message--opening');
                message.classList.add('message--open');
            });
        }

        // If there's an open message, first close it then proceed with opening
        // this message.  Closing first seems to help with more accurate scroll
        // positions
        if (existingOpenMessage) {
            transitionToClosed(existingOpenMessage, open);
        } else {
            open();
        }
    }

    /**
     * Transition a message from open to closed
     */
    function transitionToClosed(message, cb) {
        var grower = message.querySelector('.grower');

        // Remove any open class and add the closing animation class
        message.classList.remove('message--open');
        message.classList.add('message--closing');

        // We're animating the grower out now, so we listen to the `animationend`
        // event.  After that, remove any style artifacts from other animations
        listenForEndEvent(grower, 'animationend', function () {
            message.classList.remove('message--closing');

            grower.removeAttribute('style');

            if (typeof cb === 'function') {
                cb();
            }
        });
    }

    /**
     * Throttled scroll handler
     *
     * When the handler is called with the message on a scroll event, we grab
     * the coordinates of the message via `getBoundingClientRect`.  The absolute
     * class should be applied when the header has reached the point where its
     * bottom position lines up with the bottom of the message container.  The
     * fixed class should be applied when the header has been scrolled past the
     * viewport but not yet reached the absolute trigger point.
     */
    var handleScroll = throttle(function (message) {
        var header = message.querySelector('.message__details__header');
        var pusher = message.querySelector('.pusher');

        var _message$getBoundingC = message.getBoundingClientRect();

        var top = _message$getBoundingC.top;
        var bottom = _message$getBoundingC.bottom;
        var width = _message$getBoundingC.width;

        var height = header.offsetHeight;

        var shouldBeSticky = top < 0 && bottom - height > 0;
        var shouldBeAbsolute = bottom - height <= 0;

        pusher.style.height = height + 'px';

        if (shouldBeSticky) {
            message.classList.remove('message--absolute');
            message.classList.add('message--fixed');
            header.style.width = width + 'px';
        } else if (shouldBeAbsolute) {
            message.classList.remove('message--fixed');
            message.classList.add('message--absolute');
        } else {
            message.classList.remove('message--fixed');
            message.classList.remove('message-absolute');
        }
    }, 50);

    function handleMessage(message) {
        var summary = message.querySelector('.message__summary');
        var header = message.querySelector('.message__details__header');

        var openHandler = compose(transitionToOpen, bindScrollEvent, cleanMessage);

        var closeHandler = compose(transitionToClosed, unBindScrollEvent, cleanMessage);

        summary.addEventListener('click', openHandler.bind(null, message));
        header.addEventListener('click', closeHandler.bind(null, message));
    }

    messages.forEach(handleMessage);
})();