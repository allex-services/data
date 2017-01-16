function createDataManager(execlib){
  'use strict';
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    DataSource = dataSuite.DataSource,
    filterFactory = dataSuite.filterFactory,
    qlib = lib.qlib;

  var __id = 0;
  function DataManager(storageinstance,filterdescriptor){
    this.id = process.pid + '_' + (++__id);
    DataSource.call(this);
    this.storage = storageinstance;
    this.filter = filterFactory.createFromDescriptor(filterdescriptor);
  }
  lib.inherit(DataManager,DataSource);
  DataManager.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    console.log('destroying storage');
    this.storage.destroy();
    this.storage = null;
  };
  DataManager.prototype.onStorageError = function(defer,reason){
    console.log('DataManager has no idea about what to do with',reason,'(onStorageError)');
    defer.reject(reason);
  };
  DataManager.prototype.doNativeCreate = function(defer,datahash){
    DataSource.prototype.create.call(this,datahash);
    defer.resolve(datahash);
  };
  DataManager.prototype.create = function(datahash, defer){
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    this.storage.create(datahash).done(
      this.doNativeCreate.bind(this,defer),
      this.onStorageError.bind(this,defer)
    );
    return defer.promise;
  };
  DataManager.prototype.onReadOne = function(defer,startreadrecord,datahash){
    var item = this.Coder.prototype.readOne.call(this,startreadrecord,datahash);
    if(defer){
      defer.notify(item);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.onReadDone = function(defer,startreadrecord){
    var item = this.Coder.prototype.endRead.call(this,startreadrecord);
    if(defer){
      defer.notify(item);
      defer.resolve(null);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.read = function(query,defer){
    if (!this.storage) {
      if (defer) {
        defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      }
      return;
    }
    var startreadrecord = this.Coder.prototype.startRead.call(this);
    if(defer){
      defer.notify(startreadrecord);
    }else{
      this.handleStreamItem(startreadrecord);
    }
    this.storage.read(query).done(
      this.onReadDone.bind(this,defer,startreadrecord),
      this.onStorageError.bind(this, defer),
      this.onReadOne.bind(this,defer,startreadrecord)
    );
  };
  DataManager.prototype.doNativeUpdateExact = function(defer,ueobj){
    var item = this.Coder.prototype.updateExact.call(this,ueobj);
    if(item){
      this.handleStreamItem(item);
      defer.notify(item);
    }
  };
  DataManager.prototype.doNativeUpdate = function(defer,filter,datahash,res){
    if(res){
      var item = this.Coder.prototype.update.call(this,filter,datahash);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.update = function(filterdescriptor,datahash,options, defer){
    var f;
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return defer.promise;
    }
    this.storage.update(f,datahash,options).done(
      this.doNativeUpdate.bind(this,defer,f,datahash),
      this.onStorageError.bind(this, defer),
      this.doNativeUpdateExact.bind(this,defer)
    );
    return defer.promise;
  };
  DataManager.prototype.doNativeDelete = function(defer,filter,res){
    if(res){
      var item = this.Coder.prototype.delete.call(this,filter);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.delete = function(filterdescriptor, defer){
    var f;
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return;
    }
    this.storage.delete(f).done(
      this.doNativeDelete.bind(this, defer,f),
      this.onStorageError.bind(this, defer)
    );
    return defer.promise;
  };
  DataManager.prototype.stateStreamFilterForRecord = function(record){
    return this.storage.__record.stateStreamFilterForRecord(this,record);
  };

  DataManager.prototype.aggregate = function (aggregation_descriptor, defer) {
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    qlib.promise2defer (this.storage.aggregate (aggregation_descriptor), defer);
    return defer.promise;
  };
  return DataManager;
}

module.exports = createDataManager;
