function createFilter(execlib){
  function Filter(filterdescriptor){
  }
  Filter.prototype.destroy = function(){
  };
  Filter.prototype.isOK = function(datahash){
    throw "Generic filter does not implement isOK";
  };
  return Filter;
}

module.exports = createFilter;
