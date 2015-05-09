function commonInherit(execlib,ChildClass,ParentClass,methoddescriptors,userSessionFactory){
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory,
      QueryBase = dataSuite.QueryBase,
      QueryClone = dataSuite.QueryClone,
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
    while(this.q.length){
      var item = this.q.pop();
      if(sink.isOK(item)){
        sink.onStream(item);
      }
    }
  };


  ParentClass.inherit(ChildClass,methoddescriptors);
  lib.inheritMethods(ChildClass,QueryBase,/*'fields','filter','limit','offset',*/'isEmpty','isLimited','isOffset','isOK');
  ChildClass.inherit = recordSuite.userInheritProc;
  ChildClass.prototype.visibleFields = [];
  ChildClass.prototype.__cleanUp = function(){
    if(this._filter){
      this._filter.destroy();
    }
    this._filter = null;
    this.distributor.destroy();
    this.distributor = null;
    QueryBase.prototype.destroy.call(this);
    ParentClass.prototype.__cleanUp.call(this);
  };
  ChildClass.prototype.constructSelf = function(prophash){
    ParentClass.call(this,prophash);
    QueryBase.call(this,prophash);
    this.distributor = new DataStreamDistributor;
    this._filter = filterFactory.createFromDescriptor(prophash.filter);
    this.__service.data.distributor.attach(this);
  };
  ChildClass.prototype.fields = function(){
    return this.visibleFields;
  };
  ChildClass.prototype.filter = function(){
    return this._filter;
  };
  ChildClass.prototype.limit = lib.dummyFunc;
  ChildClass.prototype.offset = lib.dummyFunc;
  ChildClass.prototype.attachChannel = function(channel,eventq){
    eventq.dumpTo(channel);
    eventq.destroy();
    this.distributor.attach(channel);
  };
  ChildClass.prototype.attachSession = function(session){
    ParentClass.prototype.attachSession.call(this,session);
    var c = session.addDataChannel('d'),
      q = new EventQ;
    this.distributor.attach(q);
    var d = lib.q.defer();
    d.promise.done(
      this.attachChannel.bind(this,c,q),
      function(){
      },
      c.onStream.bind(c)
    );
    this.__service.data.read(this,d);
  };
  ChildClass.prototype.onStream = function(item){
    console.log('Some User distributing further',item,'to',this.distributor.sinks.length);
    this.distributor.onStream(item);
  };
  ChildClass.prototype.create = function(datahash,defer){
    this.__service.data.create(datahash);
    defer.resolve('ok');
  };
  ChildClass.prototype.getSessionCtor = userSessionFactory;

}

module.exports = commonInherit;
