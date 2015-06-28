function createSuite(execlib){
  'use strict';
  var suite = {},
    utils = require('./utils')(execlib,suite),
    Record = require('./creator')(execlib);

  suite.Record = Record;
  
  return suite;
};

module.exports = createSuite;
