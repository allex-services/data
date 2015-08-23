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
    var item = this.find(datahash, output) || this.newObjTo(datahash, output);
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
    return this.pkColumns.all(function(column) {
      if (datahash[column] === item[column]) {
        foundobj.found = item;
        return true;
      }
    });
  };

  function RootDataJob () {
    this.children = [];
    this.state = new lib.ListenableMap();
  }
  RootDataJob.prototype.destroy = function () {
    if (this.state) {
      this.state.destroy();
    }
    this.state = null;
    if (this.children) {
      lib.arryDestroyAll(this.children);
    }
    this.children = null;
  };
  RootDataJob.prototype.add = function (child) {
    this.children.push(child);
    child.parnt = this;
  };

  function DataJob(prophash) {
    RootDataJob.call(this);
    this.aggregator = null;
    if (prophash.output) {
      this.aggregator = new AggregatedData(prophash.output);
    }
    this.parnt = null;
    this.output = [];
  }
  lib.inherit(DataJob, RootDataJob);
  DataJob.prototype.destroy = function () {
    this.output = null;
    this.parnt = null;
    if (this.aggregator) {
      this.aggregator.destroy();
    }
    this.aggregator = null;
    RootDataJob.prototype.destroy.call(this);
  };
  DataJob.prototype.trigger = execSuite.dependentMethod({mapname:'parent.state', names:['output']}, function (input, data) {
    this.produceOutput(data);
    this.forward();
  });
  DataJob.prototype.processRow = function (data) {
    this.produceOutput(data);
  };
  function triggerer(c) {
    c.trigger();
  }
  DataJob.prototype.forward = function () {
    this.children.forEach(triggerer);
  };
  DataJob.prototype.produceOutput = function (data) {
    console.log('should produce output, incoming data', data);
    if (this.aggregator) {
      this.output = this.aggregator.aggregate(data);
    }
    console.log('and the output is', this.output);
  };

  function DataSinkDataJob (prophash) {
    DataJob.call(this, prophash);
    this.filter = prophash.filter;
    if (!this.filter) {
      throw new lib.Error('FILTER_NEEDED', 'JobDescriptor misses the "filter" field');
    }
    this.evaluateFilter();
  }
  lib.inherit(DataSinkDataJob, DataJob);
  DataSinkDataJob.prototype.destroy = function () {
    this.filter = null;
    DataJob.prototype.destroy.call(this);
  };
  DataSinkDataJob.prototype.onSink = function (sink) {
    console.log('Job with filter', this.filter, 'onSink', sink ? sink.modulename : 'no sink');
    this.state.add('sink', sink);
    if (!sink) {
      return;
    }
  };
  DataSinkDataJob.prototype.onSubSink = function (subsink) {
    if (!subsink) {
      return;
    }
    var data = [];
    taskRegistry.run('materializeData', {
      sink: subsink,
      data: data,
      onInitiated: this.processRow.bind(this, data),
      onNewRecord: this.processRow.bind(this, data)
    });
  };
  DataSinkDataJob.prototype.forward = function () {
    if (!this.children) {
      return;
    }
    this.children.forEach(function(c){
      c.trigger();
    });
  };
  DataSinkDataJob.prototype.evaluateFilter = execSuite.dependentMethod([{mapname: 'state', names: ['sink']}], function (sink, defer) {
    if ('function' === typeof this.filter) {
      var fr = this.filter();
      if ('function' === typeof fr.done) {
        fr.done(this.onFilter.bind(this, sink));
      } else {
        this.onFilter(sink, fr);
      }
    } else {
      this.onFilter(sink, this.filter);
    }
    return defer.promise;
  });
  DataSinkDataJob.prototype.onFilter = function (defer, filter) {
    if (!filter) {
      return;
    }
    if (this.parnt && !this.parnt.output) {
      return;
    }
    var input = this.parnt.output;
    if (this.isFilterInputDependent(filter)) {
      console.log(filter, 'is input dependent');
      input.forEach(this.produceDataDependentFilter.bind(this, filter));
    } else { 
      console.log(filter, 'is input dependent NOT');
      this.applyFilter(filter);
    }
  };
  DataSinkDataJob.prototype.applyFilter = function (filters) {
    var sink = this.state.get('sink');
    if (!(sink && sink.destroyed && sink.recordDescriptor)) {
      return;
    }
    sink.subConnect('.', {
      name: 'user',
      role: 'user',
      filter: filter
    }).done(
      this.onSubSink.bind(this),
      this.destroy.bind(this)
    );
  };
  DataSinkDataJob.prototype.isFilterInputDependent = function (filter) {
    if (filter.value && 
      filter.value.substring(0,2) === '{{' && 
      filter.value.substring(filter.value.length-2) === '}}') {
      filter.value = filter.value.substring(2,filter.value.length-2);
      return true;
    }
    return false;
  };
  DataSinkDataJob.prototype.produceDataDependentFilter = function (filter, datahash) {
    var ret = lib.extend({}, filter);
    ret.value = datahash[ret.value];
    console.log(filter, '=>', ret);
    return ret;
  };

  function LocalAcquirerDataJob(prophash) {
    DataSinkDataJob.call(this, prophash);
    this.service = prophash.service;
    this.serviceDestroyedListener = this.service.destroyed.attach(this.destroy.bind(this));
    this.sinkListener = this.service.listenForSubService(prophash.sinkname, this.onSink.bind(this), true);
  }
  lib.inherit(LocalAcquirerDataJob, DataSinkDataJob);
  LocalAcquirerDataJob.prototype.destroy = function () {
    if (this.serviceDestroyedListener) {
      lib.runNext(this.serviceDestroyedListener.destroy.bind(this.serviceDestroyedListener));
      this.serviceDestroyedListener = null;
    }
    this.serviceDestroyedListener = null;
    if (this.sinkListener) {
      lib.runNext(this.sinkListener.destroy.bind(this.sinkListener));
      this.sinkListener = null;
    }
    this.sinkListener = null;
    this.service = null;
    DataSinkDataJob.prototype.destroy.call(this);
  };

  function FuncDataJob(func) {
    DataJob.call(this, {});
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
    this.func(this.parnt.data);
  };

  function JoinFromDataSinks(prophash) {
    Task.call(this, prophash);
    this.jobs = prophash.jobs;
    this.job = null;
  }
  lib.inherit(JoinFromDataSinks, Task);
  JoinFromDataSinks.prototype.go = function () {
    if (this.job) {
      return;
    }
    this.job = this.jobs.reduce(this.createJob.bind(this), this.job);
    this.jobs = null;
  };
  JoinFromDataSinks.prototype.createJob = function (parentjob, jobdesc) {
    var job;
    if ('function' === typeof jobdesc) {
      job = new FuncDataJob(jobdesc);
    } else if (jobdesc.type === 'sub') {
      job = new LocalAcquirerDataJob(jobdesc);
    }
    if (!parentjob) {
      this.job = job;
    } else {
      parentjob.add(job);
    }
    return job;
  };
  JoinFromDataSinks.prototype.compulsoryConstructionParameters = ['jobs'];

  return JoinFromDataSinks;
}

module.exports = createJoinFromDataSinksTask;
