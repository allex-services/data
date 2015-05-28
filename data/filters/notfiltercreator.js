function createNotFilter(execlib,Filter,factory){
  var lib = execlib.lib;
  function NotFilter(prophash){
    Filter.call(this,prophash);
    if(!(filterdescriptor && 'filter' in filterdescriptor)){
      throw "No filter field in filterdescriptor";
    }
    this.filter = factory.createFromDescriptor(filterdescriptor.filter);
  }
  lib.inherit(NotFilter,Filter);
  NotFilter.prototype.destroy = function(){
    this.filter.destroy();
    this.filter = null;
    Filter.prototype.destroy.call(this);
  };
  NotFilter.prototype.isOK = function(datahash){
    return !(this.filter.isOK(datahash));
  };
  return NotFilter;
}

module.exports = createNotFilter;
