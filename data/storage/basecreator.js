function createStorageBase(execlib){
  var lib = execlib.lib,
    q = lib.q;
  function StorageBase(){
  };
  StorageBase.prototype.destroy = execlib.lib.dummyFunc;
  StorageBase.prototype.create = function(datahash){
    var d = q.defer();
    lib.runNext(this.doCreate.bind(this,datahash,d));
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
  return StorageBase;
}

module.exports = createStorageBase;
