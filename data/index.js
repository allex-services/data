function createDataSuite(execlib){
  var execSuite = execlib.execSuite,
    filterFactory = require('./filters/factorycreator')(execlib),
    QueryBase = require('./query/basecreator')(execlib),
    QueryClone = require('./query/clonecreator')(execlib,QueryBase),
    DataCoder = require('./codercreator')(execlib),
    streamSourceCreator = execSuite.streamSourceCreator,
    DataSource = streamSourceCreator(DataCoder),
    StreamDistributor = require('./distributorcreator')(execlib),
    DataManager = require('./managercreator')(execlib,DataSource,filterFactory),
    DistributedDataManager = require('./distributedmanagercreator')(execlib,StreamDistributor,DataManager),
    StorageBase = require('./storage/basecreator')(execlib),
    NullStorage = require('./storage/nullcreator')(execlib,StorageBase),
    CloneStorage = require('./storage/clonecreator')(execlib,StorageBase),
    MemoryStorage = require('./storage/memorycreator')(execlib,StorageBase);
  return {
    filterFactory: filterFactory,
    QueryClone: QueryClone,
    QueryBase: QueryBase,
    StreamDistributor: StreamDistributor,
    DataManager: DataManager,
    DistributedDataManager: DistributedDataManager,
    NullStorage: NullStorage,
    CloneStorage: CloneStorage,
    MemoryStorage: MemoryStorage
  };
}

module.exports = createDataSuite;
