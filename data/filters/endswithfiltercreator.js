function createEndsWithFilter(execlib,StringFieldFilter){
  'use strict';
  var lib = execlib.lib;

  function EndsWithFilter(filterdescriptor){
    StringFieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(EndsWithFilter,StringFieldFilter);
  EndsWithFilter.prototype.isFieldOK = function(fieldvalue){
    return StringFieldFilter.prototype.isFieldOK(fieldvalue) && 
      (fieldvalue.firstIndexOf(this.fieldvalue)===fieldvalue.length-this.fieldvalue.length);
  };
  return EndsWithFilter;
}

module.exports = createEndsWithFilter;
