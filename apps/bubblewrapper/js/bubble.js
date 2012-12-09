var BubbleWrapper = {
  ROW: 7,
  COL: 5,
  panel: document.getElementById('panel'),

  init: function() {
    for(var i=0; i<this.ROW; ++i) {
      this.makeOneRow();
    }
  },

  makeOneRow: function() {
    var aRow = document.createElement('div');
    for(var i=0; i<this.COL; ++i) {
      var aCol = document.createElement('span');
      aCol.className = 'bubble';
      aCol.onclick = this.brokenClick;

      aRow.appendChild(aCol);
    }

    this.panel.appendChild(aRow);

  },

  brokenClick: function(evt) {
    var aCol = evt.target;
    aCol.onclick = null;
    var brokenNumber = Math.round(Math.random() * 3 + 1);
    aCol.className = 'bubble-broken-' + brokenNumber;
  }

};

BubbleWrapper.init();
