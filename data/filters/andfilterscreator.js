function createAndFilters(execlib,BooleanFilters){
  var lib = execlib.lib;

  function AndFilters(filterdescriptor){
    BooleanFilters.call(this,filterdescriptor);
  }
  lib.inherit(AndFilters,BooleanFilters);
  AndFilters.prototype.arrayOperation = 'every';
  return AndFilters;
}

module.exports = createAndFilters;
