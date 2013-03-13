/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var KeyboardLayout = {
  keyboardLayouts: {},
  textLayoutList: document.getElementById('textLayoutList'),
  numberLayoutList: document.getElementById('numberLayoutList'),

  init: function kl_init() {
    var self = this;
    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      self.parseKeyboardApp(event.target.result);
     
      // make lists
      var textLayouts = self.keyboardLayouts.text;
      for (var i=0, len = textLayouts.length; i < len; ++i) {
        var aItem = self.newLayoutItem(textLayouts[i]);
        textLayoutList.appendChild(aItem);
      }

    };
  },

  parseKeyboardApp: function kl_parseKeyboardApp(apps) {
    var self = this;
    apps.forEach(function eachApp(app) {
      //XXX should not hard code system app origin here
      if (app.origin === 'app://system.gaiamobile.org')
        return;
      if (!(app.manifest.permissions && 'keyboard' in app.manifest.permissions))
        return;
      if (!app.manifest.entry_points)
        return;

      dump("==== " + app.origin);
      var entryPoints = app.manifest.entry_points;
      for (var name in entryPoints) {
        var launchPath = entryPoints[name].launch_path;
        var supportTypes = entryPoints[name].type_group;
        for (var i = 0, len = supportTypes.length; i < len; ++i) {
          var type = supportTypes[i];
          if (!self.keyboardLayouts[type])
            self.keyboardLayouts[type] = [];

          self.keyboardLayouts[type].push({
            "appName": app.manifest.name,
            "name": name, 
          });
        }
      }
    });
  },

  newLayoutItem: function kl_appendLayout(layout) {
      var layoutName = document.createElement('a');
      layoutName.textContent = layout.appName + " " + layout.name;

      var label = document.createElement('label');
      //<input type="checkbox" name="keyboard.layouts.english" checked />
      var checkbox = document.createElement('input');
      checkbox.type = "checkbox";
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
