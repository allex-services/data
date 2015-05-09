function createQueryClone(execlib,QueryBase){
  var QueryBase = execlib.dataSuite.QueryBase;

  function QueryClone(prophash){
    QueryBase.call(this,prophash);
    this.original = prophash.original;
    if(!this.original){
      throw "QueryBase can clone only an instance of QueryBase";
    }
  };
  execlib.lib.inherit(QueryClone,QueryBase);
  QueryClone.prototype.destroy = function(){
    this.original = null;
    QueryBase.prototype.destroy.call(this);
  };
  QueryClone.prototype.fields = function(){
    return this.original.fields();
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
