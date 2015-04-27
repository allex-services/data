function createSuite(execlib){
  var utils = require('./utils')(execlib),
    Record = require('./creator')(execlib),
    Storage = require('./storagecreator')(execlib,Record);

  return {
    utils: utils,
    Record: Record,
    Storage: Storage
  }
};

module.exports = createSuite;
