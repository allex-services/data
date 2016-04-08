function createMaterializeQueryTask(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    SinkTask = execSuite.SinkTask,
    dataSuite = execlib.dataSuite,
    DataDecoder = dataSuite.DataDecoder,
    MemoryStorage = dataSuite.MemoryStorage;

  function MaterializeQueryTask(prophash){
    SinkTask.call(this,prophash);
    this.storage = null;
    this.decoder = null;
    this.sink = prophash.sink;
    this.filter = prophash.filter;
    this.singleshot = prophash.singleshot;
    this.continuous = prophash.continuous;
    this.data = prophash.data;
    this.onInitiated = prophash.onInitiated;
    this.onRecordCreation = prophash.onRecordCreation;
    this.onNewRecord = prophash.onNewRecord;
    this.onUpdate = prophash.onUpdate;
    this.onRecordUpdate = prophash.onRecordUpdate;
    this.onDelete = prophash.onDelete;
    this.onRecordDeletion = prophash.onRecordDeletion;
    this.initiatedListener = null;
    this.createdListener = null;
    this.newRecordListener = null;
    this.updatedListener = null;
    this.recordUpdatedListener = null;
    this.deletedListener = null;
    this.recordDeletedListener = null;
  }
  lib.inherit(MaterializeQueryTask,SinkTask);
  MaterializeQueryTask.prototype.__cleanUp = function(){
    if (this.sink && this.decoder && this.decoder.queryID) {
      this.sink.call('closeQuery', this.decoder.queryID);
    }
    if(this.recordDeletedListener){
      this.recordDeletedListener.destroy();
    }
    this.recordDeletedListener = null;
    if(this.deletedListener){
      this.deletedListener.destroy();
    }
    this.deletedListener = null;
    if(this.recordUpdatedListener){
      this.recordUpdatedListener.destroy();
    }
    this.recordUpdatedListener = null;
    if(this.updatedListener){
      this.updatedListener.destroy();
    }
    this.updatedListener = null;
    if(this.newRecordListener){
      this.newRecordListener.destroy();
    }
    this.newRecordListener = null;
    if(this.createdListener){
      this.createdListener.destroy();
    }
    this.createdListener = null;
    if(this.initiatedListener){
      this.initiatedListener.destroy();
    }
    this.initiatedListener = null;
    this.onRecordDeletion = null;
    this.onDelete = null;
    this.onRecordUpdate = null;
    this.onUpdate = null;
    this.onNewRecord = null;
    this.onRecordCreation = null;
    this.onInitiated = null;
    this.data = null;
    this.continuous = null;
    this.singleshot = null;
    this.filter = null;
    this.sink = null;
    if(this.storage){
      this.storage.destroy();
    }
    this.decoder = null;
    this.storage = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  MaterializeQueryTask.prototype.go = function(){
    this.storage = new MemoryStorage({
      events: this.onInitiated || this.onRecordCreation || this.onNewRecord || this.onUpdate || this.onRecordUpdate || this.onDelete || this.onRecordDeletion,
      record: this.sink.recordDescriptor
    },this.data);
    this.decoder = new DataDecoder(this.storage);
    if(this.onInitiated){
      this.initiatedListener = this.storage.events.initiated.attach(this.onInitiated);
    }
    if(this.onRecordCreation){
      this.createdListener = this.storage.events.created.attach(this.onRecordCreation);
    };
    if(this.onNewRecord){
      this.newRecordListener = this.storage.events.newRecord.attach(this.onNewRecord);
    }
    if(this.onUpdate){
      this.updatedListener = this.storage.events.updated.attach(this.onUpdate);
    }
    if(this.onRecordUpdate){
      this.recordUpdatedListener = this.storage.events.recordUpdated.attach(this.onRecordUpdate);
    }
    if(this.onDelete){
      this.deletedListener = this.storage.events.deleted.attach(this.onDelete);
    }
    if(this.onRecordDeletion){
      this.recordDeletedListener = this.storage.events.recordDeleted.attach(this.onRecordDeletion);
    }
    if (!this.continuous) {
      console.log('materializeQuery is not continuous!');
    }
    this.sink.call('query', {singleshot: this.singleshot, continuous: this.continuous, filter: this.filter||'*', visiblefields: this.visiblefields}).then(
      this.destroy.bind(this),
      this.destroy.bind(this),
      this.decoder.onStream.bind(this.decoder)
    );
  };
  MaterializeQueryTask.prototype.compulsoryConstructionProperties = ['data','sink'];
  return MaterializeQueryTask;
}

module.exports = createMaterializeQueryTask;
