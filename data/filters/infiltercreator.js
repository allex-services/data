function createInFilter(execlib,FieldFilter){
  'use strict';
  var lib = execlib.lib;

  function InFilter(filterdescriptor){
    FieldFilter.call(this,filterdescriptor);
  }
  lib.inherit(InFilter,FieldFilter);
  InFilter.prototype.isFieldOK = function(fieldvalue){
    if (!lib.isArray(this.fieldvalue)) {
      throw new lib.Error('value for "in" filter needs to be an array');
    }
    return this.fieldvalue.indexOf(fieldvalue) >= 0;
  };
  return InFilter;
}

module.exports = createInFilter;
