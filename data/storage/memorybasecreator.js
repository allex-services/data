function createMemoryStorageBase (execlib) {
  'use strict';
  var lib = execlib.lib,
    dataSuite = execlib.dataSuite,
    StorageBase = dataSuite.StorageBase;

  function MemoryStorageBase(storagedescriptor,data){
    StorageBase.call(this,storagedescriptor);
    this.mydata = !data;
    this.data = data || this._createData();
  }
  execlib.lib.inherit(MemoryStorageBase,StorageBase);
  MemoryStorageBase.prototype.destroy = function(){
    if (this.mydata) {
      this._destroyDataWithElements();
    }
    this.mydata = null;
    this.data = null;
    StorageBase.prototype.destroy.call(this);
  };
  MemoryStorageBase.prototype.doCreate = function(record,defer){
    if (!this.__record) {
      defer.resolve(null);
      return;
    }
    var mpk = this.__record.primaryKey, pr;
    if (mpk) {
      if (lib.isArray(mpk)) {
        var violation = this.recordViolatesComplexPrimaryKey(record);
        if (violation) {
          defer.reject(violation);
          return;
        }
      } else {
        var violation = this.recordViolatesSimplePrimaryKey(record);
        if (violation) {
          defer.reject(violation);
          return;
        }
      }
    }
    pr = this.data.push(record);
    if (pr && 'function' === typeof pr.done) {
      pr.done(
        defer.resolve.bind(defer, record),
        defer.reject.bind(defer)
      );
    } else {
      defer.resolve(record/*.clone()*/);
    }
  };
  function processRead(__id,query,defer,item){
    if(query.isOK(item)){
      //defer.notify(item.toHash(query.fields()));
      defer.notify(item);
    }
  }
  MemoryStorageBase.prototype.doRead = function(query,defer){
    if (!this.data) {
      defer.resolve(null);
      return;
    }
    if(!(query.isLimited()||query.isOffset())){
      this._traverseData(processRead.bind(null,this.__id,query,defer)).then(defer.resolve.bind(defer, null));
    }else{
      var start = query.offset, end=Math.min(start+query.limit,this.data.length);
      this._traverseDataRange(processRead.bind(null, this.__id,query, defer), start, end).then(defer.resolve.bind(defer, null));
      /*
      for(var i=start; i<end; i++){
        processRead(query,defer,this.__record.filterHash(this.data[i]));
      }
      */
    }
  };
  MemoryStorageBase.prototype.updateFrom = function(countobj,record,updateitem,updateitemname){
    if(record.hasFieldNamed(updateitemname)){
      if(countobj.count<1){
        countobj.original = record.clone();
      }
      countobj.count++;
      record.set(updateitemname,updateitem);
    }
  }
  MemoryStorageBase.prototype.onUpsertSucceeded = function(defer,createdrecord){
    defer.resolve({upserted:1});
  };
  MemoryStorageBase.prototype.processUpsert = function(defer,countobj,filter,datahash,options,record){
    var d = q.defer();
    this.doCreate(record,d);
    d.done(
      this.onUpsertSucceeded.bind(this,defer),
      defer.reject.bind(defer)
    );
  };
  MemoryStorageBase.prototype.processUpdate = function(defer,countobj,filter,datahash,options,record){
    if(filter.isOK(record)){
      var updatecountobj = {count:0,original:null};
      lib.traverse(datahash,this.updateFrom.bind(this,updatecountobj,record));
      if(updatecountobj.count){
        if(!updatecountobj.original){
          throw "No original";
        }
        if(this.events){
          this.events.recordUpdated.fire(record/*.clone()*/,updatecountobj.original);
        }
        defer.notify([record, updatecountobj.original]);
        countobj.count++;
      }
    }
  }
  MemoryStorageBase.prototype.doUpdate = function(filter,datahash,options,defer){
    if(!this.data){
      defer.reject(new lib.Error('NO_DATA_IN_STORAGE'));
      return;
    }
    var countobj = {count:0};
    this._traverseData(this.processUpdate.bind(this,defer,countobj,filter,datahash,options));
    if(countobj.count<1 && options && options.upsert){
      this.processUpsert(filter,datahash,options,defer);
    }else{
      defer.resolve({updated:countobj.count});
    }
  };
  MemoryStorageBase.prototype.processDelete = function(todelete,defer,filter,record,recordindex,records){
    if(filter.isOK(record)){
      if(this.events){
        this.events.recordDeleted.fire(record);
      }
      defer.notify(record);
      record.destroy();
      todelete.unshift(recordindex);
    }/*else{
      console.log('not deleting',record,'due to mismatch in',require('util').inspect(filter,{depth:null}));
    }*/
  }
  MemoryStorageBase.prototype.doDelete = function(filter,defer){
    if (!this.data) {
      defer.resolve(0);
      return;
    }
    var todelete = [], data = this.data;
    this._traverseData(this.processDelete.bind(this,todelete,defer,filter));
    todelete.forEach(this._removeDataAtIndex.bind(null, this.data));
    defer.resolve(todelete.length);
  };
  MemoryStorageBase.prototype.recordViolatesSimplePrimaryKey = function (rec) {
    var spk = this.__record.primaryKey, spv = rec.get(spk), affectedrecord;
    if (this._traverseConditionally(function (record) {
      if (record.get(spk) === spv) {
        affectedrecord = record;
        return true;
      }
    })) {
      var e = new lib.Error('PRIMARY_KEY_VIOLATION');
      e.affectedrecord = affectedrecord;
      return e;
    }
  };
  MemoryStorageBase.prototype.recordViolatesComplexPrimaryKey = function (rec) {
    var pknames = this.__record.primaryKey,
      missingpkvals = [],
      pkvals = pknames.map(function (pkn) {
        var ret = rec.get(pkn);
        if (ret === null) {
          missingpkvals.push(pkn);
        }
        return ret;
      }),
      e,
      pkcount = pknames.length,
      affectedrecord;
    if (missingpkvals.length){
      e = new lib.Error('MISSING_PRIMARY_KEY_SEGMENT','Complex primary key violated at certain segments');
      e.missing = missingpkvals;
      return e;
    }
    if (this._traverseConditionally(function (record) {
      var matchcnt = 0;
      pknames.forEach(function (pkn, pknind) {
        if (record.get(pkn) === pkvals[pknind]){
          matchcnt++;
        }
      });
      if (matchcnt===pkcount) {
        affectedrecord = record;
        return true;
      }
    })) {
      e = new lib.Error('PRIMARY_KEY_VIOLATION');
      e.affectedrecord = affectedrecord;
      return e;
    }
  };
  return MemoryStorageBase;

}

module.exports = createMemoryStorageBase;
