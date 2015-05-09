function createSuite(execlib){
  var suite = {},
    utils = require('./utils')(execlib,suite),
    Record = require('./creator')(execlib),
    Storage = require('./storagecreator')(execlib,Record);

  suite.Record = Record;
  suite.Storage = Storage;
  
  return suite;
};

module.exports = createSuite;
