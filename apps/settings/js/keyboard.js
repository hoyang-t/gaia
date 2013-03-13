/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* We will get this const definition from shared/js/keyboard_helper.js
const TYPE_GROUP = {
  'text': true,
  'number': true,
  'option': true
}

const SETTINGS_KEY = 'keyboard.enabled-layouts';
*/

var KeyboardLayout = {
  keyboardLayouts: {},

  init: function kl_init() {
    this.getAllElements();
    KeyboardHelper.getAllLayouts(this.makeLayoutList.bind(this));
    //Settings.mozSettings.addObserver('keyboard.enabled-layouts', this.updateList.bind(this));
  },

  getAllElements: function kl_getAllElements() {
    for (var type in TYPE_GROUP) {
      var key = type + 'LayoutList';
      this[key] = document.getElementById(key);
    }
  },

  makeLayoutList: function kl_makeLayoutList(allLayouts) {
    this.keyboardLayouts = allLayouts;
    // make lists
    for (var type in TYPE_GROUP) {
      var listElement = this[type + 'LayoutList'];
      if (!listElement)
        continue;
      var layouts = this.keyboardLayouts[type];
      for(var i in layouts) {
        var aItem = this.newLayoutItem(layouts[i]);
        listElement.appendChild(aItem);
      }
    }
  },

  newLayoutItem: function kl_appendLayout(layout) {
    var layoutName = document.createElement('a');
    layoutName.textContent = layout.appName + " " + layout.name;

    var label = document.createElement('label');
    //<input type="checkbox" name="keyboard.layouts.english" checked />
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.checked = layout.enabled;
    var span = document.createElement('span');

    label.appendChild(checkbox);
    label.appendChild(span);

    var li = document.createElement('li');
    li.appendChild(label);
    li.appendChild(layoutName);

    return li;
  }
};

// startup
navigator.mozL10n.ready(KeyboardLayout.init.bind(KeyboardLayout));
