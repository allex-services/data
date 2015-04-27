function createOrFilters(execlib,BooleanFilters){
  var lib = execlib.lib;

  function OrFilters(filterdescriptor){
    BooleanFilters.call(this,filterdescriptor);
  }
  execlib.lib.inherit(OrFilters,BooleanFilters);
  OrFilters.prototype.arrayOperation = 'some';
  return OrFilters;
}

module.exports = createOrFilters;
