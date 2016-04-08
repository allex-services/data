function createDistributedDataManager(execlib){
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    Destroyable = lib.Destroyable,
    ComplexDestroyable = lib.ComplexDestroyable,
    dataSuite = execlib.dataSuite,
    filterFactory = dataSuite.filterFactory,
    QueryBase = dataSuite.QueryBase,
    QueryClone = dataSuite.QueryClone,
    StreamDistributor = dataSuite.StreamDistributor,
    DataManager = dataSuite.DataManager,
    JobBase = qlib.JobBase;

  function DistributedDataManager(storageinstance,filterdescriptor){
    DataManager.call(this,storageinstance,filterdescriptor);
    this.distributor = new StreamDistributor();
    this.setSink(this.distributor);
  }
  lib.inherit(DistributedDataManager,DataManager);
  DistributedDataManager.prototype.destroy = function(){
    if (this.distributor) {
      this.distributor.destroy();
    }
    this.distributor = null;
    DataManager.prototype.destroy.call(this);
  };
  return DistributedDataManager;
}

module.exports = createDistributedDataManager;
