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
      this.simPinCheckBox.checked = false;
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
      self.simPinCheckBox.checked = enabled;
      self.changeSimPinItem.hidden = !enabled;
    };
  }

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;
    this.mobileConnection.addEventListener('cardstatechange', this);
    this.dialog.onreset = this.close.bind(this);
    this.dialog.onsubmit = this.verify.bind(this);
    this.simPinCheckBox.onchange = function spl_toggleSimPin() {
      var enabled = this.checked;
      this.show();
    };

    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput = this.getNumberPasswordInputField('confirmNewSimpin');

    this.handleCardState();
  }

};

window.addEventListener('localized', function showPanel() {
  SimPinLock.init();
});
