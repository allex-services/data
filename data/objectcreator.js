function createDataObject(execlib){
  function DataObject(prophash){
    console.log('DataObject!',prophash);
  }
  DataObject.prototype.set = function(name,val){
    this[name] = val;
  };
  DataObject.prototype.get = function(name){
    return this[name];
  };
  return DataObject;
}

module.exports = createDataObject;
