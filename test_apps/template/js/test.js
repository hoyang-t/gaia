'use strict';

var Test = {
  getSimCardState: function() {
    var cardState = window.navigator.mozMobileConnection.cardState;
    var stateElement = document.getElementById('simcard-state');
    stateElement.textContent = cardState;
  },
  getNetwork: function() {
  }
};


for (var property in Test) {
  if (!Test.hasOwnProperty(property)) continue;
  if (typeof Test[property] !== 'function') continue;

  var element = document.getElementById(property);
  if (!element) continue;
  element.addEventListener('click', Test[property].bind(this));
}
