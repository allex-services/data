(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ALLEX.execSuite.registry.add('allex_dataservice',require('./clientside')(ALLEX));

},{"./clientside":2}],2:[function(require,module,exports){
function createClientSide(execlib) {
  'use strict';
  require('./data')(execlib); //extend execlib with dataSuite;
  return {
    SinkMap: require('./sinkmapcreator')(execlib),
    Tasks: [{
      name: 'materializeData',
      klass: require('./tasks/materializeData')(execlib)
    },{
      name: 'forwardData',
      klass: require('./tasks/forwardData')(execlib)
    },{
      name: 'readFromDataSink',
      klass: require('./tasks/readFromDataSink')(execlib)
    }]
  };
}

module.exports = createClientSide;

},{"./data":20,"./sinkmapcreator":36,"./tasks/forwardData":40,"./tasks/materializeData":41,"./tasks/readFromDataSink":43}],3:[function(require,module,exports){
function createDataCoder(execlib){
  'use strict';
  var lib = execlib.lib,
      uid = lib.uid;

  function DataCoder(){
  }
  DataCoder.prototype.destroy = execlib.lib.dummyFunc;
  DataCoder.prototype.create = function(datahash){
    return {
      o: 'c',
      d: datahash
    };
  };
  DataCoder.prototype.startRead = function(){
    return {
      o: 'rb',
      d: uid()
    };
  };
  DataCoder.prototype.readOne = function(startreadrecord,datahash){
    return {
      o: 'r1',
      d: {
        id: startreadrecord.d,
        d: datahash
      }
    };
  };
  DataCoder.prototype.endRead = function(startreadrecord){
    return {
      o: 're',
      d: startreadrecord.d
    };
  };
  DataCoder.prototype.read = function(arrayofhashes){
    return {
      o: 'r',
      d: arrayofhashes
    };
  };
  DataCoder.prototype.update = function(filter,datahash){
    return {
      o: 'u',
      d: {
        f:filter.descriptor(),
        d:datahash
      }
    };
  };
  DataCoder.prototype.updateExact = function(updateexactobject){
    if(!('o' in updateexactobject && 'n' in updateexactobject)){
      throw "Bad updateExact";
    }
    return {
      o: 'ue',
      d: updateexactobject
    };
  };
  DataCoder.prototype.delete = function(filter){
    return {
      o: 'd',
      d: filter.descriptor()
    };
  };
  return DataCoder;
}

module.exports = createDataCoder;

},{}],4:[function(require,module,exports){
function createDataDecoder(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory;

  function Decoder(storable){
    this.storable = storable;
    this.working = false;
    this.q = new lib.Fifo();
  }
  Decoder.prototype.destroy = function(){
    this.q.destroy();
    this.q = null;
    this.working = null;
    this.storable = null;
  };
  Decoder.prototype.enq = function(command,item){
    if(this.working){
      this.q.push({command:command,item:item});
    }else{
      this.working = true;
      //console.log('Decoder doing',command,'on',this.storable.__id,this.storable.data);
      this[command](item);
    }
  };
  Decoder.prototype.deq = function(){
    this.working = false;
    if(this.q.length){
      var p = this.q.pop();
      this.enq(p.command,p.item);
    }
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item.o){
      case 'rb':
        this.enq('beginRead',item);
        break;
      case 're':
        this.enq('endRead',item);
        break;
      case 'r1':
        this.enq('readOne',item);
        break;
      case 'c':
        this.enq('create',item);
        break;
      case 'ue':
        this.enq('updateExact',item);
        break;
      case 'u':
        this.enq('update',item);
        break;
      case 'd':
        this.enq('delete',item);
        break;
    }
  };
  Decoder.prototype.beginRead = function(item){
    this.storable.beginInit(item.d);
    this.deq();
  };
  Decoder.prototype.endRead = function(item){
    this.storable.endInit(item.d);
    this.deq();
  };
  Decoder.prototype.readOne = function(item){
    this.storable.create(item.d.d).then(this.deq.bind(this));
  };
  Decoder.prototype.create = function(item){
    this.storable.create(item.d).then(this.deq.bind(this));
  };
  Decoder.prototype.delete = function(item){
    var f = filterFactory.createFromDescriptor(item.d);
    if(!f){
      console.log('NO FILTER FOR',item.d);
      this.deq();
    }else{
      //console.log(this.storable,this.storable.delete.toString(),'will delete');
      this.storable.delete(f).then(this.deq.bind(this));
    }
  };
  Decoder.prototype.updateExact = function(item){
    var f = filterFactory.createFromDescriptor({op:'hash',d:item.d.o});
    this.storable.update(f,item.d.n).then(this.deq.bind(this));
  };
  Decoder.prototype.update = function(item){
    var f = filterFactory.createFromDescriptor(item.d.f);
    this.storable.update(f,item.d.d).then(this.deq.bind(this));
  };
  return Decoder;
}

module.exports = createDataDecoder;

},{}],5:[function(require,module,exports){
function createDistributedDataManager(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      StreamDistributor = dataSuite.StreamDistributor,
      DataManager = dataSuite.DataManager;

  function DistributedDataManager(storageinstance,filterdescriptor){
    DataManager.call(this,storageinstance,filterdescriptor);
    this.distributor = new StreamDistributor();
    this.setSink(this.distributor);
  }
  lib.inherit(DistributedDataManager,DataManager);
  DistributedDataManager.prototype.destroy = function(){
    this.distributor.destroy();
    this.distributor = null;
    DataManager.prototype.destroy.call(this);
  };
  return DistributedDataManager;
}

module.exports = createDistributedDataManager;

},{}],6:[function(require,module,exports){
function createDataDistributor(execlib){
  'use strict';
  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    StreamDistributor = execSuite.StreamDistributor;

  var dsdid = 0;
  function DataStreamDistributor(){
    //this.id = ++dsdid;
    StreamDistributor.call(this);
  }
  lib.inherit(DataStreamDistributor,StreamDistributor);
  DataStreamDistributor.prototype.attach = function(sink){
    //console.log(this.id,'attaching');
    StreamDistributor.prototype.attach.call(this,sink);
  };
  DataStreamDistributor.prototype.onStream = function(item){
    //console.log(this.id,'distributing',item,'to',this.sinks.length);
    StreamDistributor.prototype.onStream.call(this,item);
  };
  DataStreamDistributor.prototype.doTrigger = function(item,sink){
    if(!item){
      return;
    }
    if(!sink.destroyed){
      console.log('skipping an already destroyed sink',sink.__id);
      return;
    }
    StreamDistributor.prototype.doTrigger.call(this,item,sink);
  };
  return DataStreamDistributor;
}

module.exports = createDataDistributor;

},{}],7:[function(require,module,exports){
function createAllPassFilter(execlib,Filter){
  'use strict';
  var lib = execlib.lib;
  function AllPass(filterdescriptor){
    Filter.call(this,filterdescriptor);
  }
  lib.inherit(AllPass,Filter);
  AllPass.prototype.isOK = function(datahash){
    return true;
  }
  return AllPass;
}

module.exports = createAllPassFilter;

},{}],8:[function(require,module,exports){
function createAndFilters(execlib,BooleanFilters){
  'use strict';
  var lib = execlib.lib;

  function AndFilters(filterdescriptor){
    BooleanFilters.call(this,filterdescriptor);
  }
  lib.inherit(AndFilters,BooleanFilters);
  AndFilters.prototype.arrayOperation = 'every';
  return AndFilters;
}

module.exports = createAndFilters;

},{}],9:[function(require,module,exports){
function createBooleanFilters(execlib,Filter,filterFactory){
  'use strict';
  var lib = execlib.lib;

  function BooleanFilters(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.filters = [];
    if(!(filterdescriptor && lib.isArray(filterdescriptor.filters))){
      throw "No filters array in filterdescriptor";
    }
    filterdescriptor.filters.forEach(this.addFilter.bind(this));
  }
  lib.inherit(BooleanFilters,Filter);
  BooleanFilters.prototype.destroy = function(){
    lib.arryDestroyAll(this.filters);
    this.filters = null;
    Filter.prototype.destroy.call(this);
  };
  BooleanFilters.prototype.addFilter = function(filterdescriptor){
    this.filters.push(filterFactory.createFromDescriptor(filterdescriptor));
  };
  function isFilterOk(datahash,filter){
    var ret = filter.isOK(datahash);
    return ret;
  }
  BooleanFilters.prototype.isOK = function(datahash){
    var ifok = isFilterOk.bind(null,datahash);
    return this.filters[this.arrayOperation](ifok);
  };
  return BooleanFilters;
}

module.exports = createBooleanFilters;

},{}],10:[function(require,module,exports){
function createFilter(execlib){
  'use strict';
  function Filter(filterdescriptor){
    this.__descriptor = filterdescriptor;
  }
  Filter.prototype.destroy = function(){
    this.__descriptor = null;
  };
  Filter.prototype.isOK = function(datahash){
    throw "Generic filter does not implement isOK";
  };
  Filter.prototype.descriptor = function(){
    return this.__descriptor;
  };
  return Filter;
}

module.exports = createFilter;

},{}],11:[function(require,module,exports){
function createEQFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function EQFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(EQFilter,FieldFilter);
  EQFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue===this.fieldvalue;
  };
  return EQFilter;
}

