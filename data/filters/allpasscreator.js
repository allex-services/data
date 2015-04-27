function createAllPassFilter(execlib,Filter){
  var lib = execlib.lib;
  function AllPass(filterdescriptor){
    Filter.call(this,filterdescriptor);
  }
  lib.inherit(AllPass,Filter);
  AllPass.prototype.isOK = function(datahash){
    return true;
  }
  return AllPass;
}

module.exports = createAllPassFilter;
