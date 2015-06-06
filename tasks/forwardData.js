function createFollowDataTask(execlib){
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
  ChildSinkStorage.prototype.create = function(item){
    return this.sink.call('create',item);
  };
  ChildSinkStorage.prototype.update = function(item){
    return this.sink.call('update',item);
  };
  ChildSinkStorage.prototype.delete = function(item){
    return this.sink.call('delete',item);
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
