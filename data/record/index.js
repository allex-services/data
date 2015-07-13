function createSuite(execlib){
  'use strict';

  var suite = {};
  require('./utils')(execlib,suite);

  suite.Record = require('./creator')(execlib);
  
  return suite;
};

module.exports = createSuite;
