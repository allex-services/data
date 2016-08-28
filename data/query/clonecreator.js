function createQueryClone(execlib,QueryBase){
  'use strict';
  var lib = execlib.lib;
  var QueryBase = execlib.dataSuite.QueryBase;

  function QueryClone(original){
    QueryBase.call(this,{fields:[]},[]);
    this.record.destroy();
    this.record = original.record;
    this.original = original;
    if(!this.original){
      throw new lib.Error('NO_ORIGINAL_PROVIDED_TO_QUERY_CLONE');
    }
    if('function' !== typeof this.original.filter){
      var e = new lib.Error('ORIGINAL_FOR_QUERY_CLONE_IS_NOT_A_QUERY');
      e.original = original;
      throw e;
    }
  };
  execlib.lib.inherit(QueryClone,QueryBase);
  QueryClone.prototype.destroy = function(){
    this.original = null;
    this.record = null;
    //QueryBase.prototype.destroy.call(this); //not this, it would destroy the original record
  };
  QueryClone.prototype.filter = function(){
    return this.original ? this.original.filter() : null;
  };
  QueryClone.prototype.limit = function(){
    return this.original ? this.original.limit() : 0;
  }
  QueryClone.prototype.offset = function(){
    return this.original ? this.original.offset() : 0;
  };
  return QueryClone;
}

module.exports = createQueryClone;
