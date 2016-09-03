function createSpawningDataManager(execlib) {
  'use strict';
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    Destroyable = lib.Destroyable,
    ComplexDestroyable = lib.ComplexDestroyable,
    dataSuite = execlib.dataSuite,
    filterFactory = dataSuite.filterFactory,
    QueryBase = dataSuite.QueryBase,
    QueryClone = dataSuite.QueryClone,
    StreamDistributor = dataSuite.StreamDistributor,
    DistributedDataManager = dataSuite.DistributedDataManager,
    JobBase = qlib.JobBase;

  function EventQ(target){
    lib.Destroyable.call(this);
    this.target = target;
    this.q = new lib.Fifo();
  }
  lib.inherit(EventQ,lib.Destroyable);
  EventQ.prototype.__cleanUp = function(){
    this.dump();
    this.q.destroy();
    this.q = null;
    this.target = null;
    lib.Destroyable.prototype.__cleanUp.call(this);
  };
  EventQ.prototype.isOK = function(item){
    //let's accept all until the channel reads out initial data
    //and then let the channel decide upon these events
    return true; 
  };
  EventQ.prototype.onStream = function(item){
    if (!this.target) {
      return;
    }
    if (!this.target.destroyed) {
      this.destroy();
      return;
    }
    this.q.push(item);
  };
  EventQ.prototype.dump = function(){
    if (!this.q) {
      return;
    }
    //console.log('EventQ dumping', this.q.length, 'items');
    this.q.drain(this.drainer.bind(this));
  };
  EventQ.prototype.drainer = function (item) {
    switch (item[0]) {
      case 'c':
        if(this.target.isOK(item[1])){
          this.target.onStream(item);
        }
      default:
        this.target.onStream(item);
    }
  };

  function QueryRunner(runningquery, prophash, defer) {
    Destroyable.call(this);
    JobBase.call(this, defer);
    QueryClone.call(this, runningquery);
    this.result = true;//for the JobBase
    this.singleshot = prophash.singleshot;
    this.continuous = prophash.continuous;
    this.pagesize = prophash.pagesize;
    this.page = 0;
  }
  lib.inherit(QueryRunner, Destroyable);
  lib.inheritMethods(QueryRunner, JobBase, 'resolve', 'reject', 'notify');
  lib.inheritMethods(QueryRunner, QueryClone, 'filter',/*'limit','offset',*/'isEmpty','isLimited','isOffset','isOK');
  QueryRunner.prototype.__cleanUp = function () {
    this.page = null;
    this.pagesize = null;
    this.continuous = null;
    this.singleshot = null;
    QueryClone.prototype.destroy.call(this);
    JobBase.prototype.destroy.call(this);
  };
  QueryRunner.prototype.onStream = function (item) {
    var i  = QueryClone.prototype.onStream.call(this,item);
    //console.log(process.pid+'', 'Runner', this.filter(), 'onStream', i);
    //console.log(item, '=>', i);
    if (i) {
      this.notify(i);
    }
  };
  QueryRunner.prototype.limit = function () {
    return this.pagesize;
  };
  QueryRunner.prototype.offset = function () {
    if (this.pagesize) {
      return this.pagesize*this.page;
    }
  };

  function RunningQuery(recorddescriptor, filterdescriptor, visiblefields) {
    ComplexDestroyable.call(this);
    QueryBase.call(this, recorddescriptor, visiblefields);
    //console.log('new RunningQuery', this.record);
    this.distributor = new StreamDistributor();
    this._filter = filterFactory.createFromDescriptor(filterdescriptor);
  }
  lib.inherit(RunningQuery, ComplexDestroyable);
  lib.inheritMethods(RunningQuery, QueryBase, /*'limit','offset',*/'isEmpty','isLimited','isOffset','isOK','processUpdateExact');
  RunningQuery.prototype.__cleanUp = function () {
    if (this._filter) {
      this._filter.destroy();
    }
    this._filter = null;
    if (this.distributor) {
      this.distributor.destroy();
    }
    this.distributor = null;
    QueryBase.prototype.destroy.call(this);
  };
  RunningQuery.prototype.dyingCondition = function () {
    if (!this.distributor) {
      return true;
    }
    if (!this.distributor.sinks) {
      return true;
    }
    return this.distributor.sinks.length < 1;
  };
  RunningQuery.prototype.startTheDyingProcedure = function () {
    if (this.distributor) {
      this.distributor.destroy();
    }
    this.distributor = null;
  };
  RunningQuery.prototype.filter = function(){
    return this._filter;
  };
  RunningQuery.prototype.limit = lib.dummyFunc;
  RunningQuery.prototype.offset = lib.dummyFunc;
  RunningQuery.prototype.addRunner = function (manager, runner) {
    if (!runner) {
      return;
    }
    if (!runner.destroyed) {
      return;
    }
    var d = lib.q.defer(),
      eventq = new EventQ(runner);
    this.distributor.attach(eventq);
    eventq.destroyed.attachForSingleShot(this.checkForDying.bind(this));
    d.promise.done(
      this.onRunnerInitiated.bind(this,eventq),
      runner.reject.bind(runner),
      runner.onStream.bind(runner)
    );
    manager.read(this, d);
    d = null;
    eventq = null;
  };
  RunningQuery.prototype.onRunnerInitiated = function (eventq) {
    var runner = eventq.target;
    eventq.dump();
    if (!runner) {
      eventq.destroy();
      eventq = null;
      return;
    }
    if (runner.singleshot || !runner.continuous) {
      runner.resolve(true);
      eventq.destroy();
      eventq = null;
      return;
    }
    if (!this.distributor) {
      return;
    }
    this.distributor.attach(runner);
    runner.destroyed.attachForSingleShot(this.checkForDying.bind(this)); //make a this.maybedier = this.maybeDie.bind(this); in the ctor
    eventq.destroy();
    eventq = null;
  };
  RunningQuery.prototype.onStream = function (item) {
    var i;
    if (this.distributor) {
      i = QueryBase.prototype.onStream.call(this,item);
      if (i) {
        this.distributor.onStream(i);
      }
    }
  };
  RunningQuery.prototype.checkForDying = function () {
    if (this.dyingCondition()) {
      this.destroy();
    }
  };

  function SpawningDataManager(storageinstance, filterdescriptor, recorddescriptor) {
    DistributedDataManager.call(this, storageinstance, filterdescriptor);
    this.recorddescriptor = recorddescriptor;
    this.runningQueries = new lib.DIContainer();
    //console.trace();
    //console.log('new SpawningDataManager', this.id);
  }
  lib.inherit(SpawningDataManager, DistributedDataManager);
  SpawningDataManager.prototype.destroy = function () {
    this.recorddescriptor = null;
    if (this.runningQueries) {
      this.runningQueries.destroyDestroyables();
      this.runningQueries.destroy();
    }
    this.runningQueries = null;
    DistributedDataManager.prototype.destroy.call(this);
  };
  /*
  * queryprophash keys: filter, singleshot, continuous
  */
  SpawningDataManager.prototype.addQuery = function (id, queryprophash, defer) {
    if (!queryprophash) {
      defer.reject(new lib.Error('NO_QUERY_PROPERTY_HASH'));
      return;
    }
    var filterstring = JSON.stringify(queryprophash.filter ? queryprophash.filter : '*'),
      rq = this.runningQueries.get(filterstring),
      qr;
    //console.log(this.id, 'reading', this.storage.data, 'on', queryprophash.filter);
    if (!rq) {
      rq = new RunningQuery(this.recorddescriptor, queryprophash.filter, queryprophash.visiblefields);
      this.runningQueries.registerDestroyable(filterstring, rq);
      this.distributor.attach(rq);
    }
    defer.notify(['i', id]);
    qr = new QueryRunner(rq, queryprophash, defer);
    rq.addRunner(this, qr);
    return qr;
  };

  return SpawningDataManager;
}

module.exports = createSpawningDataManager;
