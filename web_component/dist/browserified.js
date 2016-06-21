(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
ALLEX.execSuite.registry.registerClientSide('allex_dataservice',require('./sinkmapcreator')(ALLEX));

},{"./sinkmapcreator":43}],2:[function(require,module,exports){
function createDataCoder(execlib){
  'use strict';
  var lib = execlib.lib,
      uid = lib.uid;

  function DataCoder(){
  }
  DataCoder.prototype.destroy = execlib.lib.dummyFunc;
  DataCoder.prototype.create = function(datahash){
    return ['c', datahash];
    /*
    return {
      o: 'c',
      d: datahash
    };
    */
  };
  DataCoder.prototype.startRead = function(){
    return ['rb', uid()];
    /*
    return {
      o: 'rb',
      d: uid()
    };
    */
  };
  DataCoder.prototype.readOne = function(startreadrecord,datahash){
    return ['r1', startreadrecord[1], datahash];
    /*
    return {
      o: 'r1',
      id: startreadrecord.d,
      d: datahash
    };
    */
  };
  DataCoder.prototype.endRead = function(startreadrecord){
    return ['re', startreadrecord[1]];
    /*
    return {
      o: 're',
      d: startreadrecord.d
    };
    */
  };
  DataCoder.prototype.read = function(arrayofhashes){
    return ['r', arrayofhashes];
    /*
    return {
      o: 'r',
      d: arrayofhashes
    };
    */
  };
  DataCoder.prototype.update = function(filter,datahash){
    return ['u', filter.descriptor(), datahash];
    /*
    return {
      o: 'u',
      f:filter.descriptor(),
      d:datahash
    };
    */
  };
  DataCoder.prototype.updateExact = function(updateexactobject){
    return ['ue', updateexactobject[0], updateexactobject[1]];
    /*
    if(!('o' in updateexactobject && 'n' in updateexactobject)){
      throw "Bad updateExact";
    }
    return {
      o: 'ue',
      d: updateexactobject
    };
    */
  };
  DataCoder.prototype.delete = function(filter){
    return ['d', filter.descriptor()];
    /*
    return {
      o: 'd',
      d: filter.descriptor()
    };
    */
  };
  return DataCoder;
}

module.exports = createDataCoder;

},{}],3:[function(require,module,exports){
(function (process){
function createDataDecoder(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory;

  function CommandGroup(name, arg_s) {
    this.name = name;
    this.arg_s_group = [arg_s];
  }
  CommandGroup.prototype.destroy = function () {
    this.arg_s_group = null;
    this.name = null;
  };
  CommandGroup.prototype.add = function (arg_s) {
    this.arg_s_group.push(arg_s);
  };
  CommandGroup.prototype.apply = function (decoder) {
    var m = decoder[this.name], as, ret;
    if (!lib.isFunction(m)) {
      return lib.q(false);
    }
    this.arg_s_group.forEach(function(a, aind, as) {
      if (lib.isArray(a)) {
        as[aind] = m.apply(decoder, a);
      } else {
        as[aind] = m.call(decoder, a);
      }
    });
    as = this.arg_s_group;
    this.arg_s_group = [];
    ret = lib.q.allSettled(as);
    ret.then(this.destroy.bind(this));
    return ret;
  };

  function Decoder(storable){
    this.storable = storable;
    this.queryID = null;
    this.working = false;
    this.deqer = this.deq.bind(this);
    this.errdeqer = this.deqFromError.bind(this);
    this.q = new lib.Fifo();
  }
  function destroyer (qi) {
    if (qi.destroy) {
      qi.destroy();
    }
  }
  Decoder.prototype.destroy = function(){
    var qi;
    if (this.q) {
      this.q.drain(destroyer);
      this.q.destroy();
    }
    this.q = null;
    this.errdeqer = null;
    this.deqer = null;
    this.working = null;
    this.queryID = null;
    this.storable = null;
  };
  Decoder.prototype.enq = function(command, arg_s) {
    var ce;
    if (!this.q) {
      return;
    }
    if (this.working) {
      //console.log('saving',Array.prototype.slice.call(arguments));
      var done = false,
        last = this.q.last(),
        lastc;
      if (last) {
        lastc = last.content;
      }
      if (lastc) { 
        if (lib.isArray(lastc)) {
          if (lastc[0] === command) {
            last.content = new CommandGroup(lastc[0], lastc[1]);
            last.content.add(arg_s);
            done = true;
          }
        } else {
          if (lastc.name === command) {
            lastc.add(arg_s);
            done = true;
          }
        }
      }
      if (!done) {
        this.q.push([command, arg_s]);
      }
    }else{
      this.working = true;
      //console.log('Decoder doing',command,'on',this.storable.__id,this.storable.data);
      //console.log('doing',command, args);
      if (lib.isString(command)) {
        if (lib.isArray(arg_s)) {
          this[command].apply(this, arg_s).then(this.deqer, this.errdeqer);
        } else {
          this[command].call(this, arg_s).then(this.deqer, this.errdeqer);
        }
      } else {
        command.apply(this).then(this.deqer, this.errdeqer);
        //console.log('group apply done');
      }
    }
  };
  Decoder.prototype.enqFromQ = function (p) {
    if (lib.isArray(p)) {
      this.enq(p[0], p[1]);
    } else {
      this.enq(p);
    }
  };
  Decoder.prototype.deq = function(){
    if (!this.q) {
      return;
    }
    this.working = false;
    this.q.pop(this.enqFromQ.bind(this));
  };
  Decoder.prototype.deqFromError = function (err) {
    console.error(process.pid, 'Data Decoeder error', err);
    this.deq();
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder', this.storable.__id,'got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item[0]){
      case 'i':
        this.enq('setID', item[1]);
        break;
      case 'rb':
        this.enq('beginRead', item[1]);
        break;
      case 're':
        this.enq('endRead', item[1]);
        break;
      case 'r1':
        this.enq('readOne', item[2]);
        break;
      case 'c':
        this.enq('create', item[1]);
        break;
      case 'ue':
        this.enq('updateExact', [item[1], item[2]]);
        break;
      case 'u':
        this.enq('update', [item[1], item[2]]);
        break;
      case 'd':
        this.enq('delete', item[1]);
        break;
    }
  };
  Decoder.prototype.setID = function (id) {
    this.queryID = id;
    return lib.q(true);
  };
  Decoder.prototype.beginRead = function(itemdata){
    return this.storable.beginInit(itemdata);
  };
  Decoder.prototype.endRead = function(itemdata){
    this.storable.endInit(itemdata);
    return lib.q(true);
  };
  Decoder.prototype.readOne = function(itemdata){
    return this.storable.create(itemdata);
  };
  Decoder.prototype.create = function(itemdata){
    return this.storable.create(itemdata);
  };
  Decoder.prototype.delete = function(itemdata){
    var f = filterFactory.createFromDescriptor(itemdata);
    if(!f){
      console.error('NO FILTER FOR',itemdata);
      return lib.q(true);
    }else{
      //console.log(this.storable,this.storable.delete.toString(),'will delete');
      return this.storable.delete(f);
    }
  };
  Decoder.prototype.updateExact = function(newitem, olditem){
    var f = filterFactory.createFromDescriptor({op:'hash',d:olditem});
    return this.storable.update(f,newitem);
  };
  Decoder.prototype.update = function(filter, datahash){
    var f = filterFactory.createFromDescriptor(filter);
    return this.storable.update(f,datahash);
  };
  return Decoder;
}

module.exports = createDataDecoder;

}).call(this,require('_process'))
},{"_process":46}],4:[function(require,module,exports){
function createDistributedDataManager(execlib){
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
    DataManager = dataSuite.DataManager,
    JobBase = qlib.JobBase;

  function DistributedDataManager(storageinstance,filterdescriptor){
    DataManager.call(this,storageinstance,filterdescriptor);
    this.distributor = new StreamDistributor();
    this.setSink(this.distributor);
  }
  lib.inherit(DistributedDataManager,DataManager);
  DistributedDataManager.prototype.destroy = function(){
    if (this.distributor) {
      this.distributor.destroy();
    }
    this.distributor = null;
    DataManager.prototype.destroy.call(this);
  };
  return DistributedDataManager;
}

module.exports = createDistributedDataManager;

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
    filter = null;
    datahash = null;
    return ret;
  }
  BooleanFilters.prototype.isOK = function(datahash){
    var ifok = isFilterOk.bind(null,datahash);
    var ret = this.filters[this.arrayOperation](ifok);
    datahash = null;
    ifok = null;
    return ret;
  };
  return BooleanFilters;
}

