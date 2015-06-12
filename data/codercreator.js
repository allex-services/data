function createDataCoder(execlib){
  'use strict';
  var lib = execlib.lib,
      uid = lib.uid;

  function DataCoder(){
  }
  DataCoder.prototype.destroy = execlib.lib.dummyFunc;
  DataCoder.prototype.create = function(datahash){
    return {
      o: 'c',
      d: datahash
    };
  };
  DataCoder.prototype.startRead = function(){
    return {
      o: 'rb',
      d: uid()
    };
  };
  DataCoder.prototype.readOne = function(startreadrecord,datahash){
    return {
      o: 'r1',
      d: {
        id: startreadrecord.d,
        d: datahash
      }
    };
  };
  DataCoder.prototype.endRead = function(startreadrecord){
    return {
      o: 're',
      d: startreadrecord.d
    };
  };
  DataCoder.prototype.read = function(arrayofhashes){
    return {
      o: 'r',
      d: arrayofhashes
    };
  };
  DataCoder.prototype.update = function(filter,datahash){
    return {
      o: 'u',
      d: {
        f:filter.descriptor(),
        d:datahash
      }
    };
  };
  DataCoder.prototype.updateExact = function(updateexactobject){
    if(!('o' in updateexactobject && 'n' in updateexactobject)){
      throw "Bad updateExact";
    }
    return {
      o: 'ue',
      d: updateexactobject
    };
  };
  DataCoder.prototype.delete = function(filter){
    return {
      o: 'd',
      d: filter.descriptor()
    };
  };
  return DataCoder;
}

module.exports = createDataCoder;
