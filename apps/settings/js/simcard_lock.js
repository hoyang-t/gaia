/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var _ = navigator.mozL10n.get;

var SimPinLock = {
  simSecurityInfo: document.getElementById('simCardLock-desc'),
  simPinCheckBox:  document.querySelector('#simpin-enabled input'),
  changeSimPinItem: document.getElementById('simpin-change'),

  mobileConnection: null,

  updateSimCardStatus: function spl_updateSimStatus() {
    if (this.mobileConnection.cardState === 'absent') {
      this.simSecurityInfo.textContent = _('noSimCard');
      this.simPinCheckBox.disabled = true;
      this.changeSimPinItem.hidden = true;
      return;
    } 
    // with SIM card, query its status
    var self = this;
    var req = this.mobileConnection.getCardLock('pin');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      dump("==== sim pin is " + enabled);
      self.simSecurityInfo.textContent = (enabled)? _('enabled') : _('disabled');
      self.simPinCheckBox.disabled = false;
      self.simPinCheckBox.checked = enabled;
      self.changeSimPinItem.hidden = !enabled;
    };
  },

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;

    var self = this;
    this.simPinCheckBox.onchange = function spl_toggleSimPin() {
      SimPinDialog.show('enable', 
          function() { 
            self.updateSimCardStatus(); 
          },
          function() {
            this.checked = !this.checked;
            self.updateSimCardStatus(); 
          }
      );
    };

    this.updateSimCardStatus();
  }

};

window.addEventListener('localized', function spl_ready() {
  SimPinLock.init();
});
