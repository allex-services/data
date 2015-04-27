function createCloneStorage(execlib,StorageBase){
  function CloneStorage(options){
    StorageBase.call(this);
    this.original = options.original;
    if(!(this.original instanceof StorageBase)){
      throw "CloneStorage cannot clone a non-StorageBase instance";
    }
  }
  execlib.lib.inherit(CloneStorage,StorageBase);
  CloneStorage.prototype.destroy = function(){
    this.original = null;
    StorageBase.prototype.destroy.call(this);
  };
  CloneStorage.prototype.doCreate = function(datahash,defer){
    this.original.doCreate(datahash,defer);
  };
  CloneStorage.prototype.doRead = function(query,defer){
    console.log('CloneStorage',this.original,query);
    this.original.doRead(datahash,defer);
  };
  return CloneStorage;
}

module.exports = createCloneStorage;
