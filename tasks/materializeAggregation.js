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
    if (!lib.isFunction (prophash.onRecord)) {
      throw new lib.Error('NOT_A_FUNCTION' ,'onRecord is not a function in MaterializeAggregationTask');
    }

    if (prophash.interval && (!lib.isNumber(prophash.interval) || prophash.interval < 0)) {
      throw new lib.Error ('INVALID_INTERVAL', 'Interval '+prophash.interval+' not allowed');
    }

    SinkTask.call(this, prophash);
    this.sink = prophash.sink;
    this._to = null;
    this.query = prophash.query;
    this.onRecord = prophash.onRecord;
    this.onDone = prophash.onDone;
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
    this.continuous = null;
    this.sink = null;
    this.query = null;
    this.onRecord = null;
    this.onError = null;
    this.onDone = null;
    this.interval = null;
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
    if (lib.isFunction (this.onDone)) {
      this.onDone(true);
    }

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
    this.onRecord(record);
  };

  MaterializeAggregationTask.prototype.compulsoryConstructionProperties = ['query', 'onRecord', 'onError' ,'sink'];
  return MaterializeAggregationTask;
}


module.exports = createMaterializeAggregationTask;
