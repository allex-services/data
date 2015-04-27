function createLTFilter(execlib,FieldFilter){
  var lib = execlib.lib;

  function LTFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(LTFilter,FieldFilter);
  LTFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue<this.fieldvalue;
  };
  return LTFilter;
}

module.exports = createLTFilter;
