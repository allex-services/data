function createServiceUser(execlib,ParentServiceUser,userSessionFactory){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      Query = dataSuite.Query,
      recordSuite = dataSuite.recordSuite,
      execSuite = execlib.execSuite,
      _User = execSuite.User;

  ParentServiceUser = ParentServiceUser||_User;
  function ServiceUser(prophash){
    ParentServiceUser.call(this, prophash);
  }
  require('./common/inherit')(execlib,ServiceUser,ParentServiceUser,require('../methoddescriptors/serviceuser'),userSessionFactory);

  return ServiceUser;
}

module.exports = createServiceUser;
