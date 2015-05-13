function createStorageBase(execlib){
  var lib = execlib.lib,
    q = lib.q,
    Record = execlib.dataSuite.recordSuite.Record;

  function StorageBase(storagedescriptor){
    if(!(storagedescriptor && storagedescriptor.record)){
      console.trace();
      console.log("No storagedescriptor.record!");
      process.exit(0);
    }
    this.__record = new Record(storagedescriptor.record);
    console.log('StorageBase record descriptor',storagedescriptor.record);
    if(storagedescriptor.events){
      console.log('creating events');
      this.newRecord = new lib.HookCollection();
      this.updated = new lib.HookCollection();
      this.deleted = new lib.HookCollection();
    }
  };
  StorageBase.prototype.destroy = function(){
    if(this.deleted){
      this.deleted.destroy();
      this.deleted = null;
    }
    if(this.updated){
      this.updated.destroy();
      this.updated = null;
    }
    if(this.newRecord){
      this.newRecord.destroy();
      this.newRecord = null;
    }
    this.__record.destroy();
    this.__record = null;
  };
  StorageBase.prototype.fireNewRecord = function(record){
    this.newRecord.fire(record);
  };
  StorageBase.prototype.create = function(datahash){
    var d = q.defer();
    var record = this.__record.filterObject(datahash);
    lib.runNext(this.doCreate.bind(this,record,d));
    if(this.newRecord){
      d.promise.then(this.fireNewRecord.bind(this));
    }
    return d.promise;
  };
  StorageBase.prototype.read = function(query){
    var d = q.defer();
    if(query.isEmpty()){
      d.resolve(null);
    }else{
      lib.runNext(this.doRead.bind(this,query,d));
    }
    return d.promise;
  };
  StorageBase.prototype.fireUpdated = function(filter,datahash,updatecount){
    if(updatecount){
      this.updated.fire(filter,datahash,updatecount);
    }
  };
  StorageBase.prototype.update = function(filter,datahash){
    //console.log('StorageBase update',filter,datahash);
    var d = q.defer();
    //there should be no notifies on d, hence no lib.runNext
    this.doUpdate(filter,datahash,d);
    if(this.updated){
      d.promise.then(this.fireUpdated.bind(this,filter,datahash));
    }
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;
