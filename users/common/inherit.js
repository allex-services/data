function commonInherit(execlib,ChildClass,ParentClass,methoddescriptors,userSessionFactory){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    dataSuite = execlib.dataSuite,
    filterFactory = dataSuite.filterFactory,
    recordSuite = dataSuite.recordSuite,
    execSuite = execlib.execSuite,
    DataStreamDistributor = dataSuite.StreamDistributor,
    _User = execSuite.User;


  ParentClass.inherit(ChildClass,methoddescriptors);
  ChildClass.inherit = recordSuite.userInheritProc;
  ChildClass.prototype.visibleFields = [];
  ChildClass.prototype.create = function(datahash,defer){
    this.__service.data.create(datahash, defer);
  };
  ChildClass.prototype.update = function(filterdescriptor,datahash,options,defer){
    this.__service.data.update(filterdescriptor,datahash,options,defer);
  };
  ChildClass.prototype.delete = function(filterdescriptor,defer){
    this.__service.data.delete(filterdescriptor, defer);
  };
  ChildClass.prototype.getSessionCtor = userSessionFactory;

}

module.exports = commonInherit;
