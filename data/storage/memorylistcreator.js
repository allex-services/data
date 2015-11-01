function createMemoryStorage(execlib, MemoryStorageBase){
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function MemoryListStorage (storagedescriptor, data) {
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(MemoryListStorage, MemoryStorageBase);
  MemoryListStorage.prototype._createData = function () {
    return new lib.SortedList();
  };
  MemoryListStorage.prototype._destroyDataWithElements = function () {
    lib.containerDestroyAll(this.data);
    this.data.destroy();
  };
  MemoryListStorage.prototype._traverseData = function (cb) {
    this.data.traverse(cb);
  };
  function rangeTraverser (start, endexclusive, cb, cntobj, item) {
    if (cntobj.cnt >= start && cntobj.cnt < endexclusive) {
      cb(item);
    }
    cntobj.cnt++;
    return q(true);
  };
  MemoryListStorage.prototype._traverseDataRange = function (cb, start, endexclusive) {
    var cntobj = {cnt:0};
    this.data.traverse(rangeTraverser.bind(null, start, endexclusive, cb, cntobj));
    return q(true);
  };
  MemoryListStorage.prototype._removeDataAtIndex = function (data, index) {
    data.removeOne(index);
  };
  MemoryListStorage.prototype._traverseConditionally = function (cb) {
    return this.data.traverseConditionally(cb);
  };

  return MemoryListStorage;
}

module.exports = createMemoryStorage;

