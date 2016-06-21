function createServerSideSuite(execlib, ParentService){
  'use strict';
  require('./record/serverside')(execlib, ParentService);
}

module.exports = createServerSideSuite;
