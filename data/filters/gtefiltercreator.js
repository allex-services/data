function createGTEFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function GTEFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(GTEFilter,FieldFilter);
  GTEFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue>=this.fieldvalue;
  };
  return GTEFilter;
}

module.exports = createGTEFilter;
