const CLICK_SOUND = 'data:audio/x-wav;base64,' +
  'UklGRiADAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YfwCAAAW/Fzsqe9O' +
  'AONWB0Pt3Mf1hsS38mJcc0mq9mzpwsIwsChOBxay/ikHV6Tr8ioJNQa0ErvFzbXrw97j' +
  '5C2LQII7aBg77Tr+I+wH0QWp/7xowHegIf0yD1UkhzRRIbUGoeOgJptCHVB+WZg5ehgs' +
  'EcofKwKaAb7+cuzd9doICAx0FZEm+gEq+z//D/yJDtEJx/O73MHkifPK/BoLXwwuBt3p' +
  '5eBq2h3YT/OR+MH/5xDGB7sHowyp9rrrL++06mnt/PpcALcI7RDSCz4GwwWaAXYNVhLw' +
  'D20VYQsvCWUPxApJCVUH3P0jA54EIP0RBUYHVgtlD68KtQWI/9MB4f8Q/Fr4UvLz7nPq' +
  'yOzV9AvzKfEB7azl/+ee6jbrSOw16mjpPepD7d3yT/hL/RIDBAXQAHcDIAZ1BVsPIhAZ' +
  'CT4Ntwc2CJsQnhV+GlYcJR67GF0WaRK5CewGSQdSBboCfgWGBaQACP0e+8f3O/Y4+Yn1' +
  '4e8l9Mf3lvns/eT75fbx9t359/lw+6L+XP+5AdsFSgZECK8LvQlVCWYJ1wetBD8AGALl' +
  'AJUAVAbPBEkDpALfADn/Cv4c/+7+OP/jAAb/7vie+Xr7GvYa9g30rPBc9OL1wveo+3D+' +
  '8/xG+Zn5tPsi/vX/xv4I/Oj5DPaL8mbxmfMM+80AXQbiCisNvhC8Dt4LGwwyDJkNlAxR' +
  'CWYGswcHCn0KyA5cDsQKYgrZB+cFlATlAh4A3P5kAOsAOwLbA+ED8gLAAM/+h/vq+Lb5' +
  'qPgY+GH5i/nE+SX6V/s9+gv69vl89nv33fhc+Zb6nvse/lEA4wMjBrQEugPc/4/8pvux' +
  '+//9Kf9tAGcBXAFxAtgCuwMeBFQE6AQdA4gCGAJiADsAuwC7/53+a/4J/tv88fte+R74' +
  'dPhd+HD5LPmf+If5VPsp/noASALRAbsB+wJ+Ak0CuQPiBAsFpwYTB5wFtgZ/DE4P8AuH' +
  'B4kD3QKPBcAHhgaHBDAEngO6BBcFbwJ2/qD7rPtG/voBwQGU/pn9Lv3T/g==';

var BubbleWrapper = {
  /* Constant */
  ROW: 7,      // default rows
  COL: 5,      // default columns
  SIZE: 50,    // bubble size, 50x50 px
  SEAM: 5,     // 5px seam between bubbles
  N_STYLE: 4,  // number of broken bubble style

  info: document.getElementById('info'),
  panel: document.getElementById('panel'),
  timerInfo: document.getElementById('timer'),
  counterInfo: document.getElementById('counter'),
  sound: null,
  timer: 0,
  counter: 0,

  init: function() {
    this.ROW = Math.floor(window.innerHeight / (this.SIZE + this.SEAM));
    this.COL = Math.floor(window.innerWidth / (this.SIZE + this.SEAM));
    for(var i=0; i<this.ROW; ++i) {
      this.makeOneRow(i);
    }
    this.sound = new Audio(CLICK_SOUND);
    setInterval(this.showTimer.bind(this), 1000);

    var self = this;
    document.onscroll = function() {
      if(!document.body.scrollBottom) {
        self.makeOneRow(self.ROW);
        self.ROW++;
        console.log(self.ROW);
      }
    }
    var flag = true;
    this.info.onclick = function() {
      if (flag)
        this.classList.add('rotate');
      else
        this.classList.remove('rotate');
      flag = !flag;
    }
  },

  makeOneRow: function(rId) {
    var aRow = document.createElement('div');
    aRow.classList.add('row');
    if (rId%2)
      aRow.classList.add('shift');
    for(var i = 0; i < this.COL; ++i) {
      var aCol = document.createElement('span');
      aCol.classList.add('col');
      aCol.classList.add('bubble');
      aCol.onclick = this.brokenClick.bind(this);
      aRow.appendChild(aCol);
    }

    this.panel.appendChild(aRow);

  },

  brokenClick: function(evt) {
    var aCol = evt.target;
    aCol.onclick = null;
    this.counter++;
    this.counterInfo.textContent = this.counter;
    var brokenNumber = Math.round(Math.random() * (this.N_STYLE - 1) + 1);
    aCol.classList.add('bubble-broken-' + brokenNumber);
    aCol.classList.remove('bubble');
    this.sound.cloneNode(false).play();
    if ('vibrate' in navigator)
      navigator.vibrate([50]);
  },

  showTimer: function() {
    this.timer++;
    var time = [];
    time[0] = this.leadingZero(Math.floor(this.timer/3600));
    time[1] = this.leadingZero(Math.floor(this.timer/60));
    time[2] = this.leadingZero(this.timer%60);
    this.timerInfo.textContent = time.join(':');
  },

  leadingZero: function(num) {
    return (num < 10)? '0' + num : num.toString();
  }

};

BubbleWrapper.init();
