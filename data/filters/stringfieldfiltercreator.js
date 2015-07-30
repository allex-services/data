function createStringFieldFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function StringFieldFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(StringFieldFilter,FieldFilter);
  StringFieldFilter.prototype.isFieldOK = function(fieldvalue){
    return lib.isString(fieldvalue);
  };
  return StringFieldFilter;
}

module.exports = createStringFieldFilter;
