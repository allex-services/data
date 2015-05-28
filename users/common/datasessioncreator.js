function createDataSession(execlib){
  var lib = execlib.lib,
    execSuite = execlib.execSuite,
    UserSession = execSuite.UserSession,
    Channel = UserSession.Channel
    dataSuite = execlib.dataSuite,
    QueryClone = dataSuite.QueryClone;

  function DataChannel(usersession,name){
    Channel.call(this,usersession,name);
    QueryClone.call(this,usersession.user);
    //QueryClone.call(this,{original:usersession.user});
  }
  lib.inherit(DataChannel,Channel);
  lib.inheritMethods(DataChannel,QueryClone,'fields','filter',/*'limit','offset',*/'isEmpty','isLimited','isOffset','isOK');
  DataChannel.prototype.limit = function(){
    return this.usersession.pagesize;
  };
  DataChannel.prototype.offset = function(){
    if(this.pagesize){
      return this.usersession.pagesize*this.usersession.page;
    }
  };

  function DataSession(user,session,gate){
    UserSession.call(this,user,session,gate);
  }
  UserSession.inherit(DataSession,{
    setPaging: [{
      title: 'Page size',
      type: 'integer'
    }],
    nextPage: true,
    prevPage: true
  });
  DataSession.prototype.__cleanUp = function(){
    if('pagesize' in this){
      this.pagesize = null;
    }
    if('page' in this){
      this.page = null;
    }
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
  DataSession.prototype.addDataChannel = function(channelname){
    return this.addChannel(channelname,DataChannel);
  };
  return DataSession;
}

module.exports = createDataSession;
