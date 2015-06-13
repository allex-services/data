function createMemoryStorage(execlib){
  'use strict';
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
    if(this.__record.primaryKey){
      var pkval = record.get(record.primaryKey);
      if(pkval!==null){
        if(this.checkForExistenceOnPrimaryKey(pkval)){
          defer.reject(new lib.Error('PRIMARY_KEY_VIOLATION'));
          return;
        }
      }
    }
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
  MemoryStorage.prototype.onUpsertSucceeded = function(defer,createdrecord){
    defer.resolve({upserted:1});
  };
  MemoryStorage.prototype.processUpsert = function(defer,countobj,filter,datahash,options,record){
    var d = q.defer();
    this.doCreate(record,d);
    d.done(
      this.onUpsertSucceeded.bind(this,defer),
      defer.reject.bind(defer)
    );
  };
  MemoryStorage.prototype.processUpdate = function(defer,countobj,filter,datahash,options,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0,original:null};
      lib.traverse(datahash,this.updateFrom.bind(this,updatecountobj,record));
      if(updatecountobj.count){
        if(!updatecountobj.original){
          throw "No original";
        }
        if(this.events){
          this.events.recordUpdated.fire(record.clone(),updatecountobj.original);
        }
        defer.notify({o:updatecountobj.original,n:record.clone()});
        countobj.count++;
      }
    }
  }
  MemoryStorage.prototype.doUpdate = function(filter,datahash,options,defer){
    if(!this.data){
      return;
    }
    var countobj = {count:0};
    this.data.forEach(this.processUpdate.bind(this,defer,countobj,filter,datahash,options));
    if(countobj.count<1 && options && options.upsert){
      this.processUpsert(filter,datahash,options,defer);
    }else{
      defer.resolve({updated:countobj.count});
    }
  };
  MemoryStorage.prototype.processDelete = function(todelete,defer,filter,record,recordindex,records){
    if(filter.isOK(record)){
      var rc = record.clone();
      if(this.events){
        this.events.recordDeleted.fire(rc);
      }
      defer.notify(rc);
      record.destroy();
      todelete.unshift(recordindex);
    }/*else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }*/
  }
  MemoryStorage.prototype.doDelete = function(filter,defer){
    var todelete = [], data = this.data;
    this.data.forEach(this.processDelete.bind(this,todelete,defer,filter));
    /*
    console.log('deleted',deletecount,'records');
    */
    todelete.forEach(function(di){data.splice(di,1);});
    defer.resolve(todelete.length);
  };
  MemoryStorage.prototype.checkForExistenceOnPrimaryKey = function(pkval){
    var pkname = this.__record.primaryKey;
    if(!pkname){
      return false;
    }
    return this.data.some(function(record){
      if(record.get(pkname)===pkval){
        return true;
      }
    });
  };
  return MemoryStorage;
}

module.exports = createMemoryStorage;
