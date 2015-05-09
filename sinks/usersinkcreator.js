function createUserSink(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ServiceSink = execSuite.registry.get('.').SinkMap.get('user'),
      recordSuite = execlib.dataSuite.recordSuite;

  function UserSink(prophash,client){
    ServiceSink.call(this,prophash,client);
  }
  ServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  UserSink.inherit = recordSuite.sinkInheritProc;
  UserSink.prototype.visibleFields = [];
  return UserSink;
}

module.exports = createUserSink;
