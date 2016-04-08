function createClientSide(execlib) {
  'use strict';
  require('./data')(execlib); //extend execlib with dataSuite;
  return {
    SinkMap: require('./sinkmapcreator')(execlib),
    Tasks: [{
      name: 'materializeQuery',
      klass: require('./tasks/materializeQuery')(execlib)
    },{
      name: 'forwardData',
      klass: require('./tasks/forwardData')(execlib)
    },{
      name: 'readFromDataSink',
      klass: require('./tasks/readFromDataSink')(execlib)
    },{
      name: 'streamFromDataSink',
      klass: require('./tasks/streamFromDataSink')(execlib)
    },{
      name: 'joinFromDataSinks',
      klass: require('./tasks/joinFromDataSinks')(execlib)
    }]
  };
}

module.exports = createClientSide;
