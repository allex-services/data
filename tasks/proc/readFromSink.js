function createReadFromSinkProc (execlib, prophash) {
  'use strict';
  var data = [],
    skipdestroy = false,
    error = null,
    sinkDestroyedListener = prophash.sink.destroyed.attach(onSinkDestroyed),
    lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function finish () {
    if(sinkDestroyedListener) {
      sinkDestroyedListener.destroy();
    }
    sinkDestroyedListener = null;
    if (error) {
      if (prophash.errorcb) {
        prophash.errorcb(error);
      }
    } else {
      if (prophash.cb) {
        if (prophash.singleshot) {
          prophash.cb(data[0] || null);
        } else {
          prophash.cb(data);
        }
      }
    }
    error = null;
    skipdestroy = null;
    data = null;
    if (!skipdestroy) {
      prophash.sink.destroy();
    }
    prophash = null;
  }

  function onSinkDestroyed () {
    skipdestroy = true;
    error = new lib.Error('DATA_CORRUPTION_ON_CONNECTION_BREAKDOWN', 'Data connection broke during data read');
    finish();
  }

  function onRecord (datahash) {
    if (prophash.singleshot) {
      if (!data.length) {
        data.push(datahash);
      }
      return;
    }
    data.push(datahash);
  }

  taskRegistry.run('materializeData', {
    sink: prophash.sink,
    data: data,
    onRecordCreation: onRecord,
    onInitiated: finish
  });
}

module.exports = createReadFromSinkProc;
