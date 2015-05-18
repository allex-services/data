function createMaterializeDataTask(execlib){
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      Task = execSuite.Task,
      dataSuite = execlib.dataSuite,
      DataDecoder = dataSuite.DataDecoder,
      MemoryStorage = dataSuite.MemoryStorage;

  function MaterializeDataTask(prophash){
    Task.call(this,prophash);
    this.storage = null;
    this.decoder = null;
    this.datasink = prophash.datasink;
    this.data = prophash.data;
    this.onInitiated = prophash.onInitiated;
    this.onNewRecord = prophash.onNewRecord;
    this.onUpdate = prophash.onUpdate;
    this.onRecordUpdate = prophash.onRecordUpdate;
    this.onDelete = prophash.onDelete;
    this.onRecordDeletion = prophash.onRecordDeletion;
    this.initiatedListener = null;
    this.newRecordListener = null;
    this.updatedListener = null;
    this.recordUpdatedListener = null;
    this.deletedListener = null;
    this.recordDeletedListener = null;
    this.datasink.extendTo(this);
  }
  MaterializeDataTask.prototype.destroy = function(){
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
    if(this.initiatedListener){
      this.initiatedListener.destroy();
    }
    this.initiatedListener = null;
    this.onDelete = null;
    this.onUpdate = null;
    this.onNewRecord = null;
    this.data = null;
    this.datasink = null;
    if(this.decoder){
      this.decoder.destroy();
    }
    this.decoder = null;
    if(this.storage){
      this.storage.destroy();
    }
    this.storage = null;
  };
  MaterializeDataTask.prototype.go = function(){
    this.storage = new MemoryStorage({
      events: this.onInitiated || this.onNewRecord || this.onUpdate || this.onRecordUpdate || this.onDelete || this.onRecordDeletion,
      record: this.datasink.recordDescriptor
    },this.data);
    if(this.onInitiated){
      this.initiatedListener = this.storage.events.initiated.attach(this.onInitiated);
    }
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
    this.decoder = new DataDecoder(this.storage);
    this.datasink.consumeChannel('s',lib.dummyFunc);
    this.datasink.consumeChannel('d',this.decoder);
  };
  MaterializeDataTask.prototype.compulsoryConstructionProperties = ['data','datasink'];
  return MaterializeDataTask;
}

module.exports = createMaterializeDataTask;
