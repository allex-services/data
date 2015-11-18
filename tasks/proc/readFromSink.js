function createReadFromSinkProc (execlib, prophash) {
  'use strict';
  var data = [],
    skipdestroy = false,
    error = null,
    initialized = false,
    sinkDestroyedListener = prophash.sink.destroyed.attach(onSinkDestroyed),
    lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function finish () {
    try {
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
    initialized = null;
    error = null;
    if (!skipdestroy) {
      console.log('calling', prophash.sink.destroy.toString());
      prophash.sink.destroy();
    }
    skipdestroy = null;
    data = null;
    prophash = null;
    } catch(e) {
      console.error(e.stack);
      console.error(e);
    }
  }

  function onSinkDestroyed (allok) {
    skipdestroy = true;
    if (!initialized) {
      error = new lib.Error('DATA_CORRUPTION_ON_CONNECTION_BREAKDOWN', 'Data connection broke during data read');
    }
    finish();
  }

  function onRecord (datahash) {
    //console.log('onRecord', datahash, 'currently data:', data);
    if (prophash.singleshot) {
      if (data.length) {
        data.destroy();
      }
      return;
    }
  }

  function killSink() {
    initialized = true;
    prophash.sink.destroy();
  }

  taskRegistry.run('materializeData', {
    sink: prophash.sink,
    data: data,
    onRecordCreation: onRecord,
    onInitiated: killSink
  });
}

module.exports = createReadFromSinkProc;
