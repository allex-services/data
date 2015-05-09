function createDataManager(execlib){
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    DataSource = dataSuite.DataSource,
    filterFactory = dataSuite.filterFactory;
  function DataManager(storageinstance,filterdescriptor){
    DataSource.call(this);
    this.storage = storageinstance;
    this.filter = filterFactory.createFromDescriptor(filterdescriptor);
  }
  lib.inherit(DataManager,DataSource);
  DataManager.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    this.source.destroy();
    this.source = null;
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
  DataManager.prototype.create = function(datahash){
    var d = lib.q.defer();
    this.storage.create(datahash).done(
      this.doNativeCreate.bind(this,d),
      this.onStorageError.bind(this,d)
    );
    return d.promise;
  };
  DataManager.prototype.onReadOne = function(defer,startreadrecord,datahash){
    var item = this.Coder.prototype.readOne(startreadrecord,datahash);
    if(defer){
      defer.notify(item);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.onReadDone = function(defer,startreadrecord){
    var item = this.Coder.prototype.endRead(startreadrecord);
    if(defer){
      defer.notify(item);
      defer.resolve(null);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.read = function(query,defer){
    var startreadrecord = this.Coder.prototype.startRead();
    if(defer){
      defer.notify(startreadrecord);
    }else{
      this.handleStreamItem(startreadrecord);
    }
    this.storage.read(query).done(
      this.onReadDone.bind(this,defer,startreadrecord),
      this.onStorageError.bind(this),
      this.onReadOne.bind(this,defer,startreadrecord)
    );
  };
  DataManager.prototype.doNativeUpdate = function(defer,filter,datahash,res){
    if(res){
      DataSource.prototype.update.call(this,filter,datahash);
      defer.resolve(res);
    }
  };
  DataManager.prototype.update = function(filter,datahash){
    var d = lib.q.defer();
    this.storage.update(filter,datahash).done(
      this.doNativeUpdate.bind(this,d,filter,datahash),
      this.onStorageError.bind(this)
    );
    return d.promise;
  };
  DataManager.prototype.doNativeDelete = function(filter){
    DataSource.prototype.delete.call(this,filter);
  };
  DataManager.prototype.delete = function(filter){
    this.storage.delete(filter).done(
      this.doNativeDelete.bind(this,filter),
      this.onStorageError.bind(this)
    );
  };
  DataManager.prototype.updateByDescriptor = function(filterdescriptor,datahash){
    var f = filterFactory.createFromDescriptor(filterdescriptor);
        d = lib.q.defer();
    this.update(f,datahash).done(function(res){
      d.resolve(res);
      f.destroy();
    },d.reject.bind(d));
    return d.promise;
  };
  DataManager.prototype.stateStreamFilterForRecord = function(datahash){
    return this.storage.__record.stateStreamFilterForRecord(this,datahash);
  };
  return DataManager;
}

module.exports = createDataManager;