module.exports = createBooleanFilters;

},{}],9:[function(require,module,exports){
function createContainsFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function ContainsFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(ContainsFilter,StringFieldFilter);
  ContainsFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)>=0);
  };
  return ContainsFilter;
}

module.exports = createContainsFilter;

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
function createEndsWithFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function EndsWithFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(EndsWithFilter,StringFieldFilter);
  EndsWithFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)===fieldvalue.length-this.fieldvalue.length);
  };
  return EndsWithFilter;
}

module.exports = createEndsWithFilter;

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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
    LTEFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    InFilter = require('./infiltercreator')(execlib,FieldFilter),
    StringFieldFilter = require('./stringfieldfiltercreator')(execlib,FieldFilter),
    StartsWithFilter = require('./startswithfiltercreator')(execlib,StringFieldFilter),
    EndsWithFilter = require('./endswithfiltercreator')(execlib,StringFieldFilter),
    ContainsFilter = require('./containsfiltercreator')(execlib,StringFieldFilter);

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
  factory.add('in',InFilter);
  factory.add('startswith',StartsWithFilter);
  factory.add('endswith',EndsWithFilter);
  factory.add('contains',ContainsFilter);

  Factory.prototype.extend = function (filtername, creatorfunc) {
    var filter = creatorfunc(execlib,{
      Filter: Filter,
      AllPassFilter: AllPass,
      BooleanFilters: BooleanFilters,
      FieldFilter: FieldFilter,
      StringFieldFilter: StringFieldFilter
    });
    if (filter) {
      this.replace(filtername, filter);
    } else {
      console.log('No filter produced for',filtername,'from',creatorfunc.toString());
    }
  };
  
  return factory;
}

