function createDataDistributor(execlib){
  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    StreamDistributor = execSuite.StreamDistributor;

  var dsdid = 0;
  function DataStreamDistributor(){
    this.id = ++dsdid;
    StreamDistributor.call(this);
  }
  lib.inherit(DataStreamDistributor,StreamDistributor);
  DataStreamDistributor.prototype.attach = function(sink){
    console.log(this.id,'attaching');
    StreamDistributor.prototype.attach.call(this,sink);
  };
  DataStreamDistributor.prototype.onStream = function(item){
    console.log(this.id,'distributing',item,'to',this.sinks.length);
    StreamDistributor.prototype.onStream.call(this,item);
  };
  DataStreamDistributor.prototype.doTrigger = function(item,sink){
    if(!item){
      console.trace();
      process.exit(0);
    }
    if(sink.isOK(item)){
      StreamDistributor.prototype.doTrigger.call(this,item,sink);
    }
  };
  return DataStreamDistributor;
}

module.exports = createDataDistributor;
