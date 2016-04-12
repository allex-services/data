function createFollowDataTask(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry,
    MultiDestroyableTask = execSuite.MultiDestroyableTask,
    dataSuite = execlib.dataSuite,
    DataDecoder = dataSuite.DataDecoder;

  function ChildSinkStorage(sink){
    this.sink = sink;
  }
  ChildSinkStorage.prototype.beginInit = function () {
    return this.sink.call('delete', null);
  };
  ChildSinkStorage.prototype.endInit = lib.dummyFunc;
  ChildSinkStorage.prototype.create = function(datahash){
    return this.sink.call('create',datahash);
  };
  ChildSinkStorage.prototype.update = function(filter,datahash,options){
    return this.sink.call('update',filter.__descriptor,datahash,options);
  };
  ChildSinkStorage.prototype.delete = function(filter){
    return this.sink.call('delete',filter.__descriptor);
  };

  function FollowDataTask(prophash){
    MultiDestroyableTask.call(this,prophash,['sink','childsink']);
    this.sink = prophash.sink;
    this.storage = new ChildSinkStorage(prophash.childsink);
    this.decoder = null;
  }
  lib.inherit(FollowDataTask,MultiDestroyableTask);
  FollowDataTask.prototype.__cleanUp = function(){
    /*
    if(this.sink.destroyed){ //it's still alive
      this.sink.consumeChannel('d',lib.dummyFunc);
    }
    */
    if (this.sink && this.decoder && this.decoder.queryID) {
      this.sink.sessionCall('closeQuery', this.decoder.queryID);
    }
    if (this.decoder) {
      this.decoder.destroy();
    }
    this.decoder = null;
    if (this.storage) {
      this.storage.destroy();
    }
    this.storage = null;
    this.sink = null;
    MultiDestroyableTask.prototype.__cleanUp.call(this);
  };
  FollowDataTask.prototype.go = function(){
    if (this.decoder) {
      return;
    }
    this.decoder = new DataDecoder(this.storage); 
    this.sink.sessionCall('query', {continuous:true}).then(
      this.destroy.bind(this),
      this.destroy.bind(this),
      this.decoder.onStream.bind(this.decoder)
    );
    //this.sink.consumeChannel('d',new DataDecoder(this.storage));
  };
  FollowDataTask.prototype.compulsoryConstructionProperties = ['sink','childsink'];

  return FollowDataTask;
}

module.exports = createFollowDataTask;
