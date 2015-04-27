function createFieldFilter(execlib,Filter){
  function FieldFilter(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.fieldname = filterdescriptor.field;
    if(!this.fieldname){
      throw "No fieldname in filterdescriptor";
    }
    this.fieldvalue = filterdescriptor.value;
  }
  FieldFilter.prototype.destroy = function(){
    this.fieldname = null;
    Filter.prototype.destroy.call(this);
  };
  FieldFilter.prototype.isOK = function(datahash){
    if(!(this.fieldname in datahash)){
      return true;
    }
    return this.isFieldOK(datahash[this.fieldname]);
  };
  FieldFilter.prototype.isFieldOK = function(fieldvalue){
    throw "Generic FieldFilter does not implement isFieldOK";
  };
  return FieldFilter;
};

module.exports = createFieldFilter;
