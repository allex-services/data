function createGTFilter(execlib,FieldFilter){
  var lib = execlib.lib;

  function GTFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(GTFilter,FieldFilter);
  GTFilter.prototype.isFieldOK = function(fieldvalue){
    return fieldvalue>this.fieldvalue;
  };
  return GTFilter;
}

module.exports = createGTFilter;
