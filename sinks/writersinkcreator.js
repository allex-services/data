function createWriterSink(execlib){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ServiceSink = execSuite.registry.get('.').SinkMap.get('user'),
      recordSuite = execlib.dataSuite.recordSuite;

  function WriterSink(prophash,client){
    ServiceSink.call(this,prophash,client);
  }
  ServiceSink.inherit(WriterSink,require('../methoddescriptors/writeruser'));
  WriterSink.inherit = recordSuite.sinkInheritProc;
  WriterSink.prototype.visibleFields = [];
  return WriterSink;
}

module.exports = createWriterSink;
