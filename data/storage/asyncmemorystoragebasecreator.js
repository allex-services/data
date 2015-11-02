function createAsyncMemoryStorageBase (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    MemoryStorageBase = dataSuite.MemoryStorageBase;

  function AsyncMemoryStorageBase(storagedescriptor, data) {
    this.q = new lib.Fifo();
    this.readyDefer = q.defer();
    this.readyDefer.promise.then(this.setReady.bind(this));
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(AsyncMemoryStorageBase, MemoryStorageBase);
  AsyncMemoryStorageBase.prototype.destroy = function () {
    MemoryStorageBase.prototype.destroy.call(this);
    this.readyDefer = null;
    if (this.q) {
      this.q.destroy();
    }
    this.q = null;
  };
  AsyncMemoryStorageBase.prototype.setReady = function () {
    //console.log('setReady', this.q.length, 'jobs on q');
    var job;
    while (this.q) {
      job = this.q.pop();
      this[job[0]].apply(this, job[1]);
    }
  };
  AsyncMemoryStorageBase.prototype.doCreate = function (record, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doCreate', [record, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doCreate.call(this, record, defer);
  };
  AsyncMemoryStorageBase.prototype.doRead = function (query, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doRead', [query, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doRead.call(this, query, defer);
  };
  AsyncMemoryStorageBase.prototype.doUpdate = function (filter, datahash, options, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doUpdate', [filter, datahash, options, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doUpdate.call(this, filter, datahash, options, defer);
  };
  AsyncMemoryStorageBase.prototype.doDelete = function (filter, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doDelete', [filter, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doDelete.call(this, filter, defer);
  };

  return AsyncMemoryStorageBase;
}

module.exports = createAsyncMemoryStorageBase;
