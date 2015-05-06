function createServiceSink(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      _ServiceSink = execSuite.registry.get('.').SinkMap.get('service'),
      recordSuite = execlib.dataSuite.recordSuite;

  function ServiceSink(prophash,client){
    _ServiceSink.call(this,prophash,client);
    this.consumeChannel('d',this.onData.bind(this));
  }
  _ServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.inherit = recordSuite.utils.sinkInheritProc;
  ServiceSink.prototype.visibleFields = [];
  ServiceSink.prototype.createStateFilter = function(){
    //TODO: create your filter here
    return null;
  };
  ServiceSink.prototype.onData = function(){
    console.log('onData',arguments);
  };
  return ServiceSink;
}

module.exports = createServiceSink;
