function createReadFromDataSink(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    SinkTask = execSuite.SinkTask,
    readFromSinkProc = require('./proc/readFromSink').bind(null, execlib);

  function ReadFromDataSink(prophash) {
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.filter = prophash.filter;
    this.cb = prophash.cb;
    this.errorcb = prophash.errorcb;
    this.singleshot = prophash.singleshot;
  }
  lib.inherit(ReadFromDataSink, SinkTask);
  ReadFromDataSink.prototype.__cleanUp = function () {
    this.cb = null;
    this.filter = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  ReadFromDataSink.prototype.go = function () {
    this.sink.subConnect('.', {name:'-', role: 'user', filter: this.filter}).done(
      this.onSuccess.bind(this),
      this.onFail.bind(this)
    );
  };
  ReadFromDataSink.prototype.onSuccess = function (sink) {
    if(!sink){
      return;
    }
    if(!sink.recordDescriptor){
      console.error('no recordDescriptor on Sink', sink.modulename, sink.role);
      return;
    }
    readFromSinkProc({
      sink: sink,
      cb: this.cb,
      errorcb: this.errorcb,
      singleshot: this.singleshot
    });
    //lib.destroyASAP(this);
    this.destroy();
  };
  ReadFromDataSink.prototype.onFail = function (reason) {
    if (this.errorcb) {
      this.errorcb(reason);
    }
    lib.runNext(this.destroy.bind(this,reason));
  };
  ReadFromDataSink.prototype.compulsoryConstructionProperties = ['sink','cb'];

  return ReadFromDataSink;
}

module.exports = createReadFromDataSink;
