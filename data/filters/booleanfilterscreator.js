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
  BooleanFilters.prototype.destroy = function(){
    lib.arryDestroyAll(this.filters);
    this.filters = null;
  };
  BooleanFilters.prototype.addFilter = function(filterdescriptor){
    this.filters.push(filterFactory.createFromDescriptor(filterdescriptor));
  };
  function isFilterOk(datahash,filter){
    return filter.isOK(datahash);
  }
  BooleanFilters.prototype.isOK = function(datahash){
    var ifok = isFilterOk.bind(null,datahash);
    return this.filters[this.arrayOperation](ifok);
  };
  return BooleanFilters;
}

module.exports = createBooleanFilters;
