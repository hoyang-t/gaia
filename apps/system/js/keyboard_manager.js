'use strict';

// If we get a focuschange event from mozKeyboard for an element with
// one of these types, we'll just ignore it.
// XXX we won't skip these types in the future when we move value selector
// to an app.
const IGNORED_INPUT_TYPES = {
  'select-one': true,
  'select-multiple': true,
  'date': true,
  'time': true,
  'datetime': true,
  'datetime-local': true
};

const TYPE_GROUP_MAPPING = {
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
  // option
  'select-one': 'option',
  'select-multiple': 'option',
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

var KeyboardManager = {
  keyboardFrameContainer: document.getElementById('keyboard-frame'),

  // The set of installed keyboard apps grouped by type_group.
  // This is a map from type_group to an object arrays.
  // Each element in the object arrays represents a keyboard layout:
  // {
  //    name: the keyboard layout's name
  //    appName: the keyboard app name
  //    origin: the keyboard's origin
  //    path: the keyboard's launch path
  // } 
  keyboardLayouts: {},

  // The set of running keyboards.
  // This is a map from keyboard origin to an object like this:
  // 'keyboard.gaiamobile.org' : {
  //   'English': aIframe
  // }
  runningLayouts: {},
  showingLayout: {
    frame: null,
    type: 'text',
    index: 0,
  },

  focusChangeTimeout: 0,
  switchChangeTimeout: 0,
  _debug: function km_debug(msg) {
    console.log("==== [KM] " + msg);
  },

  init: function km_init() {
    var self = this;
    this.keyboardFrameContainer.classList.add('hide');

    // get enabled keyboard from mozSettings, parse their manifest
    this.updateLayouts();

    //register settings change
    var settings = window.navigator.mozSettings;
    settings.addObserver(SETTINGS_KEY, this.updateLayouts.bind(this)); 

    // For Bug 812115: hide the keyboard when the app is closed here,
    // since it would take a longer round-trip to receive focuschange
    window.addEventListener('appwillclose', this); 

    window.navigator.mozKeyboard.onfocuschange = this.inputFocusChange.bind(this); 
  },

  updateLayouts: function km_updateLayouts(evt) {
    var self = this;
    function resetLayoutList(allLayouts) {
      self.keyboardLayouts = {};
      // filter out disabled layouts
      for (var type in allLayouts) {
        self.keyboardLayouts[type] = [];
        for(var i in allLayouts[type]) {
          if (allLayouts[type][i].enabled)
            self.keyboardLayouts[type].push(allLayouts[type][i]);
        }
      }
      var initType = self.showingLayout.type;
      var initIndex = self.showingLayout.index;
      self.launchLayoutFrame(self.keyboardLayouts[initType][initIndex]);
    }
    if (evt) {
      // update because of observing settings change
      this._debug("settings updated " + evt.settingValue);
      var allLayouts = JSON.parse(evt.settingValue);
      resetLayoutList(allLayouts);
    } else {
      // update because of initializing
      KeyboardHelper.getAllLayouts(resetLayoutList);
    }
  },

  inputFocusChange: function km_inputFocusChange(evt) {
    // let value selector notice the event
    dispatchEvent(new CustomEvent('inputfocuschange', evt));

    var state = evt.detail;
    var type = state.type;

    // Skip the <select> element and inputs with type of date/time,
    // handled in system app for now
    if (!type || type in IGNORED_INPUT_TYPES)
      return;

    var self = this;
    // We can get multiple focuschange events in rapid succession
    // so wait a bit before responding to see if we get another.
    clearTimeout(this.focusChangeTimeout);
    this.focusChangeTimeout = setTimeout(function keyboardFocusChanged() {
      if (type === 'blur') {
        self._debug("get blur event");
        self.hideKeyboard();
      } else {
        self._debug("get focus event");
        self.showFirstLayout(state);
      }
    }, FOCUS_CHANGE_DELAY);
  },

  launchLayoutFrame: function km_launchLayoutFrame(layout) {
    if (this.isRunningLayout(layout)) {
      this._debug("this layout is running");
      return this.runningLayouts[layout.origin][layout.name];
    }
    var layoutFrame = null;
    if (this.isRunningKeyboard(layout)) {
      var runningKeybaord = this.runningLayouts[layout.origin];
      for(var name in runningKeybaord) {
        var oldPath = runningKeybaord[name].dataset.framePath;
        var newPath = layout.path;
        if (oldPath.substring(0, oldPath.indexOf('#')) ===
            newPath.substring(0, newPath.indexOf('#'))) {
          layoutFrame = runningKeybaord[name];
          layoutFrame.src = layout.origin + newPath;
          this._debug(name + " is overwritten: " + layoutFrame.src);
          delete runningKeybaord[name];
          break;
        }
      }
    }
    if (!layoutFrame)
      layoutFrame = this.loadKeyboardLayout(layout);
    // TODO make sure setVisible function is ready
    layoutFrame.setVisible(false);
    layoutFrame.hidden = true;
    layoutFrame.dataset.frameName = layout.name;
    layoutFrame.dataset.frameOrigin = layout.origin;
    layoutFrame.dataset.framePath = layout.path;
    if (!(layout.origin in this.runningLayouts))
      this.runningLayouts[layout.origin] = {};

    this.runningLayouts[layout.origin][layout.name] = layoutFrame;
    //XXX
    this._showAllLayouts();

    return layoutFrame;
  },

  _showAllLayouts: function km_showAllLayouts() {
    var count = 1;
    for (var key in this.runningLayouts) {
      for (var name in this.runningLayouts[key]) {
        this._debug("layout #" + count + " " + key + "/" + name);
        count++;
      }
    }
  },

  isRunningKeyboard: function km_isRunningKeyboard(layout) {
    return this.runningLayouts.hasOwnProperty(layout.origin);
  },

  isRunningLayout: function km_isRunningLayout(layout) {
    if (!this.isRunningKeyboard(layout))
      return false;
    return this.runningLayouts[layout.origin].hasOwnProperty(layout.name);
  },

  loadKeyboardLayout: function km_loadKeyboardLayout(layout) {
    // Generate a <iframe mozbrowser> containing the keyboard.
    var keyboardURL = layout.origin + layout.path;
    var manifestURL = layout.origin + '/manifest.webapp';
    var keyboard = document.createElement('iframe');
    keyboard.src = keyboardURL;
    keyboard.setAttribute('mozbrowser', 'true');
    keyboard.setAttribute('mozpasspointerevents', 'true');
    keyboard.setAttribute('mozapp', manifestURL);
    //keyboard.setAttribute('remote', 'true');
    
    this.keyboardFrameContainer.appendChild(keyboard);
    return keyboard;
  },

  updateWhenHashChanged: function km_updateWhenHashChanged(evt) {
    var url = evt.detail.url;
    this._debug("updateWhenHashChanged: " + url);
    // everything is hack here! will be removed after having real platform API
    if (url.lastIndexOf('keyboard-test') < 0)
      return;
    evt.stopPropagation();

    var showed = this.showingLayout;
    if (!showed.frame || !url.contains(showed.frame.dataset.frameOrigin))
      return;

    var urlparser = document.createElement('a');
    urlparser.href = url;
    var keyword = urlparser.hash.split('=')[1];

    var self = this;
    switch (keyword) {
      case 'switchlayout':
      case 'showlayoutlist':
        clearTimeout(this.switchChangeTimeout);
        this.switchChangeTimeout = setTimeout(function keyboardSwitchChange() {
          if (keyword === 'switchlayout') {
            var index = (showed.index + 1) % self.keyboardLayouts[showed.type].length; 
            self.hideKeyboard();
            self.showKeyboard(showed.type, index);
          } else {
            var items = [];
            self.keyboardLayouts[showed.type].forEach(function(layout, index) {
              var label = layout.appName + " " + layout.name;
              items.push({
                label: label,
                value: index
              });
            });
            self.hideKeyboard();
            ListMenu.request(items, "keyboard layout selection", function(choice) {
                  self.showKeyboard(showed.type, choice);
                }, null);
          }
        }, FOCUS_CHANGE_DELAY);
        break;
      // if there is only one number, it should be update height
      default:
        var updateHeight = function updateHeight() {
          self.keyboardFrameContainer.removeEventListener('transitionend', updateHeight);
          if (self.keyboardFrameContainer.classList.contains('hide')) {
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

        if (this.keyboardFrameContainer.classList.contains('hide')) {
          this.keyboardFrameContainer.classList.remove('hide');
          this.keyboardFrameContainer.addEventListener('transitionend', updateHeight);
        } else {
          updateHeight();
        }
        break;
    }
  },

  showFirstLayout: function km_showFirstLayout(state) {
    if (!state.type || !(state.type in TYPE_GROUP_MAPPING))
      return;
    var group = TYPE_GROUP_MAPPING[state.type];
    this.showKeyboard(group, 0);
  },

  handleEvent: function km_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowseropenwindow':
        this.updateWhenHashChanged(evt);
        break;
      case 'appwillclose':
        dispatchEvent(new CustomEvent('keyboardhide'));
        this.keyboardFrameContainer.classList.add('hide');
        break;
      //XXX the following three cases haven't tested.
      case 'mozbrowsererror': // OOM
        var origing = evt.target.dataset.frameOrigin;
        this.removeKeyboard(origin);
        break;
      case 'applicationinstall': //app installed
        this.updateLayoutSettings();
        break;
      case 'applicationuninstall': //app uninstalled
        var origin = evt.detail.application.origin;
        this.removeKeyboard(origin);
        this.updateLayoutSettings();
        break;
    }
  },

  removeKeyboard: function km_removeKeyboard(origin) {
    for (var name in this.runningLayouts[origin]) {
      var frame = this.runningLayouts[origin][name];
      windows.removeChild(frame);
      delete this.runningLayouts[origin][name];
    }

    if (this.runningLayouts.hasOwnProperty(origin)) {
      delete this.runningLayouts[origin];
    }
  },

  updateLayoutSettings: function km_updateLayoutSettings() {
    KeyboardHelper.getInstalledLayouts(function(allLayouts) {
      var obj = {};
      obj[SETTINGS_KEY] = JSON.stringify(allLayouts);
      var settings = window.navigator.mozSettings;
      settings.createLock().set(obj);
    });
  },

  showKeyboard: function km_showKeyboard(group, index) {
    //XXX hide current keyboard first because option menu won't set focus back to input field
    //this makesa keyboard showed, but input field is not focused.
    this.hideKeyboard();
    this._debug("show keyboard: type=" + group + " index=" + index);
    this.showingLayout.type = group;
    this.showingLayout.index = index;
    var layout = this.keyboardLayouts[group][index];
    this.showingLayout.frame = this.launchLayoutFrame(layout);
    this.showingLayout.frame.hidden = false;
    this.showingLayout.frame.setVisible(true);
    this.showingLayout.frame.addEventListener('mozbrowseropenwindow', this, true);
    this._debug("showingLayout.frame path " + this.showingLayout.frame.dataset.framePath);

    this.keyboardFrameContainer.classList.remove('hide');
  },

  hideKeyboard: function km_hideKeyboard() {
    this._debug("hide keyboard!");
    dispatchEvent(new CustomEvent('keyboardhide'));
    this.keyboardFrameContainer.classList.add('hide');
    if (!this.showingLayout.frame)
      return;
    this._debug("(hide) showingLayout.frame path " + this.showingLayout.frame.dataset.framePath);
    this.showingLayout.frame.hidden = true;
    this.showingLayout.frame.setVisible(false);
    this.showingLayout.frame.removeEventListener('mozbrowseropenwindow', this, true);
    this.showingLayout.frame = null;
  }
};

KeyboardManager.init();
