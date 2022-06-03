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
  ChildClass.prototype.read = function (querydescriptor, defer) {
    var query;
    if (!this.__service) {
      defer.reject(new lib.Error('ALREADY_DESTROYED'));
      return;
    }
    if (!(this.__service.data && this.__service.storageDescriptor && this.__service.storageDescriptor.record)) {
      defer.reject(new lib.Error('SERVICE_ALREADY_DESTROYED'));
      return;
    }
    dataSuite.fixvisiblefields(querydescriptor, this.visibleFields);
    query = new dataSuite.StaticQuery(this.__service.storageDescriptor.record, querydescriptor);
    defer.promise.then(
      query.destroy.bind(query),
      query.destroy.bind(query)
    );
    this.__service.data.read(query, defer);
  };
  ChildClass.prototype.update = function(filterdescriptor,datahash,options,defer){
    if (!this.__service) {
      defer.reject(new lib.Error('ALREADY_DESTROYED'));
      return;
    }
    if (!this.__service.data) {
      defer.reject(new lib.Error('SERVICE_ALREADY_DESTROYED'));
      return;
    }
    this.__service.data.update(filterdescriptor,datahash,options,defer);
  };
  ChildClass.prototype.delete = function(filterdescriptor,defer){
    if (!this.__service) {
      defer.reject(new lib.Error('ALREADY_DESTROYED'));
      return;
    }
    if (!this.__service.data) {
      defer.reject(new lib.Error('SERVICE_ALREADY_DESTROYED'));
      return;
    }
    this.__service.data.delete(filterdescriptor, defer);
  };

  ChildClass.prototype.aggregate = function (aggregation_descriptor, defer){
    if (!this.__service) {
      defer.reject(new lib.Error('ALREADY_DESTROYED'));
      return;
    }
    if (!this.__service.data) {
      defer.reject(new lib.Error('SERVICE_ALREADY_DESTROYED'));
      return;
    }
    this.__service.data.aggregate (aggregation_descriptor, defer);
  };
  ChildClass.prototype.getSessionCtor = userSessionFactory;

}

module.exports = commonInherit;
