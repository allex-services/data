function createStorageBase(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    Record = dataSuite.recordSuite.Record;

  function StorageBaseEventing(){
    this.initTxnId = null;
    this.initiated = new lib.HookCollection();
    this.created = new lib.HookCollection();
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
    this.created.destruct();
    this.created = null;
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
    this.created.fire(datahash);
    if(!this.initTxnId){
      this.newRecord.fire(datahash);
    }
  };
  StorageBaseEventing.prototype.fireUpdated = function(filter,datahash,updateresult){
    if(updateresult.updated || updateresult.upserted){
      this.updated.fire(filter,datahash,updateresult);
    }
  };
  StorageBaseEventing.prototype.fireDeleted = function(filter,deletecount){
    if(deletecount){
      this.deleted.fire(filter,deletecount);
    }
  };

  var __id = 0;
  function StorageBase(storagedescriptor){
    //this.__id = process.pid+':'+(++__id);
    if(!(storagedescriptor && storagedescriptor.record)){
      console.trace();
      console.log("No storagedescriptor.record!");
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
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    if(this.events){
      d.promise.then(this.events.fireNewRecord.bind(this.events));
    }
    this.doCreate(this.__record.filterObject(datahash),d);
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
  StorageBase.prototype.update = function(filter,datahash,options){
    var d = q.defer();
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    lib.runNext(this.doUpdate.bind(this,filter,datahash,options,d));
    if(this.events){
      d.promise.then(this.events.fireUpdated.bind(this.events,filter,datahash));
    }
    return d.promise;
  };
  StorageBase.prototype.beginInit = function(txnid){
    //this.delete(dataSuite.filterFactory.createFromDescriptor()); //delete all
    if(this.events){
      this.events.beginInit(txnid);
    }
  };
  StorageBase.prototype.endInit = function(txnid){
    if(this.events){
      this.events.endInit(txnid,this);
    }
  };
  StorageBase.prototype.delete = function(filter){
    //console.log('StorageBase delete',filter);
    var d = q.defer();
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    lib.runNext(this.doDelete.bind(this,filter,d));
    if(this.events){
      d.promise.then(this.events.fireDeleted.bind(this.events,filter));
    }
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;
