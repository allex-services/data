function createDataCoder(execlib){
  'use strict';
  var lib = execlib.lib,
      uid = lib.uid;

  function DataCoder(){
  }
  DataCoder.prototype.destroy = execlib.lib.dummyFunc;
  DataCoder.prototype.create = function(datahash){
    return ['c', datahash];
    /*
    return {
      o: 'c',
      d: datahash
    };
    */
  };
  DataCoder.prototype.startRead = function(){
    return ['rb', uid()];
    /*
    return {
      o: 'rb',
      d: uid()
    };
    */
  };
  DataCoder.prototype.readOne = function(startreadrecord,datahash){
    return ['r1', startreadrecord.d, datahash];
    /*
    return {
      o: 'r1',
      id: startreadrecord.d,
      d: datahash
    };
    */
  };
  DataCoder.prototype.endRead = function(startreadrecord){
    return ['re', startreadrecord[1]];
    /*
    return {
      o: 're',
      d: startreadrecord.d
    };
    */
  };
  DataCoder.prototype.read = function(arrayofhashes){
    return ['r', arrayofhashes];
    /*
    return {
      o: 'r',
      d: arrayofhashes
    };
    */
  };
  DataCoder.prototype.update = function(filter,datahash){
    return ['u', filter.descriptor(), datahash];
    /*
    return {
      o: 'u',
      f:filter.descriptor(),
      d:datahash
    };
    */
  };
  DataCoder.prototype.updateExact = function(updateexactobject){
    return ['ue', updateexactobject[0], updateexactobject[1]];
    /*
    if(!('o' in updateexactobject && 'n' in updateexactobject)){
      throw "Bad updateExact";
    }
    return {
      o: 'ue',
      d: updateexactobject
    };
    */
  };
  DataCoder.prototype.delete = function(filter){
    return ['d', filter.descriptor()];
    /*
    return {
      o: 'd',
      d: filter.descriptor()
    };
    */
  };
  return DataCoder;
}

module.exports = createDataCoder;
