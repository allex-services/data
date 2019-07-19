function createDataService(execlib, ParentService, datalib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    recordSuite = datalib.recordSuite,
    NullStorage = datalib.NullStorage,
    SpawningDataManager = datalib.SpawningDataManager,
    DataSession = require('./users/common/datasessioncreator')(execlib, ParentService),
    userSessionFactory = execSuite.userSessionFactoryCreator(DataSession);

  if (!execlib.dataSuite) {
    require('./data')(execlib, datalib);
  }
  require('./data/serversideindex')(execlib, ParentService);

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service'),userSessionFactory),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user'),userSessionFactory)
    };
  }

  function Aggregator (onDataReady, storageinstance, config) {
    this._rn = null;
    this._aggregate = storageinstance.aggregate.bind(storageinstance, config.query);
    this._interval = config.interval;
    this.onDataReady = onDataReady;
    this.data = null;
    this._go();
  }

  Aggregator.prototype.destroy = function () {
    if (this._rn) this._rn.destroy();
    this._rn = null;
    this._interval = null;
    this._aggregate = null;
    this.onDataReady = null;
    this.data = null;
  };

  Aggregator.prototype._go = function () {
    if (this._rn) this._rn.destroy();
    this._rn = null;

    this._aggregate().done (this._onSuccess.bind(this), this._onFailed.bind(this), this._onProgress.bind(this));
  };

  Aggregator.prototype._next = function () {
    this._rn = lib.runNext (this._go.bind(this), this._interval);
  };

  Aggregator.prototype._onSuccess = function () {
    this.onDataReady(this.data);
    this._next();
  };

  Aggregator.prototype._onProgress = function (aggdata) {
    if ('start' === aggdata.op) {
      this.data = [];
      return;
    }

    if ('next' === aggdata.op) {
      this.data.push (aggdata.data);
      return;
    }
  };

  Aggregator.prototype._onFailed = function (err) {
    if (err.code === 'NOT_CONNECTED'){
      lib.runNext (this._go.bind(this), 100);
      return;
    }

    console.log('FAILED TO AGGREGATE', err);
    this.next();
  };

  function DataService(prophash){
    ParentService.call(this,prophash);
    this.intermediateStorage = null;
    this.data = null;
    this._aggregations = null;
    this.createStorageAsync(prophash).done(
      this.createData.bind(this, prophash)
    );
  }
  ParentService.inherit(DataService,factoryCreator);
  DataService.prototype.storageDescriptor = {record:{fields:[]}};
  var dsio = DataService.inherit;
  DataService.inherit = function(childCtor,factoryProducer,childStorageDescriptor){
    dsio.call(this,childCtor,factoryProducer);
    childCtor.prototype.storageDescriptor = datalib.inherit(this.prototype.storageDescriptor,childStorageDescriptor);
  };
  DataService.prototype.__cleanUp = function () {
    if (this._aggregations) {
      lib.containerDestroyAll (this._aggregations);
      this._aggregations.destroy();
    }
    this._aggregations = null;
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
    this.resolveReadyToAcceptUsersDeferOnStorageCreated(true);
    if (!prophash.storage || !prophash.storage.aggregations) return; //nothing to be done ...
    
    this._aggregations = new lib.Map();
    lib.traverseShallow (prophash.storage.aggregations, this._createAggregation.bind(this, storageinstance));
  };

  DataService.prototype.resolveReadyToAcceptUsersDeferOnStorageCreated = function (result) {
    if (this.readyToAcceptUsersDefer) {
      this.readyToAcceptUsersDefer.resolve(result);
    }
  };

  DataService.prototype._createAggregation = function (storageinstance, item, alias) {
    this._aggregations.add (alias, new Aggregator(this._onAggregationDataReady.bind(this, alias), storageinstance, item));
  };

  DataService.prototype._getAggregationStateNameFromAlias = function (alias) {
    return 'aggregation_'+alias;
  };

  DataService.prototype._onAggregationDataReady = function (alias, data) {
    this.state.set(this._getAggregationStateNameFromAlias (alias), data);
  };

  DataService.prototype.createStorageAsync = function (prophash){
    var d;
    if(prophash && prophash.storage && prophash.storage.modulename){
      prophash.storage.propertyhash = prophash.storage.propertyhash || {};
      prophash.storage.propertyhash.record = this.storageDescriptor.record;
      return datalib.storageRegistry.spawn(prophash.storage.modulename,prophash.storage.propertyhash);
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
