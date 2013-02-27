'use strict';

// If we get a focuschange event from mozKeyboard for an element with
// one of these types, we'll just ignore it.
const ignoredFormElementTypes = {
  'select-one': true,
  'select-multiple': true,
  'date': true,
  'time': true,
  'datetime': true,
  'datetime-local': true
};

// How long to wait for more focuschange events before processing
const FOCUS_CHANGE_DELAY = 20;

var KeyboardManager = (function() {
  var keyboardFrameContainer = document.getElementById('keyboard-frame');
  var keyboardFrames = [];
  var currentKeyboard = null;

  init();

  function init() {
    keyboardFrameContainer.classList.add('hide');
    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var apps = event.target.result;
      apps.forEach(function eachApp(app) {
        //XXX should not hard code system app origin here
        if (app.origin !== 'app://system.gaiamobile.org' &&
          app.manifest.permissions && 'keyboard' in app.manifest.permissions) {
          var keyboardAppIframe = preloadKeyboard(app.origin);
          keyboardAppIframe.setVisible(false);
          keyboardFrames.push(keyboardAppIframe);
        }
      });
      dump("==== number of keyboard apps: " + keyboardFrames.length);
    };
  }

  function preloadKeyboard(origin) {
    // Generate a <iframe mozbrowser> containing the keyboard.
    var keyboardURL = origin + '/index.html';
    var manifestURL = origin + '/manifest.webapp';
    var keyboard = document.createElement('iframe');
    keyboard.src = keyboardURL;
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);
    keyboard.setAttribute('remote', 'true');
    keyboard.addEventListener('mozbrowserlocationchange', updateWhenHashChanged);
    keyboardFrameContainer.appendChild(keyboard);

    return keyboard;
  }

  function updateWhenHashChanged(e) {
    var urlparser = document.createElement('a');
    urlparser.href = e.detail;

    var type = urlparser.hash.split('=');
    if (!currentKeyboard || type[0] !== '#show')
      return;

    dump("==== hash change " + type);
    var updateHeight = function updateHeight() {
      keyboardFrameContainer.removeEventListener('transitionend', updateHeight);
      dump("==== keyboardFrameContainer.classList " + JSON.stringify(keyboardFrameContainer.classList));
      if (keyboardFrameContainer.classList.contains('hide')) {
        // The keyboard has been closed already, let's not resize the
        // application and ends up with half apps.
        return;
      }

      var detail = {
        'detail': {
          'height': parseInt(type[1])
        }
      };

      dispatchEvent(new CustomEvent('keyboardchange', detail));
    };

    if (keyboardFrameContainer.classList.contains('hide')) {
      keyboardFrameContainer.classList.remove('hide');
      keyboardFrameContainer.addEventListener('transitionend', updateHeight);
      return;
    }
    updateHeight();
  }

  // For Bug 812115: hide the keyboard when the app is closed here,
  // since it would take a longer round-trip to receive focuschange
  window.addEventListener('appwillclose', function closeKeyboard() {
      dispatchEvent(new CustomEvent('keyboardhide'));
      keyboardFrameContainer.classList.add('hide');
  });

  var focusChangeTimeout = 0;
  navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
    // let value selector notice the event
    dispatchEvent(new CustomEvent('inputfocuschange', evt));

    var state = evt.detail;
    var type = state.type;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in ignoredFormElementTypes)
      return;

    // We can get multiple focuschange events in rapid succession
    // so wait a bit before responding to see if we get another.
    clearTimeout(focusChangeTimeout);
    focusChangeTimeout = setTimeout(function switchKeyboard() {
      if (type === 'blur') {
        hideKeyboard();
      } else {
        showKeyboard(state);
      }
    }, FOCUS_CHANGE_DELAY);
  };

  function showKeyboard(state) {
    dump("==== get focus event: " + keyboardFrames.length);
    if (keyboardFrames.length > 1) {
      currentKeyboard = keyboardFrames[0];
      currentKeyboard.setVisible(true);
      keyboardFrameContainer.classList.remove('hide');
    }
  }

  function hideKeyboard() {
    dump("==== get blur event");
    if (keyboardFrames.length > 1) {
      dispatchEvent(new CustomEvent('keyboardhide'));
      keyboardFrameContainer.classList.add('hide');
      currentKeyboard.setVisible(false);
      currentKeyboard = null;
    }
  }

})();
