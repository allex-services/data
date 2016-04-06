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
    var sink = this.target;
    //console.log('EventQ dumping', this.q.length, 'items');
    while(this.q.length){
      var item = this.q.pop();
      switch (item[0]) {
        case 'c':
          if(sink.isOK(item[1])){
            sink.onStream(item);
          }
        default:
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
  ChildClass.prototype.attachChannel = function(eventq){
    if (!eventq.destroyed) { //he's dead, Jim...
      return;
    }
    if (this.distributor) {
      eventq.dump();
      if (eventq.target) {
        this.distributor.attach(eventq.target);
      }
    }
    eventq.destroy();
  };
  ChildClass.prototype.attachSession = function(session){
    if (!session.channels) {
      return;
    }
    ParentClass.prototype.attachSession.call(this,session);
    var c = session.channels.get('d'),
      d = lib.q.defer(),
      q = new EventQ(c);
    this.distributor.attach(q);
    d.promise.done(
      this.attachChannel.bind(this,q),
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
    this.__service.data.create(datahash, defer);
  };
  ChildClass.prototype.update = function(filterdescriptor,datahash,options,defer){
    this.__service.data.update(filterdescriptor,datahash,options,defer);
  };
  ChildClass.prototype.delete = function(filterdescriptor,defer){
    this.__service.data.delete(filterdescriptor, defer);
  };
  ChildClass.prototype.query = function(queryprophash, defer){
  };
  ChildClass.prototype.getSessionCtor = userSessionFactory;

}

module.exports = commonInherit;
