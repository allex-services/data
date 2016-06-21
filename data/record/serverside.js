function createServerSide(execlib, ParentService){
  'use strict';

  require('./serversideutils')(execlib,execlib.dataSuite.recordSuite,ParentService);
}

module.exports = createServerSide;