module.exports = createFilterFactory;

},{"./allpasscreator":6,"./andfilterscreator":7,"./booleanfilterscreator":8,"./containsfiltercreator":9,"./creator":10,"./endswithfiltercreator":11,"./eqfiltercreator":12,"./existsfiltercreator":13,"./fieldfiltercreator":15,"./gtfiltercreator":16,"./hashfiltercreator":17,"./infiltercreator":18,"./notexistsfiltercreator":19,"./notfiltercreator":20,"./orfilterscreator":21,"./startswithfiltercreator":22,"./stringfieldfiltercreator":23}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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


},{}],18:[function(require,module,exports){
function createInFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function InFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(InFilter,FieldFilter);
  InFilter.prototype.isFieldOK = function(fieldvalue){
    if (!lib.isArray(this.fieldvalue)) {
      throw new lib.Error('value for "in" filter needs to be an array');
    }
    return this.fieldvalue.indexOf(fieldvalue) >= 0;
  };
  return InFilter;
}

module.exports = createInFilter;

},{}],19:[function(require,module,exports){
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


},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
function createStartsWithFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function StartsWithFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(StartsWithFilter,StringFieldFilter);
  StartsWithFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)===0);
  };
  return StartsWithFilter;
}

module.exports = createStartsWithFilter;

},{}],23:[function(require,module,exports){
function createStringFieldFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function StringFieldFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(StringFieldFilter,FieldFilter);
  StringFieldFilter.prototype.isFieldOK = function(fieldvalue){
    return lib.isString(fieldvalue);
  };
  return StringFieldFilter;
}

module.exports = createStringFieldFilter;

},{}],24:[function(require,module,exports){
function createDataSuite(execlib){
  'use strict';
  var execSuite = execlib.execSuite,
    dataSuite = {
      storageRegistry: new execSuite.RegistryBase(),
      recordSuite: require('./record')(execlib)
    };
    execlib.dataSuite = dataSuite;
    dataSuite.ObjectHive = require('./objectcreator')(execlib);
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
    dataSuite.SpawningDataManager = require('./spawningmanagercreator')(execlib);
    dataSuite.StorageBase = require('./storage/basecreator')(execlib);
    dataSuite.NullStorage = require('./storage/nullcreator')(execlib);
    dataSuite.CloneStorage = require('./storage/clonecreator')(execlib);
    var MemoryStorageBase = require('./storage/memorybasecreator')(execlib);
    dataSuite.MemoryStorageBase = MemoryStorageBase;
    dataSuite.AsyncMemoryStorageBase = require('./storage/asyncmemorystoragebasecreator')(execlib);
    dataSuite.MemoryStorage = require('./storage/memorycreator')(execlib, MemoryStorageBase);
    dataSuite.MemoryListStorage = require('./storage/memorylistcreator')(execlib, MemoryStorageBase);

    dataSuite.storageRegistry.register('memory', dataSuite.MemoryListStorage);
    dataSuite.storageRegistry.register('memorylist', dataSuite.MemoryListStorage);
}

module.exports = createDataSuite;

},{"./codercreator":2,"./decodercreator":3,"./distributedmanagercreator":4,"./distributorcreator":5,"./filters/factorycreator":14,"./managercreator":25,"./objectcreator":26,"./query/basecreator":27,"./query/clonecreator":28,"./record":30,"./spawningmanagercreator":32,"./storage/asyncmemorystoragebasecreator":33,"./storage/basecreator":34,"./storage/clonecreator":35,"./storage/memorybasecreator":36,"./storage/memorycreator":37,"./storage/memorylistcreator":38,"./storage/nullcreator":39,"./utils":40}],25:[function(require,module,exports){
(function (process){
function createDataManager(execlib){
  'use strict';
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    DataSource = dataSuite.DataSource,
    filterFactory = dataSuite.filterFactory;

  var __id = 0;
  function DataManager(storageinstance,filterdescriptor){
    this.id = process.pid + '_' + (++__id);
    DataSource.call(this);
    this.storage = storageinstance;
    this.filter = filterFactory.createFromDescriptor(filterdescriptor);
  }
  lib.inherit(DataManager,DataSource);
  DataManager.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    console.log('destroying storage');
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
  DataManager.prototype.create = function(datahash, defer){
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    this.storage.create(datahash).done(
      this.doNativeCreate.bind(this,defer),
      this.onStorageError.bind(this,defer)
    );
    return defer.promise;
  };
  DataManager.prototype.onReadOne = function(defer,startreadrecord,datahash){
    var item = this.Coder.prototype.readOne.call(this,startreadrecord,datahash);
    if(defer){
      defer.notify(item);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.onReadDone = function(defer,startreadrecord){
    var item = this.Coder.prototype.endRead.call(this,startreadrecord);
    if(defer){
      defer.notify(item);
      defer.resolve(null);
    }else{
      this.handleStreamItem(item);
    }
  };
  DataManager.prototype.read = function(query,defer){
    if (!this.storage) {
      if (defer) {
        defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      }
      return;
    }
    var startreadrecord = this.Coder.prototype.startRead.call(this);
    if(defer){
      defer.notify(startreadrecord);
    }else{
      this.handleStreamItem(startreadrecord);
    }
    this.storage.read(query).done(
      this.onReadDone.bind(this,defer,startreadrecord),
      this.onStorageError.bind(this, defer),
      this.onReadOne.bind(this,defer,startreadrecord)
    );
  };
  DataManager.prototype.doNativeUpdateExact = function(defer,ueobj){
    var item = this.Coder.prototype.updateExact.call(this,ueobj);
    if(item){
      this.handleStreamItem(item);
      defer.notify(item);
    }
  };
  DataManager.prototype.doNativeUpdate = function(defer,filter,datahash,res){
    if(res){
      var item = this.Coder.prototype.update.call(this,filter,datahash);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.update = function(filterdescriptor,datahash,options, defer){
    var f;
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return defer.promise;
    }
    this.storage.update(f,datahash,options).done(
      this.doNativeUpdate.bind(this,defer,f,datahash),
      this.onStorageError.bind(this, defer),
      this.doNativeUpdateExact.bind(this,defer)
    );
    return defer.promise;
  };
  DataManager.prototype.doNativeDelete = function(defer,filter,res){
    if(res){
      var item = this.Coder.prototype.delete.call(this,filter);
      if(item){
        this.handleStreamItem(item);
      }
    }
    defer.resolve(res);
  };
  DataManager.prototype.delete = function(filterdescriptor, defer){
    var f;
    defer = defer || lib.q.defer();
    if (!this.storage) {
      defer.reject(new lib.Error('MANAGER_ALREADY_DESTROYED', 'DataManager is destroyed already'));
      return defer.promise;
    }
    f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return;
    }
    this.storage.delete(f).done(
      this.doNativeDelete.bind(this, defer,f),
      this.onStorageError.bind(this, defer)
    );
    return defer.promise;
  };
  DataManager.prototype.stateStreamFilterForRecord = function(record){
    return this.storage.__record.stateStreamFilterForRecord(this,record);
  };
  return DataManager;
}

module.exports = createDataManager;

}).call(this,require('_process'))
},{"_process":46}],26:[function(require,module,exports){
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
    return hash;
  };
  function undefize(o,name){
    o.set(name,void 0);
  }
  DataObject.prototype.destroy = function(){
    /*
    var opns = Object.getOwnPropertyNames(this);
    opns.forEach(undefize.bind(null,this));
    console.trace();
    console.log(this,'destroyed');
    */
  };
  DataObject.prototype.templateHash = function () {
    return {};
  };
  DataObject.prototype.toHash = function(fields){
    //return fields.reduce(this._fieldToHash.bind(this),this.templateHash());
    var ret = this.templateHash(), l = fields.length, f, val, und;
    for (var i=0; i<l; i++) {
      f = fields[i];
      val = this.get(f);
      if (val!==und) {
        ret[f] = val;
      }
    }
    return ret;
  };
  DataObject.prototype.clone = function(){
    return this.toHash(Object.getOwnPropertyNames(this));
  };
  function equalator(o1,o2,propname){
    return o1[propname] === o2[propname];
  }
  function compareObjects(o1,o2){
    var o1pns = Object.getOwnPropertyNames(o1),
        o2pns = Object.getOwnPropertyNames(o2),
        ret;
    if(o1pns.length!==o2pns.length){
      return false;
    }
    if(o1pns.length<1){
      return true;
    }
    ret = o1pns.every(equalator.bind(null,o1,o2));
    o1 = null;
    o2 = null;
    return ret;
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
    var ret = this.fieldNames().every(this.matchesField.bind(this,datahash));
    datahash = null;
    return ret;
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
  //return DataObject;

  function recordFieldMapper(f) { return "this."+f.name+" = null;"; }
  function createRecordObjectCtor (fields) {
    var ret, fs = fields.map(recordFieldMapper).join("\n"),
      ctorcode = "ret = function DataObject_(prophash) {\n"+fs+"\n DataObject.call(this, prophash);\n};\nlib.inherit(ret, DataObject);",
      hashtemplate = createHashTemplate(fields);
    eval(ctorcode);
    ret.prototype.templateHash = function (){
      var ret;
      eval(hashtemplate);
      return ret;
    };
    return ret;
    //return execlib.dataSuite.DataObject;
  }

  function RecordHiveElement (fid, fields) {
    this.id = fid;
    this.ctor = createRecordObjectCtor(fields);
    this.template = createHashTemplate(fields);
  }
  RecordHiveElement.prototype.destroy = function () {
    this.template = null;
    this.ctor = null;
    this.id = null;
  };

  function templateFieldMapper (f) {
    return f.name+": void 0";
  }
  function createHashTemplate (fields) {
    var fs = fields.map(templateFieldMapper);
    return "ret = {" + fs.join(',')+"}";
  }

  function hiveFieldConcatenator(res, f) { return res + '_' + f.name; }
  function fieldsid (fields) {
    return fields.reduce(hiveFieldConcatenator, '');
  };
  function RecordHive () {
    lib.Map.call(this);
  }
  lib.inherit(RecordHive, lib.Map);
  RecordHive.prototype.give = function (fields) {
    var fid = fieldsid(fields),
      ret = this.get(fid);
    if (!ret) {
      ret = new RecordHiveElement(fid, fields);
      this.add(fid, ret);
    }
    return ret;
  };
  RecordHive.prototype.dec = function (templateobject) {
    if (!(templateobject && templateobject.fid)) {
      return;
    }
    templateobject = this.remove(templateobject.fid);
    if (templateobject) {
      templateobject.destroy();
      templateobject = null;
    }
  };
  
  //var _recordHive = new RecordHive();
  return new RecordHive();

}

module.exports = createDataObject;

},{}],27:[function(require,module,exports){
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
        return ['u', uf, _new];
      }else{
        //deletion
        return ['d', uf];
      }
    }else{
      if(_nok){
        //create
        return ['c', _new];
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
    switch(item[0]){
      case 'c':
        if(this.isOK(item[1])){
          return ['c', this.record.filterHash(item[1])];
        }
        break;
      case 'ue':
        return this.processUpdateExact(item[2],item[1]);
      default:
        return item;
    }
  };
  return QueryBase;
}

module.exports = createQueryBase;

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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
    this.templateObj = execlib.dataSuite.ObjectHive.give(prophash.fields);
    //this.objCtor = prophash.objCtor || createRecordObjectCtor(prophash.fields);
    this.fields = [];
    this.fieldsByName = new lib.Map();
    //this.hashTemplate = createHashTemplate(prophash.fields);
    prophash.fields.forEach(this.addField.bind(this,visiblefields));
    visiblefields = null;
  }
  Record.prototype.destroy = function(){
    if (this.templateObj) {
      execlib.dataSuite.ObjectHive.dec(this.templateObj);
    }
    //this.hashTemplate = null;
    this.fieldsByName.destroy();
    this.fieldsByName = null;
    lib.arryDestroyAll(this.fields);
    this.fields = null;
    //this.objCtor = null;
    this.templateObj = null;
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
  Record.prototype.createTemplateHash = function () {
    var ret;
    eval (this.templateObj.template);
    return ret;
  };
  function hashFiller(prophash, obj, field) {
    prophash[field.name] = field.valueFor(obj[field.name]);
  }
  Record.prototype.filterHash = function(obj){
    var prophash = this.createTemplateHash(), fs = this.fields, l=fs.length, i, f, fn;//{};
    //this.fields.forEach(hashFiller.bind(null, prophash, obj));
    for(i=0; i<l; i++) {
      f = fs[i];
      fn = f.name;
      prophash[fn] = f.valueFor(obj[fn]);
    }
    obj = null;
    return prophash;
  };
  Record.prototype.filterObject = function(obj){
    return new(this.templateObj.ctor)(this.filterHash(obj));
  };
  Record.prototype.filterStateStream = function(item){
    if(item.p && item.p.length===1){
      if(item.o==='u'){
        var f = this.fieldsByName.get(item.p[0]);
        if(f){
          var ret = {};
          ret[f.name] = f.valueFor(item.d[0]);
          return ret;
        }
      }
      if(item.o==='s'){
        var f = this.fieldsByName.get(item.p[0]);
        if(f){
          var ret = {};
          ret[f.name] = f.valueFor(item.d);
          return ret;
        }
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
      return {op:'hash',d:this.filterObject(datahash)};
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
      this.manager.update(this.record.updatingFilterDescriptorFor(this.recordinstance),val);
    }
  };
  return Record;
}

module.exports = createRecord;

},{}],30:[function(require,module,exports){
function createSuite(execlib){
  'use strict';

  var suite = {};
  require('./utils')(execlib,suite);

  suite.Record = require('./creator')(execlib);
  
  return suite;
};

module.exports = createSuite;

},{"./creator":29,"./utils":31}],31:[function(require,module,exports){
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
  var sm = execlib.execSuite.registry.getClientSide('.');
  suite.duplicateFieldValueInArrayOfHashes = duplicateFieldValueInArrayOfHashes;
  suite.inherit = inherit;
  var sinkPreInheritProc = sinkInheritProcCreator('DataSink',sm.get('user').inherit); 
  function sinkInheritProc(childCtor,methodDescriptors,visiblefieldsarray,classStorageDescriptor){
    sinkPreInheritProc.call(this,childCtor,methodDescriptors,visiblefieldsarray);
    var recordDescriptor = {};
    lib.traverseShallow(this.prototype.recordDescriptor,copierWOFields.bind(null,recordDescriptor));
    var fields = [];
    if(this.prototype.recordDescriptor){
      copyNamedItems(this.prototype.recordDescriptor.fields,fields,childCtor.prototype.visibleFields);
    }
    lib.traverseShallow(classStorageDescriptor.record, copierWOFields.bind(null,recordDescriptor));
    copyNamedItems(classStorageDescriptor.record.fields,fields,childCtor.prototype.visibleFields);
    recordDescriptor.fields = fields;
    childCtor.prototype.recordDescriptor = recordDescriptor;
  }
  suite.sinkInheritProc = sinkInheritProc;
}

module.exports = createRecordUtils;

},{}],32:[function(require,module,exports){
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
    d.promise.done(
      this.onRunnerInitiated.bind(this,eventq),
      runner.reject.bind(runner),
      runner.onStream.bind(runner)
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
    var i;
    if (this.distributor) {
      i = QueryBase.prototype.onStream.call(this,item);
      if (i) {
        this.distributor.onStream(i);
      }
    }
  };

  function SpawningDataManager(storageinstance, filterdescriptor, recorddescriptor) {
    DistributedDataManager.call(this, storageinstance, filterdescriptor);
    this.recorddescriptor = recorddescriptor;
    this.runningQueries = new lib.Map();
    //console.trace();
    //console.log('new SpawningDataManager', this.id);
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
      this.runningQueries.add(filterstring, rq);
      this.distributor.attach(rq);
      rq.destroyed.attachForSingleShot(this.onRunningQueryDown.bind(this, filterstring));
    }
    defer.notify(['i', id]);
    qr = new QueryRunner(rq, queryprophash, defer);
    rq.addRunner(this, qr);
    return qr;
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

},{}],33:[function(require,module,exports){
function createAsyncMemoryStorageBase (execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    MemoryStorageBase = dataSuite.MemoryStorageBase;

  function AsyncMemoryStorageBase(storagedescriptor, data) {
    this.q = new lib.Fifo();
    this.readyDefer = q.defer();
    this.readyDefer.promise.then(this.setReady.bind(this));
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(AsyncMemoryStorageBase, MemoryStorageBase);
  AsyncMemoryStorageBase.prototype.destroy = function () {
    MemoryStorageBase.prototype.destroy.call(this);
    this.readyDefer = null;
    if (this.q) {
      this.q.destroy();
    }
    this.q = null;
  };
  AsyncMemoryStorageBase.prototype.setReady = function () {
    //console.log('setReady', this.q.length, 'jobs on q');
    var job;
    while (this.q) {
      job = this.q.pop();
      this[job[0]].apply(this, job[1]);
    }
  };
  AsyncMemoryStorageBase.prototype.doCreate = function (record, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doCreate', [record, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doCreate.call(this, record, defer);
  };
  AsyncMemoryStorageBase.prototype.doRead = function (query, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doRead', [query, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doRead.call(this, query, defer);
  };
  AsyncMemoryStorageBase.prototype.doUpdate = function (filter, datahash, options, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doUpdate', [filter, datahash, options, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doUpdate.call(this, filter, datahash, options, defer);
  };
  AsyncMemoryStorageBase.prototype.doDelete = function (filter, defer) {
    if (!this.readyDefer) {
      return;
    }
    if (!this.readyDefer.promise.isFulfilled()) {
      this.q.push(['doDelete', [filter, defer]]);
      return;
    }
    return MemoryStorageBase.prototype.doDelete.call(this, filter, defer);
  };

  return AsyncMemoryStorageBase;
}

module.exports = createAsyncMemoryStorageBase;

},{}],34:[function(require,module,exports){
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
    if (!this.created) {
      return;
    }
    this.created.fire(datahash);
    if(!this.initTxnId){
      this.newRecord.fire(datahash);
    }
  };
  StorageBaseEventing.prototype.fireUpdated = function(filter,datahash,updateresult){
    if(this.updated && (updateresult.updated || updateresult.upserted)){
      this.updated.fire(filter,datahash,updateresult);
    }
  };
  StorageBaseEventing.prototype.fireDeleted = function(filter,deletecount){
    if(this.deleted && deletecount){
      this.deleted.fire(filter,deletecount);
    }
  };

  var __id = 0;
  function StorageBase(storagedescriptor){
    //this.__id = process.pid+':'+(++__id);
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
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    if(this.events){
      d.promise.then(this.events.fireNewRecord.bind(this.events));
    }
    this.doCreate(this.__record.filterObject(datahash),d);
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
    var d = q.defer();
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    lib.runNext(this.doUpdate.bind(this,filter,datahash,options,d));
    if(this.events){
      d.promise.then(this.events.fireUpdated.bind(this.events,filter,datahash));
    }
    return d.promise;
  };
  StorageBase.prototype.beginInit = function(txnid){
    var d = q.defer();
    this.delete(dataSuite.filterFactory.createFromDescriptor(null)).then(
      this.onAllDeletedForBegin.bind(this, txnid, d),
      d.reject.bind(d)
    );
    return d.promise;
  };
  StorageBase.prototype.onAllDeletedForBegin = function (txnid, defer) {
    if (this.data) {
      if (this.data.length) {
        throw new lib.Error('DATA_NOT_EMPTY');
      }
    }
    if(this.events){
      this.events.beginInit(txnid);
    }
    defer.resolve(true);
  };
  StorageBase.prototype.endInit = function(txnid){
    if(this.events){
      this.events.endInit(txnid,this);
    }
  };
  StorageBase.prototype.delete = function(filter){
    //console.log('StorageBase delete',filter);
    var d = q.defer();
    if (!this.__record) {
      d.resolve(null);
      return d.promise;
    }
    lib.runNext(this.doDelete.bind(this,filter,d));
    if(this.events){
      d.promise.then(this.events.fireDeleted.bind(this.events,filter));
    }
    return d.promise;
  };
  return StorageBase;
}

module.exports = createStorageBase;

},{}],35:[function(require,module,exports){
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
    this.record = null;
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

},{}],36:[function(require,module,exports){
function createMemoryStorageBase (execlib) {
  'use strict';
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    StorageBase = dataSuite.StorageBase;

  function MemoryStorageBase(storagedescriptor,data){
    StorageBase.call(this,storagedescriptor);
    this.mydata = !data;
    this.data = data || this._createData();
  }
  execlib.lib.inherit(MemoryStorageBase,StorageBase);
  MemoryStorageBase.prototype.destroy = function(){
    if (this.mydata) {
      this._destroyDataWithElements();
    }
    this.mydata = null;
    this.data = null;
    StorageBase.prototype.destroy.call(this);
  };
  MemoryStorageBase.prototype.doCreate = function(record,defer){
    if (!this.__record) {
      defer.resolve(null);
      return;
    }
    var mpk = this.__record.primaryKey, pr;
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
    pr = this.data.push(record);
    if (pr && 'function' === typeof pr.done) {
      pr.done(
        defer.resolve.bind(defer, record),
        defer.reject.bind(defer)
      );
    } else {
      defer.resolve(record/*.clone()*/);
    }
  };
  function processRead(__id,query,defer,item){
    if(query.isOK(item)){
      //defer.notify(item.toHash(query.fields()));
      defer.notify(item);
    }
  }
  MemoryStorageBase.prototype.doRead = function(query,defer){
    if (!this.data) {
      defer.resolve(null);
      return;
    }
    if(!(query.isLimited()||query.isOffset())){
      this._traverseData(processRead.bind(null,this.__id,query,defer)).then(defer.resolve.bind(defer, null));
    }else{
      var start = query.offset, end=Math.min(start+query.limit,this.data.length);
      this._traverseDataRange(processRead.bind(null, this.__id,query, defer), start, end).then(defer.resolve.bind(defer, null));
      /*
      for(var i=start; i<end; i++){
        processRead(query,defer,this.__record.filterHash(this.data[i]));
      }
      */
    }
  };
  MemoryStorageBase.prototype.updateFrom = function(countobj,record,updateitem,updateitemname){
    if(record.hasFieldNamed(updateitemname)){
      if(countobj.count<1){
        countobj.original = record.clone();
      }
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  MemoryStorageBase.prototype.onUpsertSucceeded = function(defer,createdrecord){
    defer.resolve({upserted:1});
  };
  MemoryStorageBase.prototype.processUpsert = function(defer,countobj,filter,datahash,options,record){
    var d = q.defer();
    this.doCreate(record,d);
    d.done(
      this.onUpsertSucceeded.bind(this,defer),
      defer.reject.bind(defer)
    );
  };
  MemoryStorageBase.prototype.processUpdate = function(defer,countobj,filter,datahash,options,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0,original:null};
      lib.traverse(datahash,this.updateFrom.bind(this,updatecountobj,record));
      if(updatecountobj.count){
        if(!updatecountobj.original){
          throw "No original";
        }
        if(this.events){
          this.events.recordUpdated.fire(record/*.clone()*/,updatecountobj.original);
        }
        defer.notify([record, updatecountobj.original]);
        countobj.count++;
      }
    }
  }
  MemoryStorageBase.prototype.doUpdate = function(filter,datahash,options,defer){
    if(!this.data){
      defer.reject(new lib.Error('NO_DATA_IN_STORAGE'));
      return;
    }
    var countobj = {count:0};
    this._traverseData(this.processUpdate.bind(this,defer,countobj,filter,datahash,options));
    if(countobj.count<1 && options && options.upsert){
      this.processUpsert(filter,datahash,options,defer);
    }else{
      defer.resolve({updated:countobj.count});
    }
  };
  MemoryStorageBase.prototype.processDelete = function(todelete,defer,filter,record,recordindex,records){
    if(filter.isOK(record)){
      if(this.events){
        this.events.recordDeleted.fire(record);
      }
      defer.notify(record);
      record.destroy();
      todelete.unshift(recordindex);
    }/*else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }*/
  }
  MemoryStorageBase.prototype.doDelete = function(filter,defer){
    if (!this.data) {
      defer.resolve(0);
      return;
    }
    var todelete = [], data = this.data;
    this._traverseData(this.processDelete.bind(this,todelete,defer,filter));
    todelete.forEach(this._removeDataAtIndex.bind(null, this.data));
    defer.resolve(todelete.length);
  };
  MemoryStorageBase.prototype.recordViolatesSimplePrimaryKey = function (rec) {
    var spk = this.__record.primaryKey, spv = rec.get(spk), affectedrecord;
    if (this._traverseConditionally(function (record) {
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
  MemoryStorageBase.prototype.recordViolatesComplexPrimaryKey = function (rec) {
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
    if (this._traverseConditionally(function (record) {
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
  return MemoryStorageBase;

}

module.exports = createMemoryStorageBase;

},{}],37:[function(require,module,exports){
function createMemoryStorage(execlib, MemoryStorageBase){
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function MemoryStorage (storagedescriptor, data) {
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(MemoryStorage, MemoryStorageBase);
  MemoryStorage.prototype._createData = function () {
    return [];
  };
  MemoryStorage.prototype._destroyDataWithElements = function () {
    lib.arryDestroyAll(this.data);
  };
  MemoryStorage.prototype._traverseData = function (cb) {
    this.data.forEach(cb);
    return q(true);
  };
  MemoryStorage.prototype._traverseDataRange = function (cb, start, endexclusive) {
    for(var i=start; i<end; i++){
      cb(query,defer,this.__record.filterHash(this.data[i]));
    }
    return q(true);
  };
  MemoryStorage.prototype._removeDataAtIndex = function (data, index) {
    if (index === data.length-1) {
      data.pop();
    } else if (index === 0){
      data.shift();
    } else {
      data.splice(index, 1);
    }
  };
  MemoryStorage.prototype._traverseConditionally = function (cb) {
    return this.data.some(cb);
  };

  return MemoryStorage;
}

module.exports = createMemoryStorage;

},{}],38:[function(require,module,exports){
function createMemoryStorage(execlib, MemoryStorageBase){
  'use strict';
  var lib = execlib.lib,
    q = lib.q;

  function MemoryListStorage (storagedescriptor, data) {
    MemoryStorageBase.call(this, storagedescriptor, data);
  }
  lib.inherit(MemoryListStorage, MemoryStorageBase);
  MemoryListStorage.prototype._createData = function () {
    return new lib.SortedList();
  };
  MemoryListStorage.prototype._destroyDataWithElements = function () {
    lib.containerDestroyAll(this.data);
    this.data.destroy();
  };
  MemoryListStorage.prototype._traverseData = function (cb) {
    this.data.traverse(cb);
  };
  function rangeTraverser (start, endexclusive, cb, cntobj, item) {
    if (cntobj.cnt >= start && cntobj.cnt < endexclusive) {
      cb(item);
    }
    cntobj.cnt++;
  };
  MemoryListStorage.prototype._traverseDataRange = function (cb, start, endexclusive) {
    var cntobj = {cnt:0};
    this.data.traverse(rangeTraverser.bind(null, start, endexclusive, cb, cntobj));
    return q(true);
  };
  MemoryListStorage.prototype._removeDataAtIndex = function (data, index) {
    data.removeOne(index);
  };
  MemoryListStorage.prototype._traverseConditionally = function (cb) {
    return this.data.traverseConditionally(cb);
  };

  return MemoryListStorage;
}

module.exports = createMemoryStorage;


},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
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

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"dup":41}],43:[function(require,module,exports){
function sinkMapCreator(execlib, ParentSinkMap){
  'use strict';
  if (!execlib.dataSuite) {
    require('./data')(execlib);
  }
  var sinkmap = new (execlib.lib.Map);
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib, ParentSinkMap.get('service')));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib, ParentSinkMap.get('user')));
  
  return sinkmap;
}

module.exports = sinkMapCreator;

},{"./data":24,"./sinks/servicesinkcreator":44,"./sinks/usersinkcreator":45}],44:[function(require,module,exports){
function createServiceSink(execlib, ParentServiceSink){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      recordSuite = execlib.dataSuite.recordSuite;

  function ServiceSink(prophash,client){
    ParentServiceSink.call(this,prophash,client);
  }
  ParentServiceSink.inherit(ServiceSink,require('../methoddescriptors/serviceuser'));
  ServiceSink.inherit = recordSuite.sinkInheritProc;
  ServiceSink.prototype.visibleFields = [];
  return ServiceSink;
}

module.exports = createServiceSink;

},{"../methoddescriptors/serviceuser":41}],45:[function(require,module,exports){
function createUserSink(execlib, ParentServiceSink){
  'use strict';
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      recordSuite = execlib.dataSuite.recordSuite;

  function UserSink(prophash,client){
    ParentServiceSink.call(this,prophash,client);
  }
  ParentServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  UserSink.inherit = recordSuite.sinkInheritProc;
  UserSink.prototype.visibleFields = [];
  return UserSink;
}

module.exports = createUserSink;

},{"../methoddescriptors/user":42}],46:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
