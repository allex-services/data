function createDataService(execlib){
  var lib = execlib.lib,
    q = lib.q,
    execSuite = execlib.execSuite,
    Service = execSuite.ServicePack.Service,
    User = execSuite.User,
    ParentService = Service,
    dataSuite = execlib.dataSuite,
    recordSuite = dataSuite.recordSuite,
    NullStorage = dataSuite.NullStorage,
    DistributedDataManager = dataSuite.DistributedDataManager,
    RecordStorage = recordSuite.Storage,
    DataChannel = require('./users/common/datasessioncreator')(execlib),
    userSessionFactory = execSuite.userSessionFactoryCreator(DataChannel);

  function factoryCreator(parentFactory){
    return {
      'service': require('./users/serviceusercreator')(execlib,parentFactory.get('service'),userSessionFactory),
      'user': require('./users/usercreator')(execlib,parentFactory.get('user'),userSessionFactory) 
    };
  }

  function DataService(prophash){
    ParentService.call(this,prophash);
    this.data = new DistributedDataManager(this.createStorage(),{});
  }
  ParentService.inherit(DataService,factoryCreator);
  DataService.prototype.recordDescriptor = {fields:[]};
  var dsio = DataService.inherit;
  DataService.inherit = function(childCtor,factoryProducer,childRecordDescriptor){
    dsio.call(this,childCtor,factoryProducer);
    var rd = recordSuite.utils.inherit(this.prototype.recordDescriptor,childRecordDescriptor);
    childCtor.prototype.recordDescriptor = recordSuite.utils.inherit(this.prototype.recordDescriptor,childRecordDescriptor);
  };
  DataService.prototype.createStorage = function(){
    return new NullStorage();
  };
  DataService.prototype.introduceUser = function(userhash){
    console.log('should introduceUser',userhash);
    userhash.name = JSON.stringify(userhash.filter || '*'); //Crucial!
    return ParentService.prototype.introduceUser.call(this,userhash);
  };
  return DataService;
}

module.exports = createDataService;
