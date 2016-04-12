function createStreamFromDataSink(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    SinkTask = execSuite.SinkTask,
    dataSuite = execlib.dataSuite,
    DataDecoder = dataSuite.DataDecoder;

  function StreamFromDataSink(prophash) {
    console.error('StreamFromDataSink is obsolete!');
    console.error("Use datasink.call('query', {continuous: true/false, singleshot: true/false, filter: <filterdescriptor>}");
    process.exit(0);
    return;
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.filter = prophash.filter;
    this.defer = prophash.defer;
    this.subsink = null;
    this.subSinkDestroyedListener = null;
  }
  lib.inherit(StreamFromDataSink, SinkTask);
  StreamFromDataSink.prototype.__cleanUp = function () {
    if (this.subSinkDestroyedListener) {
      this.subSinkDestroyedListener.destroy();
    }
    this.subSinkDestroyedListener = null;
    if (this.subsink) {
      this.subsink.destroy();
    }
    this.subsink = null;
    this.defer = null;
    this.filter = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  StreamFromDataSink.prototype.go = function () {
    this.sink.subConnect('.', {name:'-', role: 'user', filter: this.filter}).done(
      this.onSuccess.bind(this),
      this.onFail.bind(this)
    );
  };
  StreamFromDataSink.prototype.onSuccess = function (sink) {
    if(!sink){
      this.defer.reject(new lib.Error('NO_SINK'));
      lib.runNext(this.destroy.bind(this));
      return;
    }
    if(!sink.recordDescriptor){
      console.error('no recordDescriptor on Sink', sink.modulename, sink.role);
      return;
    }
    this.subsink = sink;
    this.subSinkDestroyedListener = sink.destroyed.attach(this.destroy.bind(this));
    sink.consumeChannel('d', new DataDecoder(this));
  };
  StreamFromDataSink.prototype.onFail = function (reason) {
    this.defer.reject(reason);
    lib.runNext(this.destroy.bind(this));
  };
  StreamFromDataSink.prototype.beginInit = function () {
    return q(true);
  };
  StreamFromDataSink.prototype.endInit = function () {
    this.defer.resolve(true);
    lib.runNext(this.destroy.bind(this));
    return q(true);
  };
  StreamFromDataSink.prototype.create = function (datahash) {
    this.defer.notify(datahash);
    return q(true);
  };
  StreamFromDataSink.prototype.compulsoryConstructionProperties = ['sink','defer'];

  return StreamFromDataSink;
}

module.exports = createStreamFromDataSink;
