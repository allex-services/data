function commonInherit(execlib,ChildClass,ParentClass,methoddescriptors,userSessionFactory){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory,
      QueryBase = dataSuite.QueryBase,
      recordSuite = dataSuite.recordSuite,
      execSuite = execlib.execSuite,
      DataStreamDistributor = dataSuite.StreamDistributor,
      _User = execSuite.User;

  function EventQ(){
    lib.Destroyable.call(this);
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
    this.q.push(item);
  };
  EventQ.prototype.dumpTo = function(sink){
    if (!this.q) {
      return;
    }
    while(this.q.length){
      var item = this.q.pop();
      if(sink.isOK(item)){
        sink.onStream(item);
      }
    }
  };


  ParentClass.inherit(ChildClass,methoddescriptors);
  lib.inheritMethods(ChildClass,QueryBase,/*'fields','limit','offset',*/'isEmpty','isLimited','isOffset','isOK','processUpdateExact');
  ChildClass.inherit = recordSuite.userInheritProc;
  ChildClass.prototype.visibleFields = [];
  ChildClass.prototype.__cleanUp = function(){
    if (this._filter) {
      this._filter.destroy();
    }
    this._filter = null;
    if (this.distributor) {
      this.distributor.destroy();
    }
    this.distributor = null;
    QueryBase.prototype.destroy.call(this);
    ParentClass.prototype.__cleanUp.call(this);
  };
  ChildClass.prototype.constructSelf = function(prophash){
    ParentClass.call(this,prophash);
    QueryBase.call(this,this.__service.storageDescriptor.record,this.visibleFields);
    this.distributor = new DataStreamDistributor;
    this._filter = filterFactory.createFromDescriptor(prophash.filter);
    this.__service.data.distributor.attach(this);
  };
  ChildClass.prototype.filter = function(){
    return this._filter;
  };
  ChildClass.prototype.limit = lib.dummyFunc;
  ChildClass.prototype.offset = lib.dummyFunc;
  ChildClass.prototype.attachChannel = function(channel,eventq){
    if (!channel.destroyed) { //he's dead, Jim...
      return;
    }
    if (!this.distributor) {
      return;
    }
    eventq.dumpTo(channel);
    eventq.destroy();
    this.distributor.attach(channel);
  };
  ChildClass.prototype.attachSession = function(session){
    if (!session.channels) {
      return;
    }
    ParentClass.prototype.attachSession.call(this,session);
    var c = session.channels.get('d'),
      d = lib.q.defer(),
      q = new EventQ;
    this.distributor.attach(q);
    d.promise.done(
      this.attachChannel.bind(this,c,q),
      null,
      c.onStream.bind(c)
    );
    this.__service.data.read(this,d);
  };
  ChildClass.prototype.onStream = function(item){
    if(!this.destroyed){
      return;
    }
    //console.log('Some User distributing further',item,'to',this.distributor.sinks.length);
    var myitem = QueryBase.prototype.onStream.call(this,item);
    if(myitem){
      this.distributor.onStream(myitem);
    }
  };
  ChildClass.prototype.create = function(datahash,defer){
    this.__service.data.create(datahash).done(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      defer.notify.bind(defer)
    );
  };
  ChildClass.prototype.update = function(filterdescriptor,datahash,options,defer){
    var f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return;
    }
    this.__service.data.update(f,datahash,options).done(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      defer.notify.bind(defer)
    );
  };
  ChildClass.prototype.delete = function(filterdescriptor,defer){
    var f = filterFactory.createFromDescriptor(filterdescriptor);
    if(!f){
      var e = new lib.Error('INVALID_FILTER_DESCRIPTOR');
      e.filterdescriptor = filterdescriptor;
      defer.reject(e);
      return;
    }
    this.__service.data.delete(f).done(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      defer.notify.bind(defer)
    );
  };
  ChildClass.prototype.updateByDescriptor = function(filterdescriptor,datahash,defer){
    this.__service.data.updateByDescriptor(filterdescriptor,datahash).done(
      defer.resolve.bind(defer),
      defer.reject.bind(defer),
      defer.notify.bind(defer)
    );
  };
  ChildClass.prototype.getSessionCtor = userSessionFactory;

}

module.exports = commonInherit;
