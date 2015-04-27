function createDistributedDataManager(execlib,DataStreamDistributor,DataManager){
  var lib = execlib.lib;

  function DistributedDataManager(storageinstance,filterdescriptor){
    DataManager.call(this,storageinstance,filterdescriptor);
    this.distributor = new DataStreamDistributor();
    this.setSink(this.distributor);
  }
  lib.inherit(DistributedDataManager,DataManager);
  DistributedDataManager.prototype.destroy = function(){
    this.distributor.destroy();
    this.distributor = null;
    DataManager.prototype.destroy.call(this);
  };
  return DistributedDataManager;
}

module.exports = createDistributedDataManager;
