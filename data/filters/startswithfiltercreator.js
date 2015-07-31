function createStartsWithFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function StartsWithFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(StartsWithFilter,StringFieldFilter);
  StartsWithFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)===0);
  };
  return StartsWithFilter;
}

module.exports = createStartsWithFilter;
