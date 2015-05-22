function createQueryClone(execlib,QueryBase){
  var QueryBase = execlib.dataSuite.QueryBase;

  function QueryClone(original){
    QueryBase.call(this,{fields:[]},[]);
    this.record.destroy();
    this.record = original.record;
    this.original = original;
    if(!this.original){
      throw "QueryBase can clone only an instance of QueryBase";
    }
  };
  execlib.lib.inherit(QueryClone,QueryBase);
  QueryClone.prototype.destroy = function(){
    this.original = null;
    this.record = null;
    //QueryBase.prototype.destroy.call(this); //not this, it would destroy the original record
  };
  QueryClone.prototype.filter = function(){
    return this.original.filter();
  };
  QueryClone.prototype.limit = function(){
    return this.original.limit();
  }
  QueryClone.prototype.offset = function(){
    return this.original.offset();
  };
  return QueryClone;
}

module.exports = createQueryClone;
