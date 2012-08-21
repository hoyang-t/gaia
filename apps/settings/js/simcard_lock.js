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
    var valueEntered = '';
    var inputField = document.querySelector('input[name="'+name+'"]');
    var inputVisField = document.querySelector('input[name="'+name+'Vis"]');
    inputField.addEventListener("keypress", simPinInputFilter);

    function simPinInputFilter(ekey) {
      ekey.preventDefault();

      var key = String.fromCharCode(ekey.charCode);
      if (key === '.') { // invalid
        return;
      }

      if (ekey.charCode === 0) { // backspace
        valueEntered = valueEntered.substr(0, valueEntered.length - 1);
      } else {
        if (valueEntered.length >= 8)
          return;
        valueEntered += key;
      }
      updateUI();
    }

    function updateUI() {
      var len = valueEntered.length;
      dump("===== valueEntered: " + valueEntered + " len "+ len);
      inputVisField.value = (new Array(len+1)).join('*');
    }

    function clear() {
      valueEntered = '';
      inputField.value = '';
      inputVisField.value = '';
    }

    function setFocus() {
      inputField.focus();
    }

    return { 
      get valueEntered() { return valueEntered; },
      focus: setFocus,
      clear: clear
    };
  }

  // TODO: the 'OK' button should be disabled until the password string
  //       has a suitable length (e.g. 4..8)
  var gSimPinConfirmDialog = (function() {
    var dialog = document.querySelector('#simpin-confirm');
    var simPinInput = inputFieldWrapper('simpin');
    var callback = null;
    if (!dialog)
      return null;

    // OK|Cancel buttons
    dialog.onreset = close;
    dialog.onsubmit = function() {
      var inputPin = simPinInput.valueEntered;
      dump("===== input pin : "+inputPin);
      clear();
      if (callback)
        callback(inputPin);
      return false; // ignore <form> action
    };

    function clear() {
      simPinInput.clear();
    }

    // show dialog box
    function show(cb) {
      if (cb && typeof cb === 'function')
        callback = cb;
      dialog.className = 'active';
      simPinInput.focus();
    }

    function close() {
      clear();
      dialog.removeAttribute('class');
      return false; // ignore <form> action
    }

    return {
      show: show,
      close: close
    };
  })();

  gSimPinCheckBox.onchange = function toggleSimPin() {
    var enabled = this.checked;
    gSimPinConfirmDialog.show(function(inputPin) {
      dump("===== [callback] input pin : "+inputPin);
      dump("===== cardState "+ gMobileConnection.cardState);
      // verify SIM PIN
      var req = gMobileConnection.setCardLock({
        lockType: 'pin',
        pin: inputPin,
        enabled: enabled
      });
      dump("===== req "+req);
      req.onsuccess = function sp_unlockSuccess() {
        var res = req.result;
        dump("===== unlock result: " + res.success);
        if (res.success) {
          dump("===== unlock type: " + res.lockType);
          gSimPinConfirmDialog.close();
          updateSimStatus();
        }
      };
      req.onerror = function sp_unlockError() {
        var res = req.result;
        dump("===== unlock retry: "+ res); 
        updateSimStatus();
      };
    });
  };

  function updateSimStatus() {
    if (!gMobileConnection || gMobileConnection.cardState === 'absent') {
      gSimSecurityInfo.textContent = _('noSIMCard');
      gSimPinCheckBox.checked = false;
      gChangeSimPinItem.hidden = true;
      return;
    } 
    // with SIM card, query its status
    var req = gMobileConnection.getCardLock('pin');
    req.onsuccess = function sp_checkSuccess() {
      var enabled = req.result.enabled;
      dump("===== sim pin is "+enabled);
      gSimSecurityInfo.textContent = (enabled)? _('enabled') : _('disabled');
      gSimPinCheckBox.checked = enabled;
      gChangeSimPinItem.hidden = !enabled;
    }
  }

  updateSimStatus();

});
