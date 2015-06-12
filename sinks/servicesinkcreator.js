function createServiceSink(execlib){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      _ServiceSink = execSuite.registry.get('.').SinkMap.get('service'),
      recordSuite = execlib.dataSuite.recordSuite;

  function ServiceSink(prophash,client){
    _ServiceSink.call(this,prophash,client);
  }
  _ServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.inherit = recordSuite.sinkInheritProc;
  ServiceSink.prototype.visibleFields = [];
  return ServiceSink;
}

module.exports = createServiceSink;
