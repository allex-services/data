function createQueryBase(execlib){
  function QueryBase(prophash){
  };
  QueryBase.prototype.destroy = execlib.lib.dummyFunc;
  QueryBase.prototype.fields = function(){
    console.trace();
    console.log(this.original.fields.toString());
    throw "Generic QueryBase does not implement the fields method";
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
    var flds = this.fields();
    return this.limit===0||(!(flds&&flds.length));
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
  return QueryBase;
}

module.exports = createQueryBase;