module.exports = createEQFilter;

},{}],12:[function(require,module,exports){
function createExistsFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function ExistsFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(ExistsFilter,FieldFilter);
  ExistsFilter.prototype.isFieldOK = function(fieldvalue){
    return (!(fieldvalue===null || typeof fieldvalue === 'undefined'));
  };
  return ExistsFilter;
}

module.exports = createExistsFilter;

},{}],13:[function(require,module,exports){
function createFilterFactory(execlib){
  'use strict';
  var lib = execlib.lib,
    Filter = require('./creator')(execlib),
    AllPass = require('./allpasscreator')(execlib,Filter);

  function Factory(){
    lib.Map.call(this);
  }
  lib.inherit(Factory,lib.Map);
  Factory.prototype.createFromDescriptor = function(filterdescriptor){
    if(!filterdescriptor){
      return new AllPass;
    }
    var op = filterdescriptor.op;
    if(!op){
      return new AllPass;
    }
    var ctor = this.get(op);
    if(!ctor){
      console.log('No Filter factory for operator "'+op+'"');
      return null;
    }
    return new ctor(filterdescriptor);
  };

  var factory = new Factory,
    HashFilter = require('./hashfiltercreator')(execlib,Filter),
    NotFilter = require('./notfiltercreator')(execlib,Filter,factory),
    BooleanFilters = require('./booleanfilterscreator')(execlib,Filter,factory),
    AndFilters = require('./andfilterscreator')(execlib,BooleanFilters),
    OrFilters = require('./orfilterscreator')(execlib,BooleanFilters),
    FieldFilter = require('./fieldfiltercreator')(execlib,Filter),
    ExistsFilter = require('./existsfiltercreator')(execlib,FieldFilter),
    NotExistsFilter = require('./notexistsfiltercreator')(execlib,FieldFilter),
    EQFilter = require('./eqfiltercreator')(execlib,FieldFilter),
    GTFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    GTEFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    LTFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    LTEFilter = require('./gtfiltercreator')(execlib,FieldFilter);

  factory.add('hash',HashFilter);
  factory.add('not',NotFilter);
  factory.add('and',AndFilters);
  factory.add('or',OrFilters);
  factory.add('exists',ExistsFilter);
  factory.add('notexists',NotExistsFilter);
  factory.add('eq',EQFilter);
  factory.add('gt',GTFilter);
  factory.add('gte',GTEFilter);
  factory.add('lt',LTFilter);
  factory.add('lte',LTEFilter);
  return factory;
}

module.exports = createFilterFactory;

},{"./allpasscreator":7,"./andfilterscreator":8,"./booleanfilterscreator":9,"./creator":10,"./eqfiltercreator":11,"./existsfiltercreator":12,"./fieldfiltercreator":14,"./gtfiltercreator":15,"./hashfiltercreator":16,"./notexistsfiltercreator":17,"./notfiltercreator":18,"./orfilterscreator":19}],14:[function(require,module,exports){
function createFieldFilter(execlib,Filter){
  'use strict';
  var lib = execlib.lib;
  function FieldFilter(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.fieldname = filterdescriptor.field;
    if(!this.fieldname){
      throw "No fieldname in filterdescriptor";
    }
    this.fieldvalue = filterdescriptor.value;
  }
  lib.inherit(FieldFilter,Filter);
  FieldFilter.prototype.destroy = function(){
    this.fieldname = null;
    Filter.prototype.destroy.call(this);
  };
  FieldFilter.prototype.isOK = function(datahash){
    //makes no sense to test for presence of this.fieldname in datahash
    if('function' === typeof datahash.get){
      return this.isFieldOK(datahash.get(this.fieldname));
    }else{
      return this.isFieldOK(datahash[this.fieldname]);
    }
  };
  FieldFilter.prototype.isFieldOK = function(fieldvalue){
    throw "Generic FieldFilter does not implement isFieldOK";
  };
  return FieldFilter;
};

module.exports = createFieldFilter;

},{}],15:[function(require,module,exports){
function createGTFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function GTFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(GTFilter,FieldFilter);
  GTFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue>this.fieldvalue;
  };
  return GTFilter;
}

