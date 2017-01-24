function createMaterializeAggregationTask (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    SinkTask = execSuite.SinkTask,
    dataSuite = execlib.dataSuite,
    DataDecoder = dataSuite.DataDecoder,
    MemoryStorage = dataSuite.MemoryStorage;


  function MaterializeAggregationTask (prophash) {
    if (!lib.isFunction (prophash.onData)) {
      throw new lib.Error('NOT_A_FUNCTION' ,'onData is not a function in MaterializeAggregationTask');
    }

    if (prophash.interval && (!lib.isNumber(prophash.interval) || prophash.interval < 0)) {
      throw new lib.Error ('INVALID_INTERVAL', 'Interval '+prophash.interval+' not allowed');
    }

    SinkTask.call(this, prophash);
    this.sink = prophash.sink;
    this._buffer = null;
    this._to = null;
    this.query = prophash.query;
    this.onData = prophash.onData;
    this.onError = prophash.onError;
    this.interval = prophash.interval;
  }
  lib.inherit (MaterializeAggregationTask, SinkTask);
  MaterializeAggregationTask.prototype.__cleanUp = function () {
    if (this._to) {
      lib.clearTimeout (this._to);
    }

    this.cb = null;
    this.error_cb = null;
    this._to = null;
    this._buffer = null;
    this.continuous = null;
    this.sink = null;
    this.query = null;
    SinkTask.prototype.__cleanUp.call(this);
  };

  MaterializeAggregationTask.prototype.go = function () {
    this._fetch();
  };

  MaterializeAggregationTask.prototype._fetch = function () {
    this.sink.call('aggregate', this.query).done(this._onFetchDone.bind(this), this._onFetchError.bind(this), this._onRecord.bind(this));
  };

  MaterializeAggregationTask.prototype._onFetchDone = function () {
    this._to = null;
    this.onData (this._buffer);
    this._buffer = null;

    if (!this.interval) {
      lib.runNext (this.destroy.bind(this));
      return;
    }
    this._to = lib.runNext (this._fetch.bind(this), this.interval);
  };

  MaterializeAggregationTask.prototype._onFetchError = function (error) {
    if (lib.isFunction(this.onError)) {
      this.onError (error);
    }
    lib.runNext (this.destroy.bind(this));
  };

  MaterializeAggregationTask.prototype._onRecord = function (record) {
    switch (record.op) {
      case 'start' : {
        this._buffer = [];
        break;
      }
      case 'next': {
        this._buffer.push (record.data);
        break;
      }
    }
  };

  MaterializeAggregationTask.prototype.compulsoryConstructionProperties = ['query', 'onData', 'sink'];
  return MaterializeAggregationTask;
}


module.exports = createMaterializeAggregationTask;
