function createServiceUser(execlib,ParentServiceUser,userSessionFactory){
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      Query = dataSuite.Query,
      recordSuite = dataSuite.recordSuite,
      execSuite = execlib.execSuite,
      _User = execSuite.User;

  ParentServiceUser = ParentServiceUser||_User;
  function ServiceUser(prophash){
    this.constructSelf(prophash);
  }
  require('./common/inherit')(execlib,ServiceUser,ParentServiceUser,require('../methoddescriptors/serviceuser'),userSessionFactory);

  return ServiceUser;
}

module.exports = createServiceUser;
