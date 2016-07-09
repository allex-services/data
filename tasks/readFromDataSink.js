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
    this.visiblefields = prophash.visiblefields;
    this.cb = prophash.cb;
    this.errorcb = prophash.errorcb;
    this.singleshot = prophash.singleshot;
    this.continuous = prophash.continuous;
  }
  lib.inherit(ReadFromDataSink, SinkTask);
  ReadFromDataSink.prototype.__cleanUp = function () {
    this.continuous = null;
    this.singleshot = null;
    this.errorcb = null;
    this.cb = null;
    this.filter = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  ReadFromDataSink.prototype.go = function () {
    readFromSinkProc({
      sink: this.sink,
      singleshot: this.singleshot,
      continuous: this.continuous,
      filter: this.filter,
      visiblefields: this.visiblefields,
      cb: this.cb,
      errorcb: this.onFail.bind(this)
    });
    /*
    this.sink.subConnect('.', {name:'-', role: 'user', filter: this.filter}).done(
      this.onSuccess.bind(this),
      this.onFail.bind(this)
    );
    */
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
    this.destroy();
  };
  ReadFromDataSink.prototype.compulsoryConstructionProperties = ['sink','cb'];

  return ReadFromDataSink;
}

module.exports = createReadFromDataSink;
