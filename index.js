function createServicePack(execlib){
  require('./data')(execlib); //extend execlib with dataSuite;

  return {
    Service: require('./servicecreator')(execlib),
    SinkMap: require('./sinkmapcreator')(execlib),
    Tasks: [{
      name: 'materializeData',
      constructor: require('./tasks/materializeData')(execlib)
    }]
  };
}

module.exports = createServicePack;
