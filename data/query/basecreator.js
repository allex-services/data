function createQueryBase(execlib){
  'use strict';
  function QueryBase(recorddescriptor,visiblefields){
    /*
    console.trace();
    console.log('new QueryBase');
    */
    this.record = new (execlib.dataSuite.recordSuite.Record)(recorddescriptor,visiblefields);
  };
  QueryBase.prototype.destroy = function(){
    this.record.destroy();
    this.record = null;
  };
  QueryBase.prototype.filter = function(){
    throw "Generic QueryBase does not implement the filter method";
  };
  QueryBase.prototype.limit = function(){
    throw "Generic QueryBase does not implement the limit method";
  }
  QueryBase.prototype.offset = function(){
    throw "Generic QueryBase does not implement the offset method";
  };
  QueryBase.prototype.isEmpty = function(){
    return this.limit===0 || this.record.isEmpty();
  };
  QueryBase.prototype.isLimited = function(){
    var limit = this.limit();
    return ('number' === typeof limit) && limit>0 && limit<Infinity;
  };
  QueryBase.prototype.isOffset = function(){
    var offset = this.offset();
    return ('number' === typeof offset) && offset!==0;
  };
  QueryBase.prototype.isOK = function(datahash){
    var flt = this.filter();
    return flt ? flt.isOK(datahash) : true;
  };
  QueryBase.prototype.processUpdateExact = function(original,_new){
    var ook = this.isOK(original),
        _nok = this.isOK(_new),
        uf;
    if(ook){
      uf = this.record.updatingFilterDescriptorFor(original);
      if(_nok){
        //update
        return ['u', uf, _new];
      }else{
        //deletion
        return ['d', uf];
      }
    }else{
      if(_nok){
        //create
        return ['c', _new];
      }else{
        //nothing
      }
    }
  };
  QueryBase.prototype.onStream = function(item){
    /*
    console.trace();
    console.log('Query onStream',item);
    */
    switch(item[0]){
      case 'r1':
        if(this.isOK(item[2])){
          return [item[0], item[1], this.record.filterHash(item[2])];
        }
        break;
      case 'c':
        if(this.isOK(item[1])){
          return [item[0], this.record.filterHash(item[1])];
        }
        break;
      case 'ue':
        return this.processUpdateExact(item[2],item[1]);
      default:
        return item;
    }
  };
  return QueryBase;
}

module.exports = createQueryBase;
