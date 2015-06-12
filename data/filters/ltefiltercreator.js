function createLTEFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function LTEFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(LTEFilter,FieldFilter);
  LTEFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue<=this.fieldvalue;
  };
  return LTEFilter;
}

module.exports = createLTEFilter;