module.exports = createGTFilter;

},{}],16:[function(require,module,exports){
function createHashFilter(execlib,Filter){
  'use strict';
  var lib = execlib.lib;

  function HashFilter(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.hash = filterdescriptor.d;
  }
  lib.inherit(HashFilter,Filter);
  HashFilter.prototype.destroy = function(){
    this.hash = null;
  };
  HashFilter.prototype.isOK = function(record){
    return record.matches(this.hash);
  };
  return HashFilter;
}

module.exports = createHashFilter;


},{}],17:[function(require,module,exports){
function createNotExistsFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function NotExistsFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(NotExistsFilter,FieldFilter);
  NotExistsFilter.prototype.isFieldOK = function(fieldvalue){
    console.log(this.fieldname,'not exists ok?',fieldvalue);
    return fieldvalue===null || typeof fieldvalue === 'undefined';
  };
  return NotExistsFilter;
}

module.exports = createNotExistsFilter;


},{}],18:[function(require,module,exports){
function createNotFilter(execlib,Filter,factory){
  'use strict';
  var lib = execlib.lib;
  function NotFilter(filterdescriptor ){
    Filter.call(this,filterdescriptor );
    if(!(filterdescriptor && 'filter' in filterdescriptor)){
      throw "No filter field in filterdescriptor";
    }
    this.filter = factory.createFromDescriptor(filterdescriptor.filter);
  }
  lib.inherit(NotFilter,Filter);
  NotFilter.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    Filter.prototype.destroy.call(this);
  };
  NotFilter.prototype.isOK = function(datahash){
    return !(this.filter.isOK(datahash));
  };
  return NotFilter;
}

module.exports = createNotFilter;

},{}],19:[function(require,module,exports){
function createOrFilters(execlib,BooleanFilters){
  'use strict';
  var lib = execlib.lib;

  function OrFilters(filterdescriptor){
    BooleanFilters.call(this,filterdescriptor);
  }
  lib.inherit(OrFilters,BooleanFilters);
  OrFilters.prototype.arrayOperation = 'some';
  return OrFilters;
}

module.exports = createOrFilters;

},{}],20:[function(require,module,exports){
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
}

module.exports = createDataSuite;

},{"./codercreator":3,"./decodercreator":4,"./distributedmanagercreator":5,"./distributorcreator":6,"./filters/factorycreator":13,"./managercreator":21,"./objectcreator":22,"./query/basecreator":23,"./query/clonecreator":24,"./record":26,"./storage/basecreator":28,"./storage/clonecreator":29,"./storage/memorycreator":30,"./storage/nullcreator":31,"./utils":32}],21:[function(require,module,exports){
function createDataManager(execlib){
  'use strict';
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    DataSource = dataSuite.DataSource,
    filterFactory = dataSuite.filterFactory;
  function DataManager(storageinstance,filterdescriptor){
    DataSource.call(this);
    this.storage = storageinstance;
    this.filter = filterFactory.createFromDescriptor(filterdescriptor);
  }
  lib.inherit(DataManager,DataSource);
  DataManager.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    this.storage.destroy();
    this.storage = null;
  };
  DataManager.prototype.onStorageError = function(defer,reason){
    console.log('DataManager has no idea about what to do with',reason,'(onStorageError)');
    defer.reject(reason);
  };
  DataManager.prototype.doNativeCreate = function(defer,datahash){
    DataSource.prototype.create.call(this,datahash);
    defer.resolve(datahash);
  };
  DataManager.prototype.create = function(datahash){
    var d = lib.q.defer();
    this.storage.create(datahash).done(
      this.doNativeCreate.bind(this,d),
      this.onStorageError.bind(this,d)
    );
    return d.promise;
  };
  DataManager.prototype.onReadOne = function(defer,startreadrecord,datahash){
    var item = this.Coder.prototype.readOne(startreadrecord,datahash);
    if(defer){
      defer.notify(item);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.onReadDone = function(defer,startreadrecord){
    var item = this.Coder.prototype.endRead(startreadrecord);
    if(defer){
      defer.notify(item);
      defer.resolve(null);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.read = function(query,defer){
    var startreadrecord = this.Coder.prototype.startRead();
    if(defer){
      defer.notify(startreadrecord);
    }else{
      this.handleStreamItem(startreadrecord);
    }
    this.storage.read(query).done(
      this.onReadDone.bind(this,defer,startreadrecord),
      this.onStorageError.bind(this),
      this.onReadOne.bind(this,defer,startreadrecord)
    );
  };
  DataManager.prototype.doNativeUpdateExact = function(defer,ueobj){
    var item = this.Coder.prototype.updateExact(ueobj);
    if(item){
      this.handleStreamItem(item);
      defer.notify(item);
    }
  };
  DataManager.prototype.doNativeUpdate = function(defer,filter,datahash,res){
    if(res){
      var item = this.Coder.prototype.update(filter,datahash);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.update = function(filter,datahash,options){
    var d = lib.q.defer();
    this.storage.update(filter,datahash,options).done(
      this.doNativeUpdate.bind(this,d,filter,datahash),
      this.onStorageError.bind(this),
      this.doNativeUpdateExact.bind(this,d)
    );
    return d.promise;
  };
  DataManager.prototype.doNativeDelete = function(defer,filter,res){
    if(res){
      var item = this.Coder.prototype.delete(filter);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.delete = function(filter){
    var d = lib.q.defer();
    this.storage.delete(filter).done(
      this.doNativeDelete.bind(this,d,filter),
      this.onStorageError.bind(this)
    );
    return d.promise;
  };
  DataManager.prototype.updateByDescriptor = function(filterdescriptor,datahash){
    var f = filterFactory.createFromDescriptor(filterdescriptor),
        d = lib.q.defer();
    this.update(f,datahash).done(function(res){
      d.resolve(res);
      f.destroy();
    },d.reject.bind(d));
    return d.promise;
  };
  DataManager.prototype.stateStreamFilterForRecord = function(record){
    return this.storage.__record.stateStreamFilterForRecord(this,record);
  };
  return DataManager;
}

module.exports = createDataManager;

},{}],22:[function(require,module,exports){
function createDataObject(execlib){
  'use strict';
  var lib = execlib.lib;
  function DataObject(prophash){
    Object.getOwnPropertyNames(prophash).forEach(this._hashToField.bind(this,prophash));
  }
  DataObject.prototype._hashToField = function(hash,fieldname){
    this.set(fieldname,hash[fieldname]);
  };
  DataObject.prototype._fieldToHash = function(hash,fieldname){
    var val = this.get(fieldname), und;
    if(val!==und){
      hash[fieldname] = val;
    }
  };
  function undefize(o,name){
    o.set(name,void 0);
  }
  DataObject.prototype.destroy = function(){
    var opns = Object.getOwnPropertyNames(this);
    opns.forEach(undefize.bind(null,this));
    /*
    console.trace();
    console.log(this,'destroyed');
    */
  };
  DataObject.prototype.toHash = function(fields){
    var result = {};
    fields.forEach(this._fieldToHash.bind(this,result));
    return result;
  };
  DataObject.prototype.clone = function(){
    return this.toHash(Object.getOwnPropertyNames(this));
  };
  function equalator(o1,o2,propname){
    return o1[propname] === o2[propname];
  }
  function compareObjects(o1,o2){
    var o1pns = Object.getOwnPropertyNames(o1),
        o2pns = Object.getOwnPropertyNames(o2);
    if(o1pns.length!==o2pns.length){
      return false;
    }
    if(o1pns.length<1){
      return true;
    }
    return o1pns.every(equalator.bind(null,o1,o2));
  }
  DataObject.prototype.matchesField = function(datahash,fieldname){
    var d = datahash[fieldname],
        f = this.get(fieldname),
        tod = typeof d,
        tof = typeof f;
    if(tod!==tof){
      return false;
    }
    if(tod === 'object'){
      if(d===null){
        return f===null;
      }else if(f===null){
        return d!==null;
      }
      if(d instanceof Array){
        if(!(f instanceof Array)){
          return false;
        }
        return compareArrays(d,f);
      }
      return compareObjects(d,f);
    }
    return datahash[fieldname] === this.get(fieldname);
  };
  DataObject.prototype.matches = function(datahash){
    var fns = this.fieldNames(); //overridable!
    return fns.every(this.matchesField.bind(this,datahash));
  };
  //the following methods are for override
  DataObject.prototype.fieldNames = function(){
    return Object.getOwnPropertyNames(this);
  };
  DataObject.prototype.hasFieldNamed = function(fieldname){
    return this.hasOwnProperty(fieldname);
  };
  DataObject.prototype.set = function(name,val){
    this[name] = val;
  };
  DataObject.prototype.get = function(name){
    return this[name];
  };
  return DataObject;
}

module.exports = createDataObject;

},{}],23:[function(require,module,exports){
function createQueryBase(execlib){
  'use strict';
  function QueryBase(recorddescriptor,visiblefields){
    /*
    console.trace();
    console.log('new QueryBase');
    */
    this.record = new (execlib.dataSuite.recordSuite.Record)(recorddescriptor,visiblefields);
  };
  QueryBase.prototype.destroy = function(){
    this.record.destroy();
    this.record = null;
  };
  QueryBase.prototype.filter = function(){
    throw "Generic QueryBase does not implement the filter method";
  };
  QueryBase.prototype.limit = function(){
    throw "Generic QueryBase does not implement the limit method";
  }
  QueryBase.prototype.offset = function(){
    throw "Generic QueryBase does not implement the offset method";
  };
  QueryBase.prototype.isEmpty = function(){
    return this.limit===0 || this.record.isEmpty();
  };
  QueryBase.prototype.isLimited = function(){
    var limit = this.limit();
    return ('number' === typeof limit) && limit>0 && limit<Infinity;
  };
  QueryBase.prototype.isOffset = function(){
    var offset = this.offset();
    return ('number' === typeof offset) && offset!==0;
  };
  QueryBase.prototype.isOK = function(datahash){
    var flt = this.filter();
    return flt ? flt.isOK(datahash) : true;
  };
  QueryBase.prototype.processUpdateExact = function(original,_new){
    var ook = this.isOK(original),
        _nok = this.isOK(_new),
        uf;
    if(ook){
      uf = this.record.updatingFilterDescriptorFor(original);
      if(_nok){
        //update
        return {
          o: 'u',
          d: {
            f: uf,
            d: _new
          }
        };
      }else{
        //deletion
        return {
          o: 'd',
          d: uf
        };
      }
    }else{
      if(_nok){
        //create
        return {
          o: 'c',
          d: _new
        };
      }else{
        //nothing
      }
    }
  };
  QueryBase.prototype.onStream = function(item){
    /*
    console.trace();
    console.log('Query onStream',item);
    */
    switch(item.o){
      case 'c':
        if(this.isOK(item.d)){
          return {
            o: 'c',
            d: this.record.filterHash(item.d)
          }
        }
        break;
      case 'ue':
        return this.processUpdateExact(item.d.o,item.d.n);
      default:
        return item;
    }
  };
  return QueryBase;
}

module.exports = createQueryBase;

},{}],24:[function(require,module,exports){
function createQueryClone(execlib,QueryBase){
  'use strict';
  var lib = execlib.lib;
  var QueryBase = execlib.dataSuite.QueryBase;

  function QueryClone(original){
    QueryBase.call(this,{fields:[]},[]);
    this.record.destroy();
    this.record = original.record;
    this.original = original;
    if(!this.original){
      throw new lib.Error('NO_ORIGINAL_PROVIDED_TO_QUERY_CLONE');
    }
    if('function' !== typeof this.original.filter){
      var e = new lib.Error('ORIGINAL_FOR_QUERY_CLONE_IS_NOT_A_QUERY');
      e.original = original;
      throw e;
    }
  };
  execlib.lib.inherit(QueryClone,QueryBase);
  QueryClone.prototype.destroy = function(){
    this.original = null;
    this.record = null;
    //QueryBase.prototype.destroy.call(this); //not this, it would destroy the original record
  };
  QueryClone.prototype.filter = function(){
    return this.original.filter();
  };
  QueryClone.prototype.limit = function(){
    return this.original.limit();
  }
  QueryClone.prototype.offset = function(){
    return this.original.offset();
  };
  return QueryClone;
}

module.exports = createQueryClone;

},{}],25:[function(require,module,exports){
function createRecord(execlib){
  'use strict';
  var lib = execlib.lib;

  function DefaultHandler(desc){
    this.proc = null;
    if(lib.isString(desc) && desc.length>4 && desc.indexOf('{{')===0 && desc.lastIndexOf('}}')===desc.length-2){
      this.proc = function(){
      };
    }
    this._value = desc;
    if('undefined' === typeof this._value){
      this._value = null;
    }
  }
  DefaultHandler.prototype.destroy = function(){
    this.proc = null;
    this._value = null;
  };
  DefaultHandler.prototype.value = function(){
    if(this.proc){
      return this.proc();
    }
    return this._value;
  };

  function Field(prophash){
    this.name = prophash.name;
    if(!this.name){
      throw "Field needs a name";
    }
    this.value = prophash.value;
    this.default = new DefaultHandler(prophash.default);
  }
  Field.prototype.destroy = function(){
    this.default.destroy();
    this.default = null;
    this.value = null;
    this.name = null;
  };
  Field.prototype.valueFor = function(val){
    var und;
    if(val===und){
      return this.default.value();
    }
    //TODO: validate
    return val;
  };

  function Record(prophash,visiblefields){
    if(!(prophash && prophash.fields)){
      console.trace();
      throw "Record needs the fields array in its property hash";
    }
    this.primaryKey = prophash.primaryKey;
    this.objCtor = prophash.objCtor || execlib.dataSuite.DataObject;
    this.fields = [];
    this.fieldsByName = new lib.Map();
    prophash.fields.forEach(this.addField.bind(this,visiblefields));
  }
  Record.prototype.destroy = function(){
    this.fieldsByName.destroy();
    this.fieldsByName = null;
    lib.arryDestroyAll(this.fields);
    this.fields = null;
    this.objCtor = null;
    this.primaryKey = null;
  };
  Record.prototype.isEmpty = function(){
    return this.fields.length<1;
  };
  Record.prototype.addField = function(visiblefields,fielddesc){
    if(visiblefields && visiblefields.indexOf(fielddesc.name)<0){
      return;
    }
    var field = new Field(fielddesc);
    this.fields.push(field);
    this.fieldsByName.add(field.name,field);
  };
  Record.prototype.filterHash = function(obj){
    var prophash = {};
    this.fields.forEach(function(field){
      prophash[field.name] = field.valueFor(obj[field.name]);
    });
    return prophash;
  };
  Record.prototype.filterObject = function(obj){
    return new(this.objCtor)(this.filterHash(obj));
  };
  Record.prototype.filterStateStream = function(item){
    if(item.o==='u' && item.p && item.p.length===1){
      var f = this.fieldsByName.get(item.p[0]);
      if(f){
        var ret = {};
        ret[f.name] = f.valueFor(item.d[0]);
        return ret;
      }
    }
  };
  Record.prototype.stateStreamFilterForRecord = function(storage,record){
    return new StateStreamFilter(storage,record,this);
  };
  Record.prototype.updatingFilterDescriptorFor = function(datahash){
    if(this.primaryKey){
      if(lib.isArray(this.primaryKey)){
        var ret = {op: 'and', filters : this.primaryKey.map(function(pkfield){
          return {
            op: 'eq', field: pkfield, value:datahash[pkfield]
          };
        })};
      }else{
        return {op:'eq',field:this.primaryKey,value:datahash[this.primaryKey]};
      }
    }else{
      return {op:'hash',d:this.filterObject(record)};
    }
  };
  Record.prototype.defaultFor = function(fieldname){
    var f = this.fieldsByName.get(fieldname);
    if(f){
      return f.valueFor();
    }else{
      return null;
    }
  };

  function StateStreamFilter(manager,recordinstance,record){
    this.manager = manager;
    this.recordinstance = recordinstance;
    this.record = record;
  }
  StateStreamFilter.prototype.destroy = function(){
    this.record = null;
    this.recordinstance = null;
    this.manager = null;
  };
  StateStreamFilter.prototype.onStream = function(item){
    var val = this.record.filterStateStream(item);
    if(val){
      this.manager.updateByDescriptor(this.record.updatingFilterDescriptorFor(this.recordinstance),val);
    }
  };
  return Record;
}

module.exports = createRecord;

},{}],26:[function(require,module,exports){
function createSuite(execlib){
  'use strict';

  var suite = {};
  require('./utils')(execlib,suite);

  suite.Record = require('./creator')(execlib);
  
  return suite;
};

module.exports = createSuite;

},{"./creator":25,"./utils":27}],27:[function(require,module,exports){
function createRecordUtils(execlib,suite){
  'use strict';
  var lib = execlib.lib;
  function selectFieldIfDuplicate(targetfieldname,foundobj,fieldnames,hash){
    var targetfieldvalue = hash[targetfieldname];
    if(targetfieldvalue in fieldnames){
      foundobj.found = hash[namefieldname];
      return true;
    }
    fieldnames[targetfieldvalue] = true;
  }

  function duplicateFieldValueInArrayOfHashes(fieldname,fieldnames,arrayofhashes){
    var foundobj = {},
      fieldChecker = selectFieldIfDuplicate.bind(fieldname,foundobj,fieldnames);
    for(var i=2; i<arguments.length; i++){
      console.log('checking',arguments[i]);
      arguments[i].some(fieldChecker);
      if(foundobj.found){
        return foundobj.found;
      }
    }
  }

  function checkIfInvalidRd(fieldnames,rd){
    if(!(rd && 'object' === typeof rd)){
      return "not an object";
    }
    if(!rd.fields){
      return "has no fields";
    }

  }

  function copyExceptFields(obj,item,itemname){
    if(itemname!=='fields'){
      obj[itemname] = item;
    }
  }
  function inherit(rd1,rd2){//rd <=> recorddescriptor
    var result = {fields:[]}, fn={};
    for(var i=0; i<arguments.length; i++){
      var rd = arguments[i], 
        invalid = checkIfInvalidRd(fn,rd);
      if(invalid){
        continue;
        //throw Error((rd ? JSON.stringify(rd) : rd) + " is not a valid record descriptor: "+invalid);
      }
      lib.traverse(rd,copyExceptFields.bind(null,result));
      result.fields.push.apply(result.fields,rd.fields);
    }
    return result;
  }

  function pushIfNotInLookupArray(lookuparry,destarry,item){
    if(lookuparry.indexOf(item)<0){
      destarry.push(item);
    }
  }
  function copyAndAppendNewElements(a1,a2){
    var ret = a1.slice();
    if(lib.isArray(a2)){
      a2.forEach(pushIfNotInLookupArray.bind(null,a1,ret));
    }
    return ret;
  }
  suite.copyAndAppendNewElements = copyAndAppendNewElements;

  function sinkInheritProcCreator(classname,originalUIP){//originalUIP <=> original User inheritance proc
    //classname not used, but may be useful for error reporting...
    return function(childCtor,methodDescriptors,visiblefieldsarray){
      originalUIP.call(this,childCtor,methodDescriptors);
      childCtor.prototype.visibleFields = copyAndAppendNewElements(this.prototype.visibleFields,visiblefieldsarray);
      childCtor.inherit = this.inherit;
      //console.log('after inherit',childCtor.prototype.visibleFields,'out of parent',this.prototype.visibleFields,'and',visiblefieldsarray);
    };
  }

  function copierWOFields(dest,item,itemname){
    if(itemname==='fields'){
      return;
    }
    dest[itemname] = item;
  }
  function nameFinder(findobj,name,item){
    if(item && item.name===name){
      findobj.result = item;
      return true;
    }
  }
  function getNamedItem(arry,name){
    var findobj={result:null};
    arry.some(nameFinder.bind(null,findobj,name));
    return findobj.result;
  };
  function namedSetter(setitem,item,itemindex,arry){
    if(item && item.name===setitem.name){
      arry[itemindex] = setitem;
      return true;
    }
  }
  function setNamedItem(arry,item){
    if(!item){
      return;
    }
    if(!arry.some(namedSetter.bind(null,item))){
      arry.push(item);
    };
  };
  function copyNamedItems(src,dest,fieldnamesarry){
    if(!(lib.isArray(src) && lib.isArray(dest))){
      return;
    }
    fieldnamesarry.forEach(function(fn){
      var item = getNamedItem(src,fn);
      if(item){
        setNamedItem(dest,item);
      }
    });
  }
  var sp = execlib.execSuite.registry.get('.');
  suite.duplicateFieldValueInArrayOfHashes = duplicateFieldValueInArrayOfHashes;
  suite.inherit = inherit;
  var sinkPreInheritProc = sinkInheritProcCreator('DataSink',sp.SinkMap.get('user').inherit); 
  function sinkInheritProc(childCtor,methodDescriptors,visiblefieldsarray,classStorageDescriptor){
    sinkPreInheritProc.call(this,childCtor,methodDescriptors,visiblefieldsarray);
    var recordDescriptor = {};
    lib.traverse(this.recordDescriptor,copierWOFields.bind(null,recordDescriptor));
    var fields = [];
    if(this.prototype.recordDescriptor){
      copyNamedItems(this.prototype.recordDescriptor.fields,fields,childCtor.prototype.visibleFields);
    }
    copyNamedItems(classStorageDescriptor.record.fields,fields,childCtor.prototype.visibleFields);
    recordDescriptor.fields = fields;
    childCtor.prototype.recordDescriptor = recordDescriptor;
  }
  suite.sinkInheritProc = sinkInheritProc;
}

module.exports = createRecordUtils;

},{}],28:[function(require,module,exports){
function createStorageBase(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    Record = dataSuite.recordSuite.Record;

  function StorageBaseEventing(){
    this.initTxnId = null;
    this.initiated = new lib.HookCollection();
    this.created = new lib.HookCollection();
    this.newRecord = new lib.HookCollection();
    this.updated = new lib.HookCollection();
    this.recordUpdated = new lib.HookCollection();
    this.deleted = new lib.HookCollection();
    this.recordDeleted = new lib.HookCollection();
  }
  StorageBaseEventing.prototype.destroy = function(){
    this.recordDeleted.destruct();
    this.recordDeleted = null;
    this.deleted.destruct();
    this.deleted = null;
    this.recordUpdated.destruct();
    this.recordUpdated = null;
    this.updated.destruct();
    this.updated = null;
    this.newRecord.destruct();
    this.newRecord = null;
    this.created.destruct();
    this.created = null;
    this.initiated.destruct();
    this.initiated = null;
    this.initTxnId = null;
  };
  StorageBaseEventing.prototype.beginInit = function(txnid){
    if(this.initTxnId){
      var e = new Error('E_DATASTORAGE_ALREADY_IN_INITIATION');
      e.txnInProgress = this.initTxnId;
      e.newTxn = txnid;
      throw e;
    }
    this.initTxnId = txnid;
  };
  StorageBaseEventing.prototype.endInit = function(txnid,storage){
    if(!this.initTxnId){
      var e = new Error('E_DATASTORAGE_NOT_IN_INITIATION');
      e.txnId = txnid;
      throw e;
    }
    if(this.initTxnId!==txnid){
      var e = new Error('E_DATASTORAGE_INITIATION_END_MISMATCH');
      e.txnInProgress = this.initTxnId;
      e.endTxnId = txnid;
      throw e;
    }
    this.initTxnId = null;
    this.initiated.fire(storage);
  };
  StorageBaseEventing.prototype.fireNewRecord = function(datahash){
    this.created.fire(datahash);
    if(!this.initTxnId){
      this.newRecord.fire(datahash);
    }
  };
  StorageBaseEventing.prototype.fireUpdated = function(filter,datahash,updateresult){
    if(updateresult.updated || updateresult.upserted){
      this.updated.fire(filter,datahash,updateresult);
    }
  };
  StorageBaseEventing.prototype.fireDeleted = function(filter,deletecount){
    if(deletecount){
      this.deleted.fire(filter,deletecount);
    }
  };

  function StorageBase(storagedescriptor){
    if(!(storagedescriptor && storagedescriptor.record)){
      console.trace();
      console.log("No storagedescriptor.record!");
    }
    this.__record = new Record(storagedescriptor.record);
    this.events = storagedescriptor.events ? new StorageBaseEventing : null;
  };
  StorageBase.prototype.destroy = function(){
    if(this.events){
      this.events.destroy();
    }
    this.events = null;
    this.__record.destroy();
    this.__record = null;
  };
  StorageBase.prototype.create = function(datahash){
    var d = q.defer();
    lib.runNext(this.doCreate.bind(this,this.__record.filterObject(datahash),d));
    if(this.events){
      d.promise.then(this.events.fireNewRecord.bind(this.events));
    }
    return d.promise;
  };
  StorageBase.prototype.read = function(query){
    var d = q.defer();
    if(query.isEmpty()){
      d.resolve(null);
    }else{
      lib.runNext(this.doRead.bind(this,query,d));
    }
    return d.promise;
  };
  StorageBase.prototype.update = function(filter,datahash,options){
    //console.log('StorageBase update',filter,datahash);
    var d = q.defer();
    lib.runNext(this.doUpdate.bind(this,filter,datahash,options,d));
    if(this.events){
      d.promise.then(this.events.fireUpdated.bind(this.events,filter,datahash));
    }
    return d.promise;
  };
  StorageBase.prototype.beginInit = function(txnid){
    if(this.events){
      this.events.beginInit(txnid);
    }
    this.delete(dataSuite.filterFactory.createFromDescriptor()); //delete all
  };
  StorageBase.prototype.endInit = function(txnid){
    if(this.events){
      this.events.endInit(txnid,this);
    }
  };
  StorageBase.prototype.delete = function(filter){
    //console.log('StorageBase delete',filter);
    var d = q.defer();
    lib.runNext(this.doDelete.bind(this,filter,d));
    if(this.events){
      d.promise.then(this.events.fireDeleted.bind(this.events,filter));
    }
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;

},{}],29:[function(require,module,exports){
function createCloneStorage(execlib){
  'use strict';
  var dataSuite = execlib.dataSuite,
      StorageBase = dataSuite.StorageBase;
  function CloneStorage(storagedescriptor){
    StorageBase.call(this,storagedescriptor);
    this.original = options.original;
    this.record = this.original.record;
    if(!(this.original instanceof StorageBase)){
      throw "CloneStorage cannot clone a non-StorageBase instance";
    }
  }
  execlib.lib.inherit(CloneStorage,StorageBase);
  CloneStorage.prototype.destroy = function(){
    this.original = null;
    StorageBase.prototype.destroy.call(this);
  };
  CloneStorage.prototype.doCreate = function(datahash,defer){
    this.original.doCreate(datahash,defer);
  };
  CloneStorage.prototype.doRead = function(query,defer){
    console.log('CloneStorage',this.original,query);
    this.original.doRead(datahash,defer);
  };
  return CloneStorage;
}

module.exports = createCloneStorage;

},{}],30:[function(require,module,exports){
function createMemoryStorage(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      StorageBase = dataSuite.StorageBase;

  function MemoryStorage(storagedescriptor,data){
    StorageBase.call(this,storagedescriptor);
    this.data = data || [];
  }
  execlib.lib.inherit(MemoryStorage,StorageBase);
  MemoryStorage.prototype.destroy = function(){
    this.data = null;
    StorageBase.prototype.destroy.call(this);
  };
  MemoryStorage.prototype.doCreate = function(record,defer){
    try{
    var mpk = this.__record.primaryKey;
    if (mpk) {
      if (lib.isArray(mpk)) {
        var violation = this.recordViolatesComplexPrimaryKey(record);
        if (violation) {
          defer.reject(violation);
          return;
        }
      } else {
        var violation = this.recordViolatesSimplePrimaryKey(record);
        if (violation) {
          defer.reject(violation);
          return;
        }
      }
    }
    this.data.push(record);
    defer.resolve(record.clone());
    }
    catch(e){
      console.error(e.stack);
      console.error(e);
    }
  };
  function processRead(query,defer,item){
    if(query.isOK(item)){
      //defer.notify(item.toHash(query.fields()));
      defer.notify(item);
    }
  }
  MemoryStorage.prototype.doRead = function(query,defer){
    if(!(query.isLimited()||query.isOffset())){
      this.data.forEach(processRead.bind(null,query,defer));
    }else{
      var start = query.offset, end=Math.min(start+query.limit,this.data.length);
      for(var i=start; i<end; i++){
        processRead(query,defer,this.__record.filterHash(this.data[i]));
      }
    }
    defer.resolve(null);
  };
  MemoryStorage.prototype.updateFrom = function(countobj,record,updateitem,updateitemname){
    if(record.hasFieldNamed(updateitemname)){
      if(countobj.count<1){
        countobj.original = record.clone();
        //console.log('Original set',countobj.original);
      }
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  MemoryStorage.prototype.onUpsertSucceeded = function(defer,createdrecord){
    defer.resolve({upserted:1});
  };
  MemoryStorage.prototype.processUpsert = function(defer,countobj,filter,datahash,options,record){
    var d = q.defer();
    this.doCreate(record,d);
    d.done(
      this.onUpsertSucceeded.bind(this,defer),
      defer.reject.bind(defer)
    );
  };
  MemoryStorage.prototype.processUpdate = function(defer,countobj,filter,datahash,options,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0,original:null};
      lib.traverse(datahash,this.updateFrom.bind(this,updatecountobj,record));
      if(updatecountobj.count){
        if(!updatecountobj.original){
          throw "No original";
        }
        if(this.events){
          this.events.recordUpdated.fire(record.clone(),updatecountobj.original);
        }
        defer.notify({o:updatecountobj.original,n:record.clone()});
        countobj.count++;
      }
    }
  }
  MemoryStorage.prototype.doUpdate = function(filter,datahash,options,defer){
    if(!this.data){
      return;
    }
    var countobj = {count:0};
    this.data.forEach(this.processUpdate.bind(this,defer,countobj,filter,datahash,options));
    if(countobj.count<1 && options && options.upsert){
      this.processUpsert(filter,datahash,options,defer);
    }else{
      defer.resolve({updated:countobj.count});
    }
  };
  MemoryStorage.prototype.processDelete = function(todelete,defer,filter,record,recordindex,records){
    if(filter.isOK(record)){
      var rc = record.clone();
      if(this.events){
        this.events.recordDeleted.fire(rc);
      }
      defer.notify(rc);
      record.destroy();
      todelete.unshift(recordindex);
    }/*else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }*/
  }
  MemoryStorage.prototype.doDelete = function(filter,defer){
    var todelete = [], data = this.data;
    this.data.forEach(this.processDelete.bind(this,todelete,defer,filter));
    todelete.forEach(function(di){data.splice(di,1);});
    defer.resolve(todelete.length);
  };
  MemoryStorage.prototype.recordViolatesSimplePrimaryKey = function (rec) {
    var spk = this.__record.primaryKey, spv = rec.get(spk), affectedrecord;
    if (this.data.some(function (record) {
      if (record.get(spk) === spv) {
        affectedrecord = record;
        return true;
      }
    })) {
      var e = new lib.Error('PRIMARY_KEY_VIOLATION');
      e.affectedrecord = affectedrecord;
      return e;
    }
  };
  MemoryStorage.prototype.recordViolatesComplexPrimaryKey = function (rec) {
    var pknames = this.__record.primaryKey,
      missingpkvals = [],
      pkvals = pknames.map(function (pkn) {
        var ret = rec.get(pkn);
        if (ret === null) {
          missingpkvals.push(pkn);
        }
        return ret;
      }),
      e,
      pkcount = pknames.length,
      affectedrecord;
    if (missingpkvals.length){
      e = new lib.Error('MISSING_PRIMARY_KEY_SEGMENT','Complex primary key violated at certain segments');
      e.missing = missingpkvals;
      return e;
    }
    if (this.data.some(function (record) {
      var matchcnt = 0;
      pknames.forEach(function (pkn, pknind) {
        if (record.get(pkn) === pkvals[pknind]){
          matchcnt++;
        }
      });
      if (matchcnt===pkcount) {
        affectedrecord = record;
        return true;
      }
    })) {
      e = new lib.Error('PRIMARY_KEY_VIOLATION');
      e.affectedrecord = affectedrecord;
      return e;
    }
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;

},{}],31:[function(require,module,exports){
function createNullStorage(execlib){
  'use strict';
  var dataSuite = execlib.dataSuite,
      StorageBase = dataSuite.StorageBase;
  function NullStorage(recorddescriptor){
    StorageBase.call(this,recorddescriptor);
  }
  execlib.lib.inherit(NullStorage,StorageBase);
  NullStorage.prototype.doCreate = function(datahash,defer){
    defer.resolve(datahash);
  };
  NullStorage.prototype.doRead = function(query,defer){
    defer.resolve(null);
  };
  NullStorage.prototype.doUpdate = function(filter,datahash,defer){
    defer.resolve(0);
  };
  NullStorage.prototype.doDelete = function(filter,defer){
    defer.resolve(0);
  };
  return NullStorage;
}

module.exports = createNullStorage;

},{}],32:[function(require,module,exports){
function createDataUtils(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      recordSuite = dataSuite.recordSuite;

  function copyExceptRecord(dest,item,itemname){
    if(itemname!=='record'){
      dest[itemname] = item;
    }
  }
  function inherit(d1,d2){
    var result = {}, cp = copyExceptRecord.bind(null,result);
    lib.traverse(d1,cp);
    lib.traverse(d2,cp);
    result.record = recordSuite.inherit(d1.record,d2.record);
    return result;
  }

  dataSuite.inherit = inherit;
}

module.exports = createDataUtils;

},{}],33:[function(require,module,exports){
module.exports = {
  create: [{
    title: 'Data hash',
    type: 'object'
  }],
  update: [{
    title: 'Filter descriptor',
    type: 'object'
  },{
    title: 'Operation descriptor',
    type: 'object'
  },{
    title: 'Options object',
    type: 'object'
  }],
  delete: [{
    title: 'Filter descriptor',
    type: 'object'
  }]
};

},{}],34:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],35:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33}],36:[function(require,module,exports){
function sinkMapCreator(execlib){
  'use strict';
  var sinkmap = new (execlib.lib.Map);
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib));
  sinkmap.add('writer',require('./sinks/writersinkcreator')(execlib));
  
  return sinkmap;
}

module.exports = sinkMapCreator;

},{"./sinks/servicesinkcreator":37,"./sinks/usersinkcreator":38,"./sinks/writersinkcreator":39}],37:[function(require,module,exports){
function createServiceSink(execlib){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      _ServiceSink = execSuite.registry.get('.').SinkMap.get('service'),
      recordSuite = execlib.dataSuite.recordSuite;

  function ServiceSink(prophash,client){
    _ServiceSink.call(this,prophash,client);
  }
  _ServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.inherit = recordSuite.sinkInheritProc;
  ServiceSink.prototype.visibleFields = [];
  return ServiceSink;
}

module.exports = createServiceSink;

},{"../methoddescriptors/serviceuser":33}],38:[function(require,module,exports){
function createUserSink(execlib){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ServiceSink = execSuite.registry.get('.').SinkMap.get('user'),
      recordSuite = execlib.dataSuite.recordSuite;

  function UserSink(prophash,client){
    ServiceSink.call(this,prophash,client);
  }
  ServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  UserSink.inherit = recordSuite.sinkInheritProc;
  UserSink.prototype.visibleFields = [];
  return UserSink;
}

module.exports = createUserSink;

},{"../methoddescriptors/user":34}],39:[function(require,module,exports){
function createWriterSink(execlib){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ServiceSink = execSuite.registry.get('.').SinkMap.get('user'),
      recordSuite = execlib.dataSuite.recordSuite;

  function WriterSink(prophash,client){
    ServiceSink.call(this,prophash,client);
  }
  ServiceSink.inherit(WriterSink,require('../methoddescriptors/writeruser'));
  WriterSink.inherit = recordSuite.sinkInheritProc;
  WriterSink.prototype.visibleFields = [];
  return WriterSink;
}

module.exports = createWriterSink;

},{"../methoddescriptors/writeruser":35}],40:[function(require,module,exports){
function createFollowDataTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      MultiDestroyableTask = execSuite.MultiDestroyableTask,
      dataSuite = execlib.dataSuite,
      DataDecoder = dataSuite.DataDecoder;

  function ChildSinkStorage(sink){
    this.sink = sink;
  }
  ChildSinkStorage.prototype.beginInit = lib.dummyFunc;
  ChildSinkStorage.prototype.endInit = lib.dummyFunc;
  ChildSinkStorage.prototype.create = function(datahash){
    return this.sink.call('create',datahash);
  };
  ChildSinkStorage.prototype.update = function(filter,datahash,options){
    return this.sink.call('update',filter.__descriptor,datahash,options);
  };
  ChildSinkStorage.prototype.delete = function(filter){
    return this.sink.call('delete',filter.__descriptor);
  };

  function FollowDataTask(prophash){
    MultiDestroyableTask.call(this,prophash,['sink','childsink']);
    this.storage = new ChildSinkStorage(prophash.childsink);
    this.sink = prophash.sink;
  }
  lib.inherit(FollowDataTask,MultiDestroyableTask);
  FollowDataTask.prototype.__cleanUp = function(){
    this.storage.destroy();
    this.storage = null;
    if(this.sink.destroyed){ //it's still alive
      this.sink.consumeChannel('d',lib.dummyFunc);
    }
    this.sink = null;
    MultiDestroyableTask.prototype.__cleanUp.call(this);
  };
  FollowDataTask.prototype.go = function(){
    this.sink.consumeChannel('d',new DataDecoder(this.storage));
  };
  FollowDataTask.prototype.compulsoryConstructionProperties = ['sink','childsink'];

  return FollowDataTask;
}

module.exports = createFollowDataTask;

},{}],41:[function(require,module,exports){
function createMaterializeDataTask(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      execSuite = execlib.execSuite,
      SinkTask = execSuite.SinkTask,
      dataSuite = execlib.dataSuite,
      DataDecoder = dataSuite.DataDecoder,
      MemoryStorage = dataSuite.MemoryStorage;

  function MaterializeDataTask(prophash){
    SinkTask.call(this,prophash);
    this.storage = null;
    this.sink = prophash.sink;
    this.data = prophash.data;
    this.onInitiated = prophash.onInitiated;
    this.onRecordCreation = prophash.onRecordCreation;
    this.onNewRecord = prophash.onNewRecord;
    this.onUpdate = prophash.onUpdate;
    this.onRecordUpdate = prophash.onRecordUpdate;
    this.onDelete = prophash.onDelete;
    this.onRecordDeletion = prophash.onRecordDeletion;
    this.initiatedListener = null;
    this.createdListener = null;
    this.newRecordListener = null;
    this.updatedListener = null;
    this.recordUpdatedListener = null;
    this.deletedListener = null;
    this.recordDeletedListener = null;
  }
  lib.inherit(MaterializeDataTask,SinkTask);
  MaterializeDataTask.prototype.__cleanUp = function(){
    if(this.recordDeletedListener){
      this.recordDeletedListener.destroy();
    }
    this.recordDeletedListener = null;
    if(this.deletedListener){
      this.deletedListener.destroy();
    }
    this.deletedListener = null;
    if(this.recordUpdatedListener){
      this.recordUpdatedListener.destroy();
    }
    this.recordUpdatedListener = null;
    if(this.updatedListener){
      this.updatedListener.destroy();
    }
    this.updatedListener = null;
    if(this.newRecordListener){
      this.newRecordListener.destroy();
    }
    this.newRecordListener = null;
    if(this.createdListener){
      this.createdListener.destroy();
    }
    this.createdListener = null;
    if(this.initiatedListener){
      this.initiatedListener.destroy();
    }
    this.initiatedListener = null;
    this.onRecordDeletion = null;
    this.onDelete = null;
    this.onRecordUpdate = null;
    this.onUpdate = null;
    this.onNewRecord = null;
    this.onRecordCreation = null;
    this.onInitiated = null;
    this.data = null;
    this.sink = null;
    if(this.storage){
      this.storage.destroy();
    }
    this.storage = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  MaterializeDataTask.prototype.go = function(){
    this.storage = new MemoryStorage({
      events: this.onInitiated || this.onRecordCreation || this.onNewRecord || this.onUpdate || this.onRecordUpdate || this.onDelete || this.onRecordDeletion,
      record: this.sink.recordDescriptor
    },this.data);
    if(this.onInitiated){
      this.initiatedListener = this.storage.events.initiated.attach(this.onInitiated);
    }
    if(this.onRecordCreation){
      this.createdListener = this.storage.events.created.attach(this.onRecordCreation);
    };
    if(this.onNewRecord){
      this.newRecordListener = this.storage.events.newRecord.attach(this.onNewRecord);
    }
    if(this.onUpdate){
      this.updatedListener = this.storage.events.updated.attach(this.onUpdate);
    }
    if(this.onRecordUpdate){
      this.recordUpdatedListener = this.storage.events.recordUpdated.attach(this.onRecordUpdate);
    }
    if(this.onDelete){
      this.deletedListener = this.storage.events.deleted.attach(this.onDelete);
    }
    if(this.onRecordDeletion){
      this.recordDeletedListener = this.storage.events.recordDeleted.attach(this.onRecordDeletion);
    }
    this.sink.consumeChannel('d',new DataDecoder(this.storage));
  };
  MaterializeDataTask.prototype.compulsoryConstructionProperties = ['data','sink'];
  return MaterializeDataTask;
}

module.exports = createMaterializeDataTask;

},{}],42:[function(require,module,exports){
function createReadFromSinkProc (execlib, prophash) {
  'use strict';
  var data = [],
    skipdestroy = false,
    error = null,
    sinkDestroyedListener = prophash.sink.destroyed.attach(onSinkDestroyed),
    lib = execlib.lib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  function finish () {
    if(sinkDestroyedListener) {
      sinkDestroyedListener.destroy();
    }
    sinkDestroyedListener = null;
    if (error) {
      if (prophash.errorcb) {
        prophash.errorcb(error);
      }
    } else {
      if (prophash.cb) {
        if (prophash.singleshot) {
          prophash.cb(data[0] || null);
        } else {
          prophash.cb(data);
        }
      }
    }
    error = null;
    skipdestroy = null;
    data = null;
    if (!skipdestroy) {
      prophash.sink.destroy();
    }
    prophash = null;
  }

  function onSinkDestroyed () {
    skipdestroy = true;
    error = new lib.Error('DATA_CORRUPTION_ON_CONNECTION_BREAKDOWN', 'Data connection broke during data read');
    finish();
  }

  function onRecord (datahash) {
    if (prophash.singleshot) {
      if (!data.length) {
        data.push(datahash);
      }
      return;
    }
    data.push(datahash);
  }

  taskRegistry.run('materializeData', {
    sink: prophash.sink,
    data: data,
    onRecordCreation: onRecord,
    onInitiated: finish
  });
}

module.exports = createReadFromSinkProc;

},{}],43:[function(require,module,exports){
function createReadFromDataSink(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    SinkTask = execSuite.SinkTask,
    readFromSinkProc = require('./proc/readFromSink').bind(null, execlib);

  function ReadFromDataSink(prophash) {
    SinkTask.call(this,prophash);
    this.sink = prophash.sink;
    this.filter = prophash.filter;
    this.cb = prophash.cb;
    this.errorcb = prophash.errorcb;
    this.singleshot = prophash.singleshot;
  }
  lib.inherit(ReadFromDataSink, SinkTask);
  ReadFromDataSink.prototype.__cleanUp = function () {
    this.cb = null;
    this.filter = null;
    this.sink = null;
    SinkTask.prototype.__cleanUp.call(this);
  };
  ReadFromDataSink.prototype.go = function () {
    this.sink.subConnect('.', {name:'-', role: 'user', filter: this.filter}).done(
      this.onSuccess.bind(this),
      this.onFail.bind(this)
    );
  };
  ReadFromDataSink.prototype.onSuccess = function (sink) {
    if(!sink){
      lib.runNext(this.destroy.bind(this));
    }
    readFromSinkProc({
      sink: sink,
      cb: this.cb,
      errorcb: this.errorcb,
      singleshot: this.singleshot
    });
  };
  ReadFromDataSink.prototype.onFail = function (reason) {
    if (this.errorcb) {
      this.errorcb(reason);
    }
    lib.runNext(this.destroy.bind(this,reason));
  };
  ReadFromDataSink.prototype.compulsoryConstructionProperties = ['sink','cb'];

  return ReadFromDataSink;
}

module.exports = createReadFromDataSink;

},{"./proc/readFromSink":42}]},{},[1]);
