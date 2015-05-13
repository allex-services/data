function createMemoryStorage(execlib){
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      StorageBase = dataSuite.StorageBase;
  function MemoryStorage(storagedescriptor){
    StorageBase.call(this,storagedescriptor);
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
  function processRead(query,defer,item){
    if(query.isOK(item)){
      defer.notify(item.toHash(query.fields()));
    }
  }
  MemoryStorage.prototype.doRead = function(query,defer){
    if(!(query.isLimited()||query.isOffset())){
      this.data.forEach(processRead.bind(null,query,defer));
    }else{
      var start = query.offset, end=Math.min(start+query.limit,this.data.length);
      for(var i=start; i<end; i++){
        processRead(query,defer,this.data[i]);
      }
    }
    defer.resolve(null);
  };
  function updateFrom(countobj,record,updateitem,updateitemname){
    if(updateitemname in record){
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  function processUpdate(countobj,filter,datahash,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0};
      lib.traverse(datahash,updateFrom.bind(null,updatecountobj,record));
      if(updatecountobj.count){
        countobj.count++;
      }
    }
  }
  MemoryStorage.prototype.doUpdate = function(filter,datahash,defer){
    var countobj = {count:0};
    this.data.forEach(processUpdate.bind(null,countobj,filter,datahash));
    defer.resolve(countobj.count);
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
