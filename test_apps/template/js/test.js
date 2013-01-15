/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var test = {
  init: function() {
    var type = 'sdcard';
    var deviceStorage = navigator.getDeviceStorage(type);
    if (!deviceStorage) {
      dump("==== Cannot get DeviceStorage for: " + type);
      return;
    }
    var filename = 'evelyn-test-' + Math.random().toString() + '.txt';
    var pathname = 'downloads/' + filename;
    dump("==== pathname " + pathname);
    var blob = new Blob(['hello world', '\n'], {type: 'text/plain'});
    var request = deviceStorage.addNamed(blob, pathname);
    request.onsuccess = function(e) {
      var readRequest = deviceStorage.get(pathname);
      readRequest.onsuccess = function() {
        var file = readRequest.result;
        dump("==== file: " + file);
        var url = URL.createObjectURL(file);
        dump("==== file url " + url);
        var reader = new FileReader();
        reader.onload = function(e) { 
          var contents = e.target.result;
          dump("==== file content " + contents);
        };
        reader.readAsText(file);
      };
      readRequest.onerror = function() {
        dump("==== read fail: " + request.error.name);
      };
    };
    request.onerror = function() {
      dump("==== write fail " + request.error.name);
    };
  },
  testFileList: function() {
    var type = 'pictures';
    var deviceStorage = navigator.getDeviceStorage(type);
    if (!deviceStorage) {
      dump("==== Cannot get DeviceStorage for: " + type);
      return;
    }
    //var request = deviceStorage.stat();
    var request = deviceStorage.enumerate();
    request.onsuccess = function(e) {
      //var totalSize = e.target.result.totalBytes;
      //var freeBytes = e.target.result.freeBytes;
      //dump("==== totalSize " + totalSize + " " + freeBytes);
      var file = request.result;
      dump("==== file name " + file.name);
      dump("==== file size " + file.size);
      dump("==== file type " + file.type);
      dump("==== file last Modified Date " + file.lastModifiedDate);
      request.continue();
    };
    request.onerror = function() {
      dump("==== request.error.name " + request.error.name);
    };
  },

  testContact: function() {
    var myContact = {
      name: 'Evelyn Hung',
      givenName: 'Evelyn',
      familyName: 'Hung',
      tel: [{value: '0912345678'}]
    };
    var contact = new mozContact();
    contact.init(myContact);
    var request = navigator.mozContacts.save(contact);
    request.onerror = function onerror() {
      dump('Error saving contact' + request.error.name);
    };

    var options = { 
      filterBy: ['tel', 'givenName', 'familyName'],
      filterOp: 'contains',
      filterValue: 'Evelyn'
    };
    var req = navigator.mozContacts.find(options);
    req.onsuccess = function findSuccess() {
      var contact = req.result[0];
      for (var key in contact) {
        dump("==== " + key + " " + contact[key]);
      }
      
      var newContact  = {
        id: contact.id 
      };
      var requestUpdate = navigator.mozContacts.remove(newContact);
      requestUpdate.onerror = function onerror() {
        dump('Error update contact' + requestUpdate.error.name);
      };
    };

  }
};
test.init();

