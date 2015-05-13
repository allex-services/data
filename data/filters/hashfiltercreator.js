function createHashFilter(execlib,Filter){
  var lib = execlib.lib;

  function HashFilter(filterdescriptor){
    Filter.call(this,filterdescriptor);
    this.hash = filterdescriptor.d;
  }
  lib.inherit(HashFilter,Filter);
  HashFilter.prototype.destroy = function(){
    this.hash = null;
  };
  HashFilter.prototype.isOK = function(record){
    return record.matches(this.hash);
  };
  return HashFilter;
}

module.exports = createHashFilter;

