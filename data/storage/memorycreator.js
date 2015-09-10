function createMemoryStorage(execlib, MemoryStorageBase){
  'use strict';
  var lib = execlib.lib;

  function MemoryStorage (storagedescriptor, data) {
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(MemoryStorage, MemoryStorageBase);
  MemoryStorage.prototype._createData = function () {
    return [];
  };
  MemoryStorage.prototype._destroyDataWithElements = function () {
    lib.arryDestroyAll(this.data);
  };
  MemoryStorage.prototype._traverseData = function (cb) {
    this.data.forEach(cb);
  };
  MemoryStorage.prototype._traverseDataRange = function (cb, start, endexclusive) {
    for(var i=start; i<end; i++){
      cb(query,defer,this.__record.filterHash(this.data[i]));
    }
  };
  MemoryStorage.prototype._removeDataAtIndex = function (data, index) {
    if (index === data.length-1) {
      data.pop();
    } else if (index === 0){
      data.shift();
    } else {
      data.splice(index, 1);
    }
  };
  MemoryStorage.prototype._traverseConditionally = function (cb) {
    return this.data.some(cb);
  };

  return MemoryStorage;
}

module.exports = createMemoryStorage;
