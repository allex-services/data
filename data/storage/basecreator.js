function createStorageBase(execlib){
  var lib = execlib.lib,
    q = lib.q,
    Record = execlib.dataSuite.recordSuite.Record;

  function StorageBaseEventing(){
    this.initTxnId = null;
    this.initiated = new lib.HookCollection();
    this.newRecord = new lib.HookCollection();
    this.updated = new lib.HookCollection();
    this.recordUpdated = new lib.HookCollection();
    this.deleted = new lib.HookCollection();
    this.recordDeleted = new lib.HookCollection();
  }
  StorageBaseEventing.prototype.destroy = function(){
    this.recordDeleted.destruct();
    this.recordDeleted = null;
    this.deleted.destruct();
    this.deleted = null;
    this.recordUpdated.destruct();
    this.recordUpdated = null;
    this.updated.destruct();
    this.updated = null;
    this.newRecord.destruct();
    this.newRecord = null;
    this.initiated.destruct();
    this.initiated = null;
    this.initTxnId = null;
  };
  StorageBaseEventing.prototype.beginInit = function(txnid){
    if(this.initTxnId){
      var e = new Error('E_DATASTORAGE_ALREADY_IN_INITIATION');
      e.txnInProgress = this.initTxnId;
      e.newTxn = txnid;
      throw e;
    }
    this.initTxnId = txnid;
  };
  StorageBaseEventing.prototype.endInit = function(txnid,storage){
    if(!this.initTxnId){
      var e = new Error('E_DATASTORAGE_NOT_IN_INITIATION');
      e.txnId = txnid;
      throw e;
    }
    if(this.initTxnId!==txnid){
      var e = new Error('E_DATASTORAGE_INITIATION_END_MISMATCH');
      e.txnInProgress = this.initTxnId;
      e.endTxnId = txnid;
      throw e;
    }
    this.initTxnId = null;
    this.initiated.fire(storage);
  };
  StorageBaseEventing.prototype.fireNewRecord = function(datahash){
    if(!this.initTxnId){
      this.newRecord.fire(datahash);
    }
  };
  StorageBaseEventing.prototype.fireUpdated = function(filter,datahash,updatecount){
    if(updatecount){
      this.updated.fire(filter,datahash,updatecount);
    }
  };
  StorageBaseEventing.prototype.fireDeleted = function(filter,deletecount){
    if(deletecount){
      this.deleted.fire(filter,deletecount);
    }
  };

  function StorageBase(storagedescriptor){
    if(!(storagedescriptor && storagedescriptor.record)){
      console.trace();
      console.log("No storagedescriptor.record!");
      process.exit(0);
    }
    this.__record = new Record(storagedescriptor.record);
    this.events = storagedescriptor.events ? new StorageBaseEventing : null;
  };
  StorageBase.prototype.destroy = function(){
    if(this.events){
      this.events.destroy();
    }
    this.events = null;
    this.__record.destroy();
    this.__record = null;
  };
  StorageBase.prototype.create = function(datahash){
    var d = q.defer();
    lib.runNext(this.doCreate.bind(this,this.__record.filterObject(datahash),d));
    if(this.events){
      d.promise.then(this.events.fireNewRecord.bind(this.events));
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
  StorageBase.prototype.update = function(filter,datahash){
    //console.log('StorageBase update',filter,datahash);
    var d = q.defer();
    lib.runNext(this.doUpdate.bind(this,filter,datahash,d));
    if(this.events){
      d.promise.then(this.events.fireUpdated.bind(this.events,filter,datahash));
    }
    return d.promise;
  };
  StorageBase.prototype.beginInit = function(txnid){
    if(this.events){
      this.events.beginInit(txnid);
    }
    this.delete(dataSuite.filterFactory.createFromDescriptor()); //delete all
  };
  StorageBase.prototype.endInit = function(txnid){
    if(this.events){
      this.events.endInit(txnid,this);
    }
  };
  StorageBase.prototype.delete = function(filter){
    //console.log('StorageBase delete',filter);
    var d = q.defer();
    //there should be no notifies on d, hence no lib.runNext
    this.doDelete(filter,d);
    if(this.events){
      d.promise.then(this.events.fireDeleted.bind(this.events,filter));
    }
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;
