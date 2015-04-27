function createMemoryStorage(execlib,StorageBase){
  function MemoryStorage(options){
    StorageBase.call(this);
    this.data = [];
  }
  execlib.lib.inherit(MemoryStorage,StorageBase);
  MemoryStorage.prototype.destroy = function(){
    this.data = null;
    StorageBase.prototype.destroy.call(this);
  };
  MemoryStorage.prototype.doCreate = function(datahash,defer){
    this.data.push(datahash);
    defer.resolve(datahash);
  };
  function process(query,item,defer){
    if(query.isOK(item)){
      var result = {};
      query.fields().forEach(function(name){
        result[name] = item[name];
      });
      defer.notify(result);
    }
  }
  MemoryStorage.prototype.doRead = function(query,defer){
    if(!(query.isLimited()||query.isOffset())){
      this.data.forEach(function(item){
        process(query,item,defer);
      });
    }else{
      var start = query.offset, end=Math.min(start+query.limit,this.data.length);
      for(var i=start; i<end; i++){
        process(query,this.data[i],defer);
      }
    }
    defer.resolve(null);
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
