function createServiceSink(execlib, ParentServiceSink){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      recordSuite = execlib.dataSuite.recordSuite;

  function ServiceSink(prophash,client){
    ParentServiceSink.call(this,prophash,client);
  }
  ParentServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.inherit = recordSuite.sinkInheritProc;
  ServiceSink.prototype.visibleFields = [];
  return ServiceSink;
}

module.exports = createServiceSink;
