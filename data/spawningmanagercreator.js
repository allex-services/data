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
    this.q.destroy();
    this.q = null;
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
    var sink = this.target;
    //console.log('EventQ dumping', this.q.length, 'items');
    while(this.q.length){
      var item = this.q.pop();
      switch (item[0]) {
        case 'c':
          if(sink.isOK(item[1])){
            sink.onStream(item);
          }
        default:
          sink.onStream(item);
      }
    }
  };

  function QueryRunner(runningquery, prophash, defer) {
    Destroyable.call(this);
    JobBase.call(this, defer);
    QueryClone.call(this, runningquery);
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
    this.notify(i);
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
    d.promise.done(
      this.onRunnerInitiated.bind(this,eventq),
      //runner.reject.bind(runner),
      null,
      runner.notify.bind(runner)
    );
    manager.read(this, d);
  };
  RunningQuery.prototype.onRunnerInitiated = function (eventq) {
    var runner = eventq.target;
    eventq.dump();
    eventq.destroy();
    if (!runner) {
      return;
    }
    if (runner.singleshot || !runner.continuous) {
      console.log('will resolve runner', runner);
      runner.resolve(true);
      return;
    }
    if (!this.distributor) {
      return;
    }
    runner.destroyed.attachForSingleShot(this.maybeDie.bind(this)); //make a this.maybedier = this.maybeDie.bind(this); in the ctor
    this.distributor.attach(runner);
  };
  RunningQuery.prototype.onStream = function (item) {
    if (this.distributor) {
      this.distributor.onStream(QueryBase.prototype.onStream.call(this,item));
    }
  };

  function SpawningDataManager(storageinstance, filterdescriptor, recorddescriptor) {
    DistributedDataManager.call(this, storageinstance, filterdescriptor);
    this.recorddescriptor = recorddescriptor;
    this.runningQueries = new lib.Map();
  }
  lib.inherit(SpawningDataManager, DistributedDataManager);
  SpawningDataManager.prototype.destroy = function () {
    this.recorddescriptor = null;
    if (this.runningQueries) {
      lib.containerDestroyAll(this.runningQueries);
      this.runningQueries.destroy();
    }
    this.runningQueries = null;
    DistributedDataManager.prototype.destroy.call(this);
  };
  /*
  * queryprophash keys: filter, singleshot, continuous
  */
  SpawningDataManager.prototype.addQuery = function (queryprophash, defer) {
    if (!queryprophash) {
      defer.reject(new lib.Error('NO_QUERY_PROPERTY_HASH'));
      return;
    }
    var filterstring = JSON.stringify(queryprophash.filter ? queryprophash.filter : '*'),
      rq = this.runningQueries.get(filterstring);
    if (!rq) {
      rq = new RunningQuery(this.recorddescriptor, queryprophash.filter, queryprophash.visiblefields);
      this.runningQueries.add(filterstring, rq);
      this.distributor.attach(rq);
      rq.destroyed.attachForSingleShot(this.onRunningQueryDown.bind(this, filterstring));
    }
    rq.addRunner(this, new QueryRunner(rq, queryprophash, defer));
  };
  SpawningDataManager.prototype.onRunningQueryDown = function (filterstring) {
    if (!this.runningQueries) {
      return;
    }
    this.runningQueries.remove(filterstring);
  };

  return SpawningDataManager;
}

module.exports = createSpawningDataManager;
