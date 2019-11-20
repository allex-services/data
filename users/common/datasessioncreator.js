function createDataSession(execlib, ParentService){
  'use strict';
  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    UserSession = ParentService.prototype.userFactory.get('user').prototype.getSessionCtor('.'),
    Channel = UserSession.Channel,
    dataSuite = execlib.dataSuite/*,
    QueryClone = dataSuite.QueryClone*/;

//  function DataChannel(usersession){
//    Channel.call(this,usersession);
//    QueryClone.call(this,usersession.user);
//    //QueryClone.call(this,{original:usersession.user});
//  }
//  lib.inherit(DataChannel,Channel);
//  lib.inheritMethods(DataChannel,QueryClone,'fields','filter',/*'limit','offset',*/'isEmpty','isLimited','isOffset','isOK');
//  DataChannel.prototype.__cleanUp = function () {
//    QueryClone.prototype.destroy.call(this);
//    Channel.prototype.__cleanUp.call(this);
//  };
//  DataChannel.prototype.limit = function(){
//    return this.usersession.pagesize;
//  };
//  DataChannel.prototype.offset = function(){
//    if(this.pagesize){
//      return this.usersession.pagesize*this.usersession.page;
//    }
//  };
//  DataChannel.prototype.name = 'd';

  function DataSession(user,session,gate){
    UserSession.call(this,user,session,gate);
    this.queries = new lib.Map();
    this.queryDestroyedListeners = new lib.Map();
  }
  UserSession.inherit(DataSession,{
    query: [{
      title: 'Query Property hash',
      type: 'object'
    }],
    closeQuery: [{
      title: 'Query ID',
      type: 'string'
    }]
  });
  DataSession.prototype.__cleanUp = function(){
    if (this.queryDestroyedListeners) {
      lib.containerDestroyAll(this.queryDestroyedListeners);
      this.queryDestroyedListeners.destroy();
    }
    this.queryDestroyedListeners = null;
    if (this.queries) {
      lib.containerDestroyAll(this.queries);
      this.queries.destroy();
    }
    this.queries = null;
    UserSession.prototype.__cleanUp.call(this);
  };
  DataSession.prototype.query = function(queryprophash, defer){
    if (!this.user) {
      defer.reject(new lib.Error('USER_DESTROYED'));
      return;
    }
    if (!this.user.__service) {
      defer.reject(new lib.Error('DATA_SERVICE_DESTROYED'));
      return;
    }
    if (!this.user.__service.data) {
      defer.reject(new lib.Error('DATA_SERVICE_STORAGE_DESTROYED'));
      return;
    }
    dataSuite.fixvisiblefields(queryprophash, this.user.visibleFields);
    if (lib.isFunction(this.user.preprocessQueryPropertyHash)) {
      queryprophash = this.user.preprocessQueryPropertyHash(queryprophash);
    } else {
      if (lib.isFunction(this.user.__service.preprocessQueryPropertyHash)) {
        queryprophash = this.user.__service.preprocessQueryPropertyHash(queryprophash);
      }
    }
    var id = lib.uid(),
      query = this.user.__service.data.addQuery(id, queryprophash, defer);
    this.queryDestroyedListeners.add(id, query.destroyed.attach(this.onQueryDown.bind(this, id)));
    this.queries.add(id, query);
  };
  DataSession.prototype.onQueryDown = function (id) {
    var listener = this.queryDestroyedListeners.remove(id);
    if (listener) {
      listener.destroy();
    }
    return this.queries.remove(id);
  };
  DataSession.prototype.closeQuery = function (id, defer) {
    var query = this.onQueryDown(id);
    if (query) {
      query.destroy();
    }
    defer.resolve(true);
  };
  DataSession.prototype.setPaging = function(pagesize,defer){
    this.pagesize = pagesize;
    this.page = 0;
    defer.resolve(pagesize);
  };
  DataSession.prototype.nextPage = function(defer){
    if(!this.pagesize){
      defer.resolve(null);
    }
    //TODO
    defer.resolve(null);
  };
  DataSession.prototype.prevPage = function(defer){
    if(!this.pagesize){
      defer.resolve(null);
    }
    //TODO
    defer.resolve(null);
  };
  return DataSession;
}

module.exports = createDataSession;
