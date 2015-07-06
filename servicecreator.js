function createDataService(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Service = execSuite.registry.get('.').Service,
    User = execSuite.User,
    ParentService = Service,
    dataSuite = execlib.dataSuite,
    recordSuite = dataSuite.recordSuite,
    NullStorage = dataSuite.NullStorage,
    DistributedDataManager = dataSuite.DistributedDataManager,
    DataSession = require('./users/common/datasessioncreator')(execlib),
    userSessionFactory = execSuite.userSessionFactoryCreator(DataSession);

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service'),userSessionFactory),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user'),userSessionFactory) 
    };
  }

  function DataService(prophash){
    ParentService.call(this,prophash);
    this.data = null;
    this.createStorageAsync(prophash).done(
      this.createData.bind(this, prophash)
    );
  }
  ParentService.inherit(DataService,factoryCreator);
  DataService.prototype.storageDescriptor = {record:{fields:[]}};
  var dsio = DataService.inherit;
  DataService.inherit = function(childCtor,factoryProducer,childStorageDescriptor){
    dsio.call(this,childCtor,factoryProducer);
    childCtor.prototype.storageDescriptor = dataSuite.inherit(this.prototype.storageDescriptor,childStorageDescriptor);
  };
  DataService.prototype.__cleanUp = function () {
    if(this.data){
      this.data.destroy();
    }
    this.data = null;
    ParentService.prototype.__cleanUp.call(this);
  };
  DataService.prototype.createData = function (prophash,storageinstance) {
    this.data = new DistributedDataManager(storageinstance,{});
    this.users.traverse(function(user){
      user.notifyServiceData();
      //data.distributor.attach(user);
    });
  };
  DataService.prototype.createStorageAsync = function (prophash){
    var d;
    if(prophash && prophash.storage && prophash.storage.modulename){
      prophash.storage.propertyhash.record = this.storageDescriptor.record;
      return dataSuite.storageRegistry.spawn(prophash.storage.modulename,prophash.storage.propertyhash);
    }
    d = q.defer();
    d.resolve(this.createStorage(this.storageDescriptor));
    return d.promise;
  };
  DataService.prototype.createStorage = function(recorddescriptor){
    return new NullStorage(recorddescriptor);
  };
  DataService.prototype.preProcessUserHash = function(userhash){
    var filterstring;
    try{
      filterstring = JSON.stringify(userhash.filter) || '*';
    }
    catch(e){
      filterstring =  '*';
    }
    userhash.name = userhash.role+':'+filterstring; //Crucial!
  };
  DataService.prototype.introduceUser = function(userhash){
    this.preProcessUserHash(userhash);
    return ParentService.prototype.introduceUser.call(this,userhash);
  };
  return DataService;
}

module.exports = createDataService;
