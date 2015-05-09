function createServicePack(execlib){
  require('./data')(execlib); //extend execlib with dataSuite;

  return {
    Service: require('./servicecreator')(execlib),
    SinkMap: require('./sinkmapcreator')(execlib)
  };
}

module.exports = createServicePack;
