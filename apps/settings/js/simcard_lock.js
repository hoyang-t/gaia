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


  function inputFieldWrapper(name) {
    var simPinEntered = '';
    var inputField = document.querySelector('input[name="'+name+'"]');
    inputField.addEventListener("keypress", simPinInputFilter);

    function simPinInputFilter(ekey) {
      ekey.preventDefault();

      var key = String.fromCharCode(ekey.charCode);
      dump("===== charCode: " + ekey.charCode + " - " + key);
      if (key === '.') { // invalid
        return;
      }

      if (ekey.charCode === 0) { // backspace
        simPinEntered = simPinEntered.substr(0, simPinEntered.length - 1);
      } else {
        if (simPinEntered.length >= 8)
          return;
        simPinEntered += key;
      }
      updateSimPinUI();
    }

    function updateSimPinUI() {
      var len = simPinEntered.length;
      dump("===== simPinEntered: " + simPinEntered);
      inputField.value = (new Array(len+1)).join("*");
    }

    function clear() {
      simPinEntered = '';
      inputField.value = '';
    }

    return { 
      get getSimPinEntered() { return simPinEntered; },
      clear: clear
    };
  };

  // TODO: the 'OK' button should be disabled until the password string
  //       has a suitable length (e.g. 4..8)
  var gSimPinConfirmDialog = (function() {
    var dialog = document.querySelector('#simpin-confirm');
    var simPinInput = inputFieldWrapper('simpin');

    function clear() {
      simPinInput.clear();
    }
    // hide dialog box
    function close() {
      clear();
      dialog.removeAttribute('class');
      return false; // ignore <form> action
    }
    // show dialog box
    function show() {
      dialog.className = 'active';
    }

    // OK|Cancel buttons
    dialog.onreset = close;
    dialog.onsubmit = function() {
      clear();
    };

    return {
      show: show
    };
  })();

  gSimPinCheckBox.onchange = function toggleSimPin() {
    var enabled = this.checked;
    updateSimStatus();
    gSimPinConfirmDialog.show();
  };

  function updateSimStatus() {
    var simEnabled = false;
    if (!gMobileConnection) {
      gSimPinCheckBox.checked = simEnabled;
      gChangeSimPinItem.hidden = !simEnabled;
      return;
    }
    if (gMobileConnection.cardState === 'absent') {
      gSimSecurityInfo.textContent = _('noSIMCard'); 
    } else {
      var req = gMobileConnection.getCardLock('pin');
      req.onsuccess = function sp_checkSuccess() {
        var pinEnabled = req.result.enabled;
        if (pinEnabled) {
          gSimSecurityInfo.textContent = _('enabled');
          simEnabled = true;
        } else {
          gSimSecurityInfo.textContent = _('disabled');
        }
      }
    }
    gSimPinCheckBox.checked = simEnabled;
    gChangeSimPinItem.hidden = !simEnabled;
  }

  updateSimStatus();

});
