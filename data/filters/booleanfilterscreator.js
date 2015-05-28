function createBooleanFilters(execlib,Filter,filterFactory){
  var lib = execlib.lib;

  function BooleanFilters(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.filters = [];
    if(!(filterdescriptor && lib.isArray(filterdescriptor.filters))){
      throw "No filters array in filterdescriptor";
    }
    filterdescriptor.filters.forEach(this.addFilter.bind(this));
  }
  lib.inherit(BooleanFilters,Filter);
  BooleanFilters.prototype.destroy = function(){
    lib.arryDestroyAll(this.filters);
    this.filters = null;
    Filter.prototype.destroy.call(this);
  };
  BooleanFilters.prototype.addFilter = function(filterdescriptor){
    this.filters.push(filterFactory.createFromDescriptor(filterdescriptor));
  };
  function isFilterOk(datahash,filter){
    var ret = filter.isOK(datahash);
    return ret;
  }
  BooleanFilters.prototype.isOK = function(datahash){
    var ifok = isFilterOk.bind(null,datahash);
    return this.filters[this.arrayOperation](ifok);
  };
  return BooleanFilters;
}

module.exports = createBooleanFilters;
