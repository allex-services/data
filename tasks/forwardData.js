function createFollowDataTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      MultiDestroyableTask = execSuite.MultiDestroyableTask,
      dataSuite = execlib.dataSuite,
      DataDecoder = dataSuite.DataDecoder;

  function ChildSinkStorage(sink){
    this.sink = sink;
  }
  ChildSinkStorage.prototype.beginInit = lib.dummyFunc;
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
    this.storage = new ChildSinkStorage(prophash.childsink);
    this.sink = prophash.sink;
  }
  lib.inherit(FollowDataTask,MultiDestroyableTask);
  FollowDataTask.prototype.__cleanUp = function(){
    this.storage.destroy();
    this.storage = null;
    if(this.sink.destroyed){ //it's still alive
      this.sink.consumeChannel('d',lib.dummyFunc);
    }
    this.sink = null;
    MultiDestroyableTask.prototype.__cleanUp.call(this);
  };
  FollowDataTask.prototype.go = function(){
    this.sink.consumeChannel('d',new DataDecoder(this.storage));
  };
  FollowDataTask.prototype.compulsoryConstructionProperties = ['sink','childsink'];

  return FollowDataTask;
}

module.exports = createFollowDataTask;
