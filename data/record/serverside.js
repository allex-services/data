function createServerSide(execlib){
  'use strict';

  require('./serversideutils')(execlib,execlib.dataSuite.recordSuite);
}

module.exports = createServerSide;
