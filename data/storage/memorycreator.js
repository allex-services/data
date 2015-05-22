function createMemoryStorage(execlib){
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      StorageBase = dataSuite.StorageBase;
  function MemoryStorage(storagedescriptor,data){
    StorageBase.call(this,storagedescriptor);
    this.data = data || [];
  }
  execlib.lib.inherit(MemoryStorage,StorageBase);
  MemoryStorage.prototype.destroy = function(){
    this.data = null;
    StorageBase.prototype.destroy.call(this);
  };
  MemoryStorage.prototype.doCreate = function(record,defer){
    this.data.push(record);
    defer.resolve(record);
  };
  function processRead(query,defer,item){
    if(query.isOK(item)){
      //defer.notify(item.toHash(query.fields()));
      defer.notify(item);
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
    if(record.hasFieldNamed(updateitemname)){
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  MemoryStorage.prototype.processUpdate = function(countobj,filter,datahash,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0};
      lib.traverse(datahash,updateFrom.bind(null,updatecountobj,record));
      if(updatecountobj.count){
        if(this.events){
          this.events.recordUpdated.fire(record);
        }
        countobj.count++;
      }
    }
  }
  MemoryStorage.prototype.doUpdate = function(filter,datahash,defer){
    var countobj = {count:0};
    this.data.forEach(this.processUpdate.bind(this,countobj,filter,datahash));
    defer.resolve(countobj.count);
  };
  MemoryStorage.prototype.processDelete = function(countobj,filter,record,recordindex,records){
    if(filter.isOK(record)){
      records.splice(recordindex,1);
      if(this.events){
        this.events.recordDeleted.fire(record);
      }
      record.destroy();
      countobj.count++;
    }else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }
  }
  MemoryStorage.prototype.doDelete = function(filter,defer){
    var countobj = {count:0};
    this.data.forEach(this.processDelete.bind(this,countobj,filter));
    defer.resolve(countobj.count);
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
