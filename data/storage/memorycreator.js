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
    defer.resolve(record.clone());
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
        processRead(query,defer,this.__record.filterHash(this.data[i]));
      }
    }
    defer.resolve(null);
  };
  MemoryStorage.prototype.updateFrom = function(countobj,record,updateitem,updateitemname){
    if(record.hasFieldNamed(updateitemname)){
      if(countobj.count<1){
        countobj.original = record.clone();
        //console.log('Original set',countobj.original);
      }
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  MemoryStorage.prototype.processUpdate = function(defer,countobj,filter,datahash,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0,original:null};
      lib.traverse(datahash,this.updateFrom.bind(this,updatecountobj,record));
      if(updatecountobj.count){
        if(!updatecountobj.original){
          throw "No original";
        }
        if(this.events){
          this.events.recordUpdated.fire(record.clone());
        }
        defer.notify({o:updatecountobj.original,n:record.clone()});
        countobj.count++;
      }
    }
  }
  MemoryStorage.prototype.doUpdate = function(filter,datahash,defer){
    var countobj = {count:0};
    this.data.forEach(this.processUpdate.bind(this,defer,countobj,filter,datahash));
    defer.resolve(countobj.count);
  };
  MemoryStorage.prototype.processDelete = function(countobj,filter,record,recordindex,records){
    if(filter.isOK(record)){
      records.splice(recordindex,1);
      if(this.events){
        this.events.recordDeleted.fire(record.clone());
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
    if(countobj.count){
      console.log(countobj.count,'records deleted');
      console.log(this.data);
    }
    defer.resolve(countobj.count);
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
