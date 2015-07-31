function createContainsFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function ContainsFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(ContainsFilter,StringFieldFilter);
  ContainsFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)>=0);
  };
  return ContainsFilter;
}

module.exports = createContainsFilter;
