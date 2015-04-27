function createServicePack(execlib){
  var dataSuite = require('./data')(execlib);
  dataSuite.recordSuite = require('./record/suitecreator')(execlib);
  execlib.dataSuite = dataSuite;

  return {
    Service: require('./servicecreator')(execlib),
    SinkMap: require('./sinkmapcreator')(execlib)
  };
}

module.exports = createServicePack;
