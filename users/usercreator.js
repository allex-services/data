function createUser(execlib,ParentUser,userSessionFactory){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      recordSuite = dataSuite.recordSuite,
      execSuite = execlib.execSuite,
      StreamDistributor = execSuite.StreamDistributor,
      _User = execSuite.User;

  ParentUser = ParentUser||_User;
  function User(prophash){
    this.constructSelf(prophash);
  }
  require('./common/inherit')(execlib,User,ParentUser,require('../methoddescriptors/user'),userSessionFactory);

  return User;
}

module.exports = createUser;
