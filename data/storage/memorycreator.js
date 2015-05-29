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
    if(!this.data){
      return;
    }
    var countobj = {count:0};
    this.data.forEach(this.processUpdate.bind(this,defer,countobj,filter,datahash));
    defer.resolve(countobj.count);
  };
  MemoryStorage.prototype.processDelete = function(defer,filter,record,recordindex,records){
    if(filter.isOK(record)){
      //console.log('really deleting',record);
      records.splice(recordindex,1);
      var rc = record.clone();
      if(this.events){
        this.events.recordDeleted.fire(rc);
      }
      defer.notify(rc);
      record.destroy();
      return true;
    }/*else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }*/
    return false;
  }
  MemoryStorage.prototype.performDeletePass = function(filter,defer){
    return this.data.some(this.processDelete.bind(this,defer,filter));
  };
  MemoryStorage.prototype.doDelete = function(filter,defer){
    var deletecount = 0;
    while(this.performDeletePass(filter,defer)){
      deletecount++;
    }
    /*
    console.log('deleted',deletecount,'records');
    */
    defer.resolve(deletecount);
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
