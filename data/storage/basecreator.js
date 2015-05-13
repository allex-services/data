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
  };
  StorageBase.prototype.destroy = function(){
    this.__record.destroy();
    this.__record = null;
  };
  StorageBase.prototype.create = function(datahash){
    var d = q.defer();
    var record = this.__record.filterObject(datahash);
    lib.runNext(this.doCreate.bind(this,record,d));
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
    console.log('StorageBase update',filter,datahash);
    var d = q.defer();
    //there should be no notifies on d, hence no lib.runNext
    this.doUpdate(filter,datahash,d);
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;
