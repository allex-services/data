function createServerSideSuite(execlib){
  'use strict';
  require('./record/serverside')(execlib);
}

module.exports = createServerSideSuite;
