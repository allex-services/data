function createJoinFromDataSinksTask(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Task = execSuite.Task,
    taskRegistry = execSuite.taskRegistry;

  function ArryizedColumn(prophash) {

  }
  ArryizedColumn.prototype.destroy = function () {
  };
  ArryizedColumn.prototype.process = function (item, name, data) {
    var a = item[name], target = data[name];
    if (!a) {
      a = [];
      item[name] = a;
    }
    if (lib.isArray(target)) {
      a.push.apply(a, target);
    } else {
      a.push(target);
    }
  };
  ArryizedColumn.prototype.initValue = function () {
    return [];
  };

  function AggregatedData (desc) {
    this.pkColumns = [];
    this.processors = new lib.Map();
    desc.forEach(this.doDescItem.bind(this));
  }
  AggregatedData.prototype.destroy = function () {
  };
  AggregatedData.prototype.doDescItem = function (descitem) {
    if (!descitem.name) {
      throw new lib.Error('NO_DESCITEM_NAME',descitem);
    }
    switch(descitem.op) {
      case 'arrayize':
        this.processors.add(descitem.name, new ArryizedColumn(descitem.propertyhash));
        break;
      default:
        this.pkColumns.push(descitem.name);
    }
  };
  AggregatedData.prototype.aggregate = function (data) {
    var ret = [];
    data.forEach(this.add.bind(this, ret));
    return ret;
  };
  AggregatedData.prototype.add = function (output, datahash) {
    //console.log('finding out the item for', datahash);
    try {
    var item = this.find(datahash, output) || this.newObjTo(datahash, output);
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
    //console.log('working on aggro item', item, this.processors.count, 'processors');
    this.processors.traverse(function (processor, name) {
      processor.process(item, name, datahash);
    });
  };
  AggregatedData.prototype.newObj = function (datahash) {
    var ret = {};
    this.pkColumns.forEach(function (pkc) {
      ret[pkc] = datahash[pkc];
    });
    this.processors.traverse(function (proc, name) {
      ret[name] = proc.initValue();
    });
    return ret;
  };
  AggregatedData.prototype.newObjTo = function (datahash, output) {
    var ret = this.newObj(datahash);
    output.push(ret);
    return ret;
  };
  AggregatedData.prototype.find = function (datahash, output) {
    var foundobj = {found: null};
    output.some(this.conformsToPK.bind(this, foundobj, datahash));
    return foundobj.found;
  };
  AggregatedData.prototype.conformsToPK = function (foundobj, datahash, item) {
    if (this.pkColumns.length < 1) {
      foundobj.found = item;
      return true;
    }
    return this.pkColumns.every(function(column) {
      if (datahash[column] === item[column]) {
        foundobj.found = item;
        return true;
      }
    });
  };

  function DataJobBase () {
    this.children = [];
    this.state = new lib.ListenableMap();
  }
  DataJobBase.prototype.destroy = function () {
    if (this.state) {
      this.state.destroy();
    }
    this.state = null;
    if (this.children) {
      lib.arryDestroyAll(this.children);
    }
    this.children = null;
  };

  function RootDataJob () {
    DataJobBase.call(this);
    this.state.add('output', []);
  }
  lib.inherit(RootDataJob, DataJobBase);

  function DataJob(parnt, prophash) {
    DataJobBase.call(this);
    this.aggregator = null;
    if (prophash.output) {
      this.aggregator = new AggregatedData(prophash.output);
    }
    this.parnt = parnt;
    parnt.children.push(this);
  }
  lib.inherit(DataJob, DataJobBase);
  DataJob.prototype.destroy = function () {
    this.parnt = null;
    if (this.aggregator) {
      this.aggregator.destroy();
    }
    this.aggregator = null;
    RootDataJob.prototype.destroy.call(this);
  };

  function DataSinkSubJob (parnt, sink, defer) {
    this.parnt = parnt;
    this.sink = sink;
    this.data = [];
    this.output = [];
    this.defer = defer;
    var handler = this.produceOutput.bind(this);
    taskRegistry.run('materializeQuery', {
      sink: sink,
      data: this.data,
      onInitiated: handler,
      onNewRecord: handler,
      onUpdate: handler,
      onDelete: handler
    });
  }
  DataSinkSubJob.prototype.destroy = function () {
    this.defer = null;
    this.output = null;
    this.data = null;
    if (this.sink.destroyed) {
      lib.destroyASAP(this.sink);
    }
    this.sink = null;
    this.parnt = null;
  };
  DataSinkSubJob.prototype.produceOutput = function () {
    if (!this.parnt) {
      return;
    }
    var d = this.defer, assembleresult;
    this.defer = null;
    if (this.parnt.aggregator) {
      this.output = this.parnt.aggregator.aggregate(this.data);
    } else {
      this.output = this.data;
    }
    assembleresult = this.parnt.assembleOutput();
    if (d) {
      d.resolve(true);
    } else {
      if (assembleresult) {
        this.parnt.dataProduced();
      }
    }
  };

  function DataSinkDataJob (parnt, prophash) {
    DataJob.call(this, parnt, prophash);
    this.filter = prophash.filter;
    this.subsinks = [];
    if (!this.filter) {
      throw new lib.Error('FILTER_NEEDED', 'JobDescriptor misses the "filter" field');
    }
  }
  lib.inherit(DataSinkDataJob, DataJob);
  DataSinkDataJob.prototype.destroy = function () {
    if (this.subsinks) {
      lib.arryDestroyAll(this.subsinks);
    }
    this.subsinks = null;
    this.filter = null;
    DataJob.prototype.destroy.call(this);
  };
  DataSinkDataJob.prototype.dataProduced = function () {
    if (this.state.get('output')) {
      this.children.forEach(function(c){
        c.trigger();
      });
    }
  };
  DataSinkDataJob.prototype.onSink = function (sink) {
    //console.log('Job with filter', this.filter, 'onSink', sink ? sink.modulename : 'no sink');
    if (!this.state) {
      return;
    }
    this.state.replace('sink', sink);
    if (!sink) {
      return;
    }
    this.trigger();
  };
  DataSinkDataJob.prototype.onSubSink = function (defer, inputrow, subsink) {
    if (!subsink) {
      return;
    }
    this.subsinks.push(new DataSinkSubJob(this, subsink, defer));
  };
  DataSinkDataJob.prototype.assembleOutput = function () {
    if(this.subsinks.some(function(ss) {return ss.defer;})){
      return false;
    }
    var output = [];
    this.subsinks.forEach(function(ss) {
      Array.prototype.push.apply(output, ss.output);
    });
    this.state.replace('output', output);
    return true;
  };
  DataSinkDataJob.prototype.onNoSink = function (defer, reason) {
    defer.reject(reason);
    this.destroy();
  };
  DataSinkDataJob.prototype.trigger = function () {
    lib.arryDestroyAll(this.subsinks);
    this.subsinks = [];
    if ('function' === typeof this.filter) {
      var fr = this.filter();
      if ('function' === typeof fr.done) {
        fr.done(this.onFilter.bind(this));
      } else {
        this.onFilter(fr);
      }
    } else {
      this.onFilter(this.filter);
    }
  };
  DataSinkDataJob.prototype.onFilter = function (filter) {
    //console.log('filter', this.filter, 'resulted in filter', filter);
    if (!filter) {
      //console.log('but no filter');
      return;
    }
    if (!this.parnt) {
      //console.log('but no parent');
      return;
    }
    if (!this.parnt.state) {
      //console.log('but no parent state');
      return;
    }
    var input = this.parnt.state.get('output');
    if (!input) {
      //console.log('but no input');
      return;
    }
    //console.log('filter can proceeed');
    var f = this.isFilterInputDependent(filter);
    if (f) {
      q.allSettled(input.map(this.applyDataDependentFilter.bind(this, f))).done(
        this.dataProduced.bind(this),
        console.error.bind(console, 'applyDataDependentFilter error')
      );
    } else { 
      this.applyFilter(filter).done(
        this.dataProduced.bind(this),
        console.error.bind(console, 'applyFilter error')
      );
    }
  };
  DataSinkDataJob.prototype.applyFilter = function (filter, inputrow) {
    try {
    var d = q.defer();
    var sink = this.state.get('sink');
    if (!(sink && sink.destroyed && sink.recordDescriptor)) {
      d.resolve(null);
      return d.promise;
    }
    //console.log(filter, 'subconnecting to', sink.modulename);
    sink.subConnect('.', {
      name: 'user',
      role: 'user',
      filter: filter
    }).done(
      this.onSubSink.bind(this, d, inputrow),
      this.onNoSink.bind(this, d)
    );
    return d.promise;
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  };
  DataSinkDataJob.prototype.isFilterInputDependent = function (filter) {
    if (filter.value && 
      filter.value.substring(0,2) === '{{' && 
      filter.value.substring(filter.value.length-2) === '}}') {
      var ret = lib.extend({}, filter);
      ret.value = filter.value.substring(2,filter.value.length-2);
      return ret;
    }
    return null;
  };
  DataSinkDataJob.prototype.applyDataDependentFilter = function (filter, datahash) {
    var ret = lib.extend({}, filter);
    ret.value = datahash[ret.value];
    //console.log(filter, '=>', ret);
    return this.applyFilter(ret, datahash);
  };

  function LocalAcquirerDataJob(parnt, prophash) {
    DataSinkDataJob.call(this, parnt, prophash);
    this.service = prophash.service;
    this.serviceDestroyedListener = this.service.destroyed.attach(this.destroy.bind(this));
    //console.log('LocalAcquirerDataJob listening for', prophash.sinkname);
    //this.sinkListener = this.service.listenForSubService(prophash.sinkname, this.onSink.bind(this), true);
    this.sinkListener = this.service.subservices.listenFor(prophash.sinkname, this.onSink.bind(this), true);
  }
  lib.inherit(LocalAcquirerDataJob, DataSinkDataJob);
  LocalAcquirerDataJob.prototype.destroy = function () {
    if (this.serviceDestroyedListener) {
      lib.destroyASAP(this.serviceDestroyedListener);
      this.serviceDestroyedListener = null;
    }
    this.serviceDestroyedListener = null;
    if (this.sinkListener) {
      lib.destroyASAP(this.sinkListener);
      this.sinkListener = null;
    }
    this.sinkListener = null;
    this.service = null;
    DataSinkDataJob.prototype.destroy.call(this);
  };

  function GlobalAcquirerDataJob(parnt, prophash) {
    DataSinkDataJob.call(this, parnt, prophash);
    //console.log('GlobalAcquirerDataJob listening for', prophash.sinkname);
    this.sinkListener = taskRegistry.run('findSink', {
      sinkname: prophash.sinkname, 
      identity: prophash.identity || {},
      onSink: this.onSink.bind(this)
    });
  }
  lib.inherit(GlobalAcquirerDataJob, DataSinkDataJob);
  GlobalAcquirerDataJob.prototype.destroy = function () {
    if (this.sinkListener) {
      lib.runNext(this.sinkListener.destroy.bind(this.sinkListener));
      this.sinkListener = null;
    }
    this.sinkListener = null;
    this.service = null;
    DataSinkDataJob.prototype.destroy.call(this);
  };

  function TargetSinkDataJob (parnt, jobdesc) {
    DataJob.call(this, parnt, jobdesc);
    this.sink = jobdesc.sink;
  }
  lib.inherit(TargetSinkDataJob, DataJob);
  TargetSinkDataJob.prototype.destroy = function () {
    this.sink = null;
    DataJob.prototype.destroy.call(this);
  };
  TargetSinkDataJob.prototype.trigger = function () {
    var input = this.parnt.state.get('output'),
      sink = this.sink;
    sink.call('delete', {}).then(
      input.forEach(sink.call.bind(sink, 'create'))
    );
  };

  function FuncDataJob (parnt, func) {
    DataJob.call(this, parnt, {});
    this.func = func;
  }
  lib.inherit(FuncDataJob, DataJob);
  FuncDataJob.prototype.destroy = function () {
    this.func = null;
    DataJob.prototype.destroy.call(this);
  };
  FuncDataJob.prototype.trigger = function () {
    if (!this.func) {
      return;
    }
    this.func(this.parnt.state.get('output'));
  };

  function JoinFromDataSinks(prophash) {
    Task.call(this, prophash);
    this.jobs = prophash.jobs;
    this.job = null;
  }
  lib.inherit(JoinFromDataSinks, Task);
  JoinFromDataSinks.prototype.destroy = function () {
    this.jobs = null;
    if (this.job) {
      this.job.destroy();
    }
    this.job = null;
  };
  function createJob (parentjob, jobdesc) {
    var job;
    if (lib.isArray(jobdesc)) {
      job = this.createJob(parentjob, jobdesc[0]);
    } else if ('function' === typeof jobdesc) {
      job = new FuncDataJob(parentjob, jobdesc);
    } else if (jobdesc.type === 'targetsink') {
      job = new TargetSinkDataJob(parentjob, jobdesc);
    } else if (jobdesc.type === 'sub') {
      job = new LocalAcquirerDataJob(parentjob, jobdesc);
    } else if (jobdesc.type === 'global') {
      job = new GlobalAcquirerDataJob(parentjob, jobdesc);
    }
    if (lib.isArray(jobdesc.jobs)) {
      jobdesc.jobs.forEach(createJob.bind(null, job));
    }
  };
  JoinFromDataSinks.prototype.go = function () {
    if (this.job) {
      return;
    }
    this.job = new RootDataJob();
    this.jobs.forEach(createJob.bind(null, this.job));
    this.jobs = null;
  };
  JoinFromDataSinks.prototype.compulsoryConstructionProperties = ['jobs'];

  return JoinFromDataSinks;
}

module.exports = createJoinFromDataSinksTask;
