/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle Wi-Fi settings
window.addEventListener('localized', function wifiSettings(evt) {
  var settings = window.navigator.mozSettings;
  var _ = navigator.mozL10n.get;
  var conn = window.navigator.mozMobileConnection;

  if (!settings)
    return;

  var simSecurityInfo = document.querySelector('#simCardLock-desc');
  var simPinCheckBox =
    document.querySelector('#simpin-enabled input[type=checkbox]');
  var changeSimPinBt = document.querySelector('button[name="changeSimPin"]');

  simPinCheckBox.onchange = function toggleSimPin() {
    var enabled = this.checked;
    updateSimStatus();
  }

  function updateSimStatus() {
    if (conn.cardState === 'absent') {
      simSecurityInfo.textContent = _('noSIMCard'); 
    } else {
      var req = conn.getCardLock('pin');
      req.onsuccess = function onPinCheckSuccess() {
        var pinEnabled = req.result;
        if (pinEnabled) {
          simSecurityInfo.textContent = _('enabled');
        } else {
          simSecurityInfo.textContent = _('disabled');
        }
        simPinCheckBox.checked = pinEnabled;
        changeSimPinBt.hidden = !pinEnabled;
      }
    }
  }

  updateSimStatus();

});
