function createUserSink(execlib, ParentServiceSink){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      recordSuite = execlib.dataSuite.recordSuite;

  function UserSink(prophash,client){
    ParentServiceSink.call(this,prophash,client);
  }
  ParentServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  UserSink.inherit = recordSuite.sinkInheritProc;
  UserSink.prototype.visibleFields = [];
  return UserSink;
}

module.exports = createUserSink;
