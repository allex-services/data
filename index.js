function createServicePack(execlib){
  'use strict';
  require('./data')(execlib); //extend execlib with dataSuite;

  return {
    Service: require('./servicecreator')(execlib),
    SinkMap: require('./sinkmapcreator')(execlib),
    Tasks: [{
      name: 'materializeData',
      klass: require('./tasks/materializeData')(execlib)
    },{
      name: 'forwardData',
      klass: require('./tasks/forwardData')(execlib)
    }]
  };
}

module.exports = createServicePack;
