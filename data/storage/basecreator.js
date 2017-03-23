function createStorageBase(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    Record = dataSuite.recordSuite.Record,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;

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
    if (!this.created) {
      return;
    }
    this.created.fire(datahash);
    if(!this.initTxnId){
      this.newRecord.fire(datahash);
    }
  };
  StorageBaseEventing.prototype.fireUpdated = function(filter,datahash,updateresult){
    if(this.updated && (updateresult.updated || updateresult.upserted)){
      this.updated.fire(filter,datahash,updateresult);
    }
  };
  StorageBaseEventing.prototype.fireDeleted = function(filter,deletecount){
    if(this.deleted && deletecount){
      this.deleted.fire(filter,deletecount);
    }
  };


  //JOBS
  function StorageJob (storage, defer) {
    JobBase.call(this, defer);
    this.storage = storage;
  }
  lib.inherit(StorageJob, JobBase);
  StorageJob.prototype.destroy = function () {
    this.storage = null;
    JobBase.prototype.destroy.call(this);
  };

  function InitBeginner (storage, txnid, defer) {
    StorageJob.call(this, storage, defer);
    this.txnid = txnid;
  }
  lib.inherit(InitBeginner, StorageJob);
  InitBeginner.prototype.destroy = function () {
    this.txnid = null;
    StorageJob.prototype.destroy.call(this);
  };
  InitBeginner.prototype.go = function () {
    var txnid;
    if (!this.storage) {
      this.resolve(null);
      return;
    }
    if (!this.storage.__record) {
      this.resolve(null);
      return;
    }
    txnid = this.txnid;
    if (!txnid) {
      this.resolve(null);
      return;
    }
    this.txnid = null;
    this.storage.deleteOnChannel(dataSuite.filterFactory.createFromDescriptor(null), 'ib').then(
      this.storage.onAllDeletedForBegin.bind(this.storage, txnid, this),
      this.reject.bind(this)
    );
  };

  function InitEnder (storage, txnid, defer) {
    StorageJob.call(this, storage, defer);
    this.txnid = txnid;
  }
  lib.inherit(InitEnder, StorageJob);
  InitEnder.prototype.destroy = function () {
    this.txnid = null;
    StorageJob.prototype.destroy.call(this);
  };
  InitEnder.prototype.go = function () {
    var txnid;
    if (!this.storage) {
      this.resolve(null);
      return;
    }
    if (!this.storage.__record) {
      this.resolve(null);
      return;
    }
    txnid = this.txnid;
    if (!txnid) {
      this.resolve(null);
      return;
    }
    this.txnid = null;
    if(this.storage.events){
      this.storage.events.endInit(txnid,this.storage);
    }
    this.resolve(true);
  };

  function Creator (storage, defer) {
    StorageJob.call(this, storage, defer);
    this.chunks = [];
    this.hashes = [];
  }
  lib.inherit(Creator, StorageJob);
  Creator.prototype.destroy = function () {
    this.datahash = null;
    StorageJob.prototype.destroy.call(this);
  };
  Creator.prototype.go = function () {
    this.subgo();
  };
  Creator.prototype.subgo = function () {
    var chunk;
    if (this.chunks && this.chunks.length) {
      chunk = this.chunks.shift();
    } else {
      chunk = this.hashes;
      this.hashes = [];
    }
    if (chunk && chunk.length) {
      return q.all(chunk.map(this.createOne.bind(this))).then(this.subgo.bind(this));
    }
    this.resolve(true);
  };
  Creator.prototype.createOne = function (dndatahash) {
    var d, datahash, ret;
    d = dndatahash[0];
    datahash = dndatahash[1];
    if (!this.storage) {
      this.resolve(null);
      return;
    }
    if (!this.storage.__record) {
      this.resolve(null);
      return;
    }
    if (!datahash) {
      this.resolve(null);
      return;
    }
    ret = d.promise;
    if(this.storage.events){
      d.promise.then(this.storage.events.fireNewRecord.bind(this.storage.events));
    }
    this.storage.doCreate(this.storage.__record.filterObject(datahash),d);
    return ret;
  };
  Creator.prototype.add = function (datahash) {
    var d = q.defer(), ret = d.promise;
    this.hashes.push([d, datahash]);
    if (this.hashes.length>999) {
      this.chunks.push(this.hashes);
      this.hashes = [];
    }
    return ret;
  };

  function Updater (storage, filter, datahash, options, defer) {
    StorageJob.call(this, storage, defer);
    this.filter = filter;
    this.datahash = datahash;
    this.options = options;
  }
  lib.inherit(Updater, StorageJob);
  Updater.prototype.destroy = function () {
    this.options = null;
    this.datahash = null;
    this.filter = null;
    StorageJob.prototype.destroy.call(this);
  };
  Updater.prototype.go = function () {
    var filter, datahash, options;
    if (!this.storage) {
      this.resolve(null);
      return;
    }
    if (!this.storage.__record) {
      this.resolve(null);
      return;
    }
    filter = this.filter;
    datahash = this.datahash;
    options = this.options;
    if (!(filter || datahash || options)) {
      this.resolve(null);
      return;
    }
    this.filter = null;
    this.datahash = null;
    this.options = null;
    if(this.storage.events){
      this.defer.promise.then(this.storage.events.fireUpdated.bind(this.storage.events,filter,datahash));
    }
    this.storage.doUpdate(filter,datahash,options,this);
  };

  function Deleter (storage, filter, defer) {
    StorageJob.call(this, storage, defer);
    this.filter = filter;
  }
  lib.inherit(Deleter, StorageJob);
  Deleter.prototype.destroy = function () {
    this.filter = null;
    StorageJob.prototype.destroy.call(this);
  };
  Deleter.prototype.go = function () {
    if (!this.storage) {
      this.resolve(null);
      return;
    }
    if (!this.storage.__record) {
      this.resolve(null);
      return;
    }
    if(this.storage.events){
      this.defer.promise.then(this.storage.events.fireDeleted.bind(this.storage.events,this.filter));
    }
    this.storage.doDelete(this.filter, this);
  };


  var __id = 0;
  function StorageBase(storagedescriptor, visiblefields){
    //this.__id = process.pid+':'+(++__id);
    if(!(storagedescriptor && storagedescriptor.record)){
      console.trace();
      console.log("No storagedescriptor.record!");
    }
    this.__record = new Record(storagedescriptor.record, visiblefields);
    this.jobs = new qlib.JobCollection();
    this.events = storagedescriptor.events ? new StorageBaseEventing : null;
  };
  StorageBase.prototype.destroy = function(){
    if(this.events){
      this.events.destroy();
    }
    this.events = null;
    if(this.jobs) {
      this.jobs.destroy();
    }
    this.jobs = null;
    this.__record.destroy();
    this.__record = null;
  };
  StorageBase.prototype.create = function(datahash){
    var lastpendingjob, job, ret;
    if (!this.jobs) {
      return q(null);
    }
    lastpendingjob = this.jobs.lastPendingJobFor('op');
    if (lastpendingjob && lastpendingjob instanceof Creator) {
      return lastpendingjob.add(datahash);
    }
    job = new Creator(this);
    ret = job.add(datahash);
    this.jobs.run('op', job);
    return ret;
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
    if (!this.jobs) {
      return q(null);
    }
    return this.jobs.run('op', new Updater(this, filter, datahash, options));
  };
  StorageBase.prototype.beginInit = function(txnid){
    if (!this.jobs) {
      return q(null);
    }
    return this.jobs.run('op', new InitBeginner(this, txnid));
  };
  StorageBase.prototype.onAllDeletedForBegin = function (txnid, defer) {
    if (this.data) {
      if (this.data.length) {
        throw new lib.Error('DATA_NOT_EMPTY');
      }
    }
    if(this.events){
      this.events.beginInit(txnid);
    }
    defer.resolve(true);
  };
  StorageBase.prototype.endInit = function(txnid){
    if (!this.jobs) {
      return q(null);
    }
    return this.jobs.run('op', new InitEnder(this, txnid));
  };
  StorageBase.prototype.delete = function(filter){
    return this.deleteOnChannel(filter, 'op');
  };
  StorageBase.prototype.deleteOnChannel = function (filter, channelname){
    if (!this.jobs) {
      return q(null);
    }
    return this.jobs.run(channelname, new Deleter(this, filter));
  };

  StorageBase.prototype.aggregate = function (aggregation_descriptor) {
    var d = q.defer();
    //console.log('stigao sam do aggregate-a na storage-u ... aj sad uradi nesto sa tim ...', aggregation_descriptor);
    qlib.promise2defer (this.doAggregate(aggregation_descriptor), d);
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;
