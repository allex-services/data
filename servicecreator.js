function createDataService(execlib, ParentService){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    dataSuite = execlib.dataSuite,
    recordSuite = dataSuite.recordSuite,
    NullStorage = dataSuite.NullStorage,
    SpawningDataManager = dataSuite.SpawningDataManager,
    DataSession = require('./users/common/datasessioncreator')(execlib, ParentService),
    userSessionFactory = execSuite.userSessionFactoryCreator(DataSession);

  if (!execlib.dataSuite) {
    require('./data')(execlib);
  }
  require('./data/serversideindex')(execlib, ParentService);

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service'),userSessionFactory),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user'),userSessionFactory)
    };
  }

  function DataService(prophash){
    ParentService.call(this,prophash);
    this.intermediateStorage = null;
    this.data = null;
    this.createStorageAsync(prophash).done(
      this.createData.bind(this, prophash)
    );
  }
  ParentService.inherit(DataService,factoryCreator);
  DataService.prototype.storageDescriptor = {record:{fields:[]}};
  var dsio = DataService.inherit;
  DataService.inherit = function(childCtor,factoryProducer,childStorageDescriptor){
    dsio.call(this,childCtor,factoryProducer);
    childCtor.prototype.storageDescriptor = dataSuite.inherit(this.prototype.storageDescriptor,childStorageDescriptor);
  };
  DataService.prototype.__cleanUp = function () {
    if(this.data){
      this.data.destroy();
    }
    this.data = null;
    if (this.intermediateStorage) {
      this.intermediateStorage.destroy();
    }
    this.intermediateStorage = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  DataService.prototype.isInitiallyReady = function (prophash) {
    return !(prophash && prophash.storage && prophash.storage.modulename);
  };
  DataService.prototype.createData = function (prophash,storageinstance) {
    if (!this.destroyed) {
      return;
    }
    if (storageinstance && storageinstance.readyDefer && !storageinstance.readyDefer.promise.isFulfilled()) {
      if (this.intermediateStorage) {
        this.intermediateStorage.destroy();
      }
      this.intermediateStorage = storageinstance;
      storageinstance.readyDefer.promise.then(this.createData.bind(this, prophash, storageinstance));
      return;
    }
    this.intermediateStorage = null;
    this.data = new SpawningDataManager(storageinstance,{},this.storageDescriptor.record);
    if (this.readyToAcceptUsersDefer) {
      this.readyToAcceptUsersDefer.resolve(true);
    }
  };
  DataService.prototype.createStorageAsync = function (prophash){
    var d;
    if(prophash && prophash.storage && prophash.storage.modulename){
      prophash.storage.propertyhash = prophash.storage.propertyhash || {};
      prophash.storage.propertyhash.record = this.storageDescriptor.record;
      return dataSuite.storageRegistry.spawn(prophash.storage.modulename,prophash.storage.propertyhash);
    }
    d = q.defer();
    d.resolve(this.createStorage(this.storageDescriptor));
    return d.promise;
  };
  DataService.prototype.createStorage = function(recorddescriptor){
    return new NullStorage(recorddescriptor);
  };
  return DataService;
}

module.exports = createDataService;
