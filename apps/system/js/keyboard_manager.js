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

const typeMapping = {
  // text
  'text': 'text',
  'textarea': 'text',
  'url': 'text',
  'email': 'text',
  'password': 'text',
  'search': 'text',
  // number
  'number': 'number',
  'tel': 'number',
  // options
  'time': 'option',
  'week': 'option',
  'month': 'option',
  'date': 'option',
  'datetime': 'option',
  'datetime-local': 'option',
  'color': 'option'
};

// How long to wait for more focuschange events before processing
const FOCUS_CHANGE_DELAY = 20;

var KeyboardManager = (function() {
  var keyboardFrameContainer = document.getElementById('keyboard-frame');

  // The set of installed keyboard apps grouped by type_group.
  // This is a map from type_group to an object arrays.
  // Each element in the object arrays represents a keyboard layout:
  // {
  //    name: the keyboard layout's name
  //    origin: the keyboard's origin
  //    path: the keyboard's launch path
  // } 
  var keyboardLayouts = {};

  // The set of running keyboards.
  // This is a map from keyboard origin to an object like this:
  var runningLayouts = {};
  var showedLayoutFrame = null;
  var showedType = 'text';
  var showedIndex = 0;

  var switchChangeTimeout = 0;

  init();

  function init() {
    keyboardFrameContainer.classList.add('hide');
    // get enabled keyboard from mozSettings, parse their manifest
    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var apps = event.target.result;
      apps.forEach(function eachApp(app) {
        //XXX should not hard code system app origin here
        if (app.origin === 'app://system.gaiamobile.org')
          return;
        if (!(app.manifest.permissions && 'keyboard' in app.manifest.permissions))
          return;
        if (!app.manifest.entry_points)
          return;

        var entryPoints = app.manifest.entry_points;
        for (var name in entryPoints) {
          var launchPath = entryPoints[name].launch_path;
          var supportTypes = entryPoints[name].type_group;
          for (var i = 0, len = supportTypes.length; i < len; ++i) {
            var type = supportTypes[i];
            if (!keyboardLayouts[type])
              keyboardLayouts[type] = [];

            keyboardLayouts[type].push({
              "name": name, 
              "origin": app.origin, 
              "manifest": app.manifest,
              "path": launchPath 
            });
          }
        }
      });

      // launch the first keyboard app(layout) of each type_groups
      var defaultLayout = keyboardLayouts[showedType][showedIndex];
      launchLayoutFrame(keyboardLayouts[showedType][showedIndex]);
    };
  }

  function launchLayoutFrame(layout) {
    dump("==== isRunningLayout? " + layout.origin + " " + layout.name);
    dump("====               => " + isRunningLayout(layout));
    if (isRunningLayout(layout))
      return runningLayouts[layout.origin][layout.name];
    var layoutFrame = null;
    dump("==== isRunningKeyboard? " + isRunningKeyboard(layout));
    if (isRunningKeyboard(layout)) {
      for(var name in runningLayouts[layout.origin]) {
        dump("==== (searching) name " + name + ": " + runningLayouts[layout.origin][name].dataset.framePath);
        var oldPath = runningLayouts[layout.origin][name].dataset.framePath;
        var newPath = layout.path;
        if (oldPath.substring(0, oldPath.indexOf('#')) ===
            newPath.substring(0, newPath.indexOf('#'))) {
          layoutFrame = runningLayouts[layout.origin][name];
          layoutFrame.src = layout.origin + newPath;
          dump("==== layoutFrame.src updated: " + layoutFrame.src);
          delete runningLayouts[layout.origin][name];
          break;
        }
      }
    }
    if (!layoutFrame)
      layoutFrame = loadKeyboardLayout(layout);
    layoutFrame.setVisible(false);
    layoutFrame.hidden = true;
    layoutFrame.dataset.frameName = layout.name;
    layoutFrame.dataset.frameOrigin = layout.origin;
    layoutFrame.dataset.framePath = layout.path;
    runningLayouts[layout.origin] = {};
    runningLayouts[layout.origin][layout.name] = layoutFrame;
    //XXX
    showAllLayouts();

    return layoutFrame;
  }

  function showAllLayouts() {
    var count = 1;
    for (var key in runningLayouts) {
      for (var name in runningLayouts[key]) {
        dump("==== layout #" + count + " " + key + "/" + name);
        count++;
      }
    }
  }

  function isRunningKeyboard(layout) {
    return runningLayouts.hasOwnProperty(layout.origin);
  }

  function isRunningLayout(layout) {
    if (!isRunningKeyboard(layout))
      return false;
    return runningLayouts[layout.origin].hasOwnProperty(layout.name);
  }

  function loadKeyboardLayout(layout) {
    // Generate a <iframe mozbrowser> containing the keyboard.
    var keyboardURL = layout.origin + layout.path;
    var manifestURL = layout.origin + '/manifest.webapp';
    var keyboard = document.createElement('iframe');
    keyboard.src = keyboardURL;
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);
    //keyboard.setAttribute('remote', 'true');
    keyboardFrameContainer.appendChild(keyboard);

    return keyboard;
  }

  function updateWhenHashChanged(evt) {
    dump("====  => evt.detail.url " + evt.detail.url);
    // everything is hack here! will be removed after having real platform API
    if (evt.detail.url.lastIndexOf('keyboard-test') < 0)
      return;
    evt.stopPropagation();

    if (!showedLayoutFrame)
      return;

    if (!evt.detail.url.contains(showedLayoutFrame.dataset.frameOrigin))
      return;

    var urlparser = document.createElement('a');
    urlparser.href = evt.detail.url;

    var keyword = urlparser.hash.split('=')[1];

    switch (keyword) {
      case 'switchlayout':
      case 'showlayoutlist':
        clearTimeout(switchChangeTimeout);
        switchChangeTimeout = setTimeout(function keyboardSwitchChange() {
          if (keyword === 'switchlayout') {
            var index = (showedIndex + 1) % keyboardLayouts[showedType].length; 
            hideKeyboard();
            showKeyboard(showedType, index);
          } else {
            var items = [];
            for (var i=0, len = keyboardLayouts[showedType].length; i<len; ++i) {
              var label = keyboardLayouts[showedType][i].manifest.name + " " +
                keyboardLayouts[showedType][i].name;
              items.push({
                label: label,
                value: i
              });
            }
            hideKeyboard();
            ListMenu.request(items, "keyboard layout selection", function(choice) {
                  dump("==== choice " + choice);
                  showKeyboard(showedType, choice);
                }, null);
          }
        }, FOCUS_CHANGE_DELAY);
        break;
      // if there is only one number, it should be update height
      default:
        var updateHeight = function updateHeight() {
          keyboardFrameContainer.removeEventListener('transitionend', updateHeight);
          if (keyboardFrameContainer.classList.contains('hide')) {
            // The keyboard has been closed already, let's not resize the
            // application and ends up with half apps.
            return;
          }

          var detail = {
            'detail': {
              'height': parseInt(keyword)
            }
          };

          dispatchEvent(new CustomEvent('keyboardchange', detail));
        };

        if (keyboardFrameContainer.classList.contains('hide')) {
          keyboardFrameContainer.classList.remove('hide');
          keyboardFrameContainer.addEventListener('transitionend', updateHeight);
        } else {
          updateHeight();
        }
        break;
    }
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
    focusChangeTimeout = setTimeout(function keyboardFocusChanged() {
      if (type === 'blur') {
        dump("==== get blur event");
        hideKeyboard();
      } else {
        dump("==== get focus event ");
        showFirstLayout(state);
      }
    }, FOCUS_CHANGE_DELAY);
  };

  function showFirstLayout(state) {
    if (!state.type || !(state.type in typeMapping))
      return;
    var group = typeMapping[state.type];
    showKeyboard(group, 0);
  }

  function showKeyboard(group, index) {
    //XXX hide current keyboard first because option menu won't set focus back to input field
    //this makesa keyboard showed, but input field is not focused.
    hideKeyboard();
    dump("==== show keyboard: type=" + group + " index=" + index);
    showedType = group;
    showedIndex = index;
    var layout = keyboardLayouts[showedType][showedIndex];
    showedLayoutFrame = launchLayoutFrame(layout);
    showedLayoutFrame.hidden = false;
    showedLayoutFrame.setVisible(true);
    showedLayoutFrame.addEventListener('mozbrowseropenwindow', updateWhenHashChanged);
    dump("==== showedLayoutFrame path " + showedLayoutFrame.dataset.framePath);

    keyboardFrameContainer.classList.remove('hide');
  }

  function hideKeyboard() {
    dump("==== hide keyboard ");
    dispatchEvent(new CustomEvent('keyboardhide'));
    keyboardFrameContainer.classList.add('hide');
    if (!showedLayoutFrame)
      return;
    dump("==== (hide) showedLayoutFrame path " + showedLayoutFrame.dataset.framePath);
    showedLayoutFrame.hidden = true;
    showedLayoutFrame.setVisible(false);
    showedLayoutFrame.removeEventListener('mozbrowseropenwindow', updateWhenHashChanged);
    showedLayoutFrame = null;
  }

})();
