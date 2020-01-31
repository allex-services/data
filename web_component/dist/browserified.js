(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var lR = ALLEX.execSuite.libRegistry;
ALLEX.execSuite.registry.registerClientSide('allex_dataservice',require('./sinkmapcreator')(ALLEX, ALLEX.execSuite.registry.getClientSide('.'), lR.get('allex_datalib')));

},{"./sinkmapcreator":5}],2:[function(require,module,exports){
function createDataSuite(execlib, datalib){
  'use strict';
  var lib = execlib.lib;
  /*
  var execSuite = execlib.execSuite,
    dataSuite = {
      storageRegistry: new execSuite.RegistryBase(),
      recordSuite: require('./record')(execlib)
    };
    execlib.dataSuite = dataSuite;
    dataSuite.ObjectHive = require('./objectcreator')(execlib);
    require('./utils')(execlib);
    dataSuite.filterFactory = datafilterslib;//require('./filters/factorycreator')(execlib);
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
    */

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
  function sinkInheritProcCreator(classname,originalUIP){//originalUIP <=> original User inheritance proc
    //classname not used, but may be useful for error reporting...
    return function(childCtor,methodDescriptors,visiblefieldsarray){
      originalUIP.call(this,childCtor,methodDescriptors);
      childCtor.prototype.visibleFields = datalib.recordSuite.copyAndAppendNewElements(this.prototype.visibleFields,visiblefieldsarray);
      childCtor.inherit = this.inherit;
      //console.log('after inherit',childCtor.prototype.visibleFields,'out of parent',this.prototype.visibleFields,'and',visiblefieldsarray);
    };
  }
  var sinkPreInheritProc = sinkInheritProcCreator('DataSink',execlib.execSuite.registry.clientSides.get('.').get('user').inherit); 
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
  datalib.recordSuite.sinkInheritProc = sinkInheritProc;
  execlib.dataSuite = datalib;
}

module.exports = createDataSuite;

},{}],3:[function(require,module,exports){
module.exports = {
  create: [{
    title: 'Data hash',
    type: 'object'
  }],
  read: [{
    title: 'Query descriptor',
    type: 'object',
    required: false
  }],
  update: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  },{
    title: 'Operation descriptor',
    type: 'object'
  },{
    title: 'Options object',
    type: 'object'
  }],
  delete: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  }]
};

},{}],4:[function(require,module,exports){
module.exports = {
  create: [{
    title: 'Data hash',
    type: 'object'
  }],
  read: [{
    title: 'Query descriptor',
    type: 'object',
    required: false
  }],
  update: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  },{
    title: 'Operation descriptor',
    type: 'object'
  },{
    title: 'Options object',
    type: 'object'
  }],
  delete: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  }],
  aggregate : [
    {
      title : 'Aggregate descriptor',
      type : ['array', 'string']
    }
  ]
};

},{}],5:[function(require,module,exports){
function sinkMapCreator(execlib, ParentSinkMap, datalib){
  'use strict';
  if (!execlib.dataSuite) {
    require('./data')(execlib, datalib);
  }
  var sinkmap = new (execlib.lib.Map);
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib, ParentSinkMap.get('service')));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib, ParentSinkMap.get('user')));
  
  return sinkmap;
}

module.exports = sinkMapCreator;

},{"./data":2,"./sinks/servicesinkcreator":6,"./sinks/usersinkcreator":7}],6:[function(require,module,exports){
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

},{"../methoddescriptors/serviceuser":3}],7:[function(require,module,exports){
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

},{"../methoddescriptors/user":4}]},{},[1]);
