function createServicePack(execlib){
  'use strict';
  var ret = require('./clientside')(execlib);
  require('./data/serversideindex')(execlib);
  ret.Service = require('./servicecreator')(execlib);

  return ret;

/*
  return {
    Service: require('./servicecreator')(execlib),
    SinkMap: require('./sinkmapcreator')(execlib),
    Tasks: [{
      name: 'materializeData',
      klass: require('./tasks/materializeData')(execlib)
    },{
      name: 'forwardData',
      klass: require('./tasks/forwardData')(execlib)
    },{
      name: 'readFromDataSink',
      klass: require('./tasks/readFromDataSink')(execlib)
    }]
  };
  */
}

module.exports = createServicePack;
