function createDataManager(execlib,DataSource,filterFactory){
  var lib = execlib.lib;
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
  DataManager.prototype.onStorageError = function(reason){
    console.log('DataManager has no idea about what to do with',reason);
  };
  DataManager.prototype.doNativeCreate = function(datahash){
    console.log('doNativeCreate',datahash,'on',DataSource.prototype.create.toString());
    DataSource.prototype.create.call(this,datahash);
  };
  DataManager.prototype.create = function(datahash){
    this.storage.create(datahash).done(
      this.doNativeCreate.bind(this,datahash),
      this.onStorageError.bind(this)
    );
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
  DataManager.prototype.doNativeUpdate = function(filter,datahash){
    DataSource.prototype.update.call(this,filter,datahash);
  };
  DataManager.prototype.update = function(filter,datahash){
    this.storage.update(filter,datahash).done(
      this.doNativeUpdate.bind(this,filter,datahash),
      this.onStorageError.bind(this)
    );
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
  return DataManager;
}

module.exports = createDataManager;
