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
  function mismatch(obj,item,itemname){
    if(obj[itemname]!==item){
      return true;
    }
  }
  HashFilter.prototype.isOK = function(datahash){
    return !(lib.traverseConditionally(datahash,mismatch.bind(null,this.hash)));
  };
  return HashFilter;
}

module.exports = createHashFilter;

