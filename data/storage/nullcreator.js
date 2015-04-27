function createNullStorage(execlib,StorageBase){
  function NullStorage(options){
    StorageBase.call(this);
  }
  execlib.lib.inherit(NullStorage,StorageBase);
  NullStorage.prototype.doCreate = function(datahash,defer){
    defer.resolve(datahash);
  };
  NullStorage.prototype.doRead = function(query,defer){
    defer.resolve(null);
  };
  return NullStorage;
}

module.exports = createNullStorage;
