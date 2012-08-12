/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle SIM PIN settings
window.addEventListener('localized', function simPinSettings(evt) {
  var _ = navigator.mozL10n.get;

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gMobileConnection = window.navigator.mozMobileConnection;

  var gSimSecurityInfo = document.querySelector('#simCardLock-desc');
  var gSimPinCheckBox =  document.querySelector('#simpin-enabled input');
  var gChangeSimPinItem = document.querySelector('#simpin-change');
  var gSimPinPad = document.querySelector("#simpin-pad");
  dump("===== simpin pad "+gSimPinPad);

  gSimPinCheckBox.onchange = function toggleSimPin() {
    var enabled = this.checked;
    updateSimStatus();
    showDialog("#simpin-confirm");
  }

  function updateSimStatus() {
    dump("===== card state: "+gMobileConnection.cardState);
    if (gMobileConnection.cardState === 'absent') {
      gSimSecurityInfo.textContent = _('noSIMCard'); 
    } else {
      var req = gMobileConnection.getCardLock('pin');
      req.onsuccess = function sp_checkSuccess() {
        dump("===== pin: "+req.result.enabled);
        var pinEnabled = req.result.enabled;
        if (pinEnabled) {
          gSimSecurityInfo.textContent = _('enabled');
        } else {
          gSimSecurityInfo.textContent = _('disabled');
        }
        gSimPinCheckBox.checked = pinEnabled;
        gChangeSimPinItem.hidden = !pinEnabled;
      }
    }
  }

  // generic SIM PIN property dialog
  // TODO: the 'OK' button should be disabled until the password string
  //       has a suitable length (e.g. 4..8)
  function showDialog(selector, callback, key) {
    var dialog = document.querySelector(selector);
    if (!dialog)
      return null;

    gSimPinPad.className = 'active';
    gSimPinPad.addEventListener('click', function(e){
        dump("==== pad click"+ e.target.dataset.key);
      });

    // hide dialog box
    function close() {
      // reset authentication fields
      if (key) {
        identity.value = '';
        password.value = '';
        showPassword.checked = false;
      }
      // 'close' (hide) the dialog
      dialog.removeAttribute('class');
      return false; // ignore <form> action
    }


    // OK|Cancel buttons
    dialog.onreset = close;
    dialog.onsubmit = function() {
      if (key) {
        setPassword(password.value, identity.value);
      }
      if (callback) {
        callback();
      }
      return close();
    };

    // show dialog box
    dialog.className = 'active';
    return dialog;
  }

  updateSimStatus();

});
