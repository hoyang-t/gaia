/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Helper object to find all installed keyboard apps and layouts.
 * (Need mozApps.mgmt permission)
 */

const TYPE_GROUP = {
  'text': true,
  'number': true,
  'option': true
};

var KeyboardHelper = {
  getAllKeyboards: function kh_getInstalledKeyboards(callback) {
    if (!navigator.mozApps || !navigator.mozApps.mgmt)
      return;

    navigator.mozApps.mgmt.getAll().onsuccess = function onsuccess(event) {
      var apps = event.target.result;
      var keyboardApps = [];
      apps.forEach(function eachApp(app) {
        // keyboard apps will request keyboard API permission
        if (!(app.manifest.permissions && 'keyboard' in app.manifest.permissions))
          return;
        //XXX remove this hard code check if one day system app no longer
        //    use mozKeyboard API
        if (app.origin === 'app://system.gaiamobile.org')
          return;
        // all keyboard apps should define its layout(s) in entry_points section
        if (!app.manifest.entry_points)
          return;
        keyboardApps.push(app);
      });

      if (keyboardApps.length > 0 && callback)
        callback(keyboardApps);
    };
  },

  getAllLayouts: function kh_getAllLayouts(callback) {
    this.getAllKeyboards(function parseLayouts(apps) {
      var keyboardLayouts = {};
      apps.forEach(function(app) {
        var entryPoints = app.manifest.entry_points;
        for (var name in entryPoints) {
          var launchPath = entryPoints[name].launch_path;
          var supportTypes = entryPoints[name].type_group;
          supportTypes.forEach(function(type) {
            if (!type || !(type in TYPE_GROUP))
              return;

            if (!keyboardLayouts[type])
              keyboardLayouts[type] = [];

            keyboardLayouts[type].push({
              "name": name, 
              "appName": app.manifest.name,
              "origin": app.origin, 
              "path": launchPath 
            });
          });
        }
      });
      if (callback)
        callback(keyboardLayouts);
    });
  }
};
