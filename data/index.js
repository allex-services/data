function createDataSuite(execlib){
  'use strict';
  var execSuite = execlib.execSuite,
    dataSuite = {
      storageRegistry: new execSuite.RegistryBase(),
      recordSuite: require('./record')(execlib)
    };
    execlib.dataSuite = dataSuite;
    dataSuite.DataObject = require('./objectcreator')(execlib);
    require('./utils')(execlib);
    dataSuite.filterFactory = require('./filters/factorycreator')(execlib);
    dataSuite.QueryBase = require('./query/basecreator')(execlib);
    dataSuite.QueryClone = require('./query/clonecreator')(execlib);
    var DataCoder = require('./codercreator')(execlib),
        DataDecoder = require('./decodercreator')(execlib),
        streamSourceCreator = execSuite.streamSourceCreator;
    dataSuite.DataSource = streamSourceCreator(DataCoder);
    dataSuite.DataDecoder = DataDecoder;
    dataSuite.StreamDistributor = require('./distributorcreator')(execlib);
    dataSuite.DataManager = require('./managercreator')(execlib);
    dataSuite.DistributedDataManager = require('./distributedmanagercreator')(execlib);
    dataSuite.StorageBase = require('./storage/basecreator')(execlib);
    dataSuite.NullStorage = require('./storage/nullcreator')(execlib);
    dataSuite.CloneStorage = require('./storage/clonecreator')(execlib);
    dataSuite.MemoryStorage = require('./storage/memorycreator')(execlib);

    dataSuite.storageRegistry.add('memory', dataSuite.MemoryStorage);
}

module.exports = createDataSuite;
