function sinkMapCreator(execlib, ParentSinkMap, datafilterslib){
  'use strict';
  if (!execlib.dataSuite) {
    require('./data')(execlib, datafilterslib);
  }
  var sinkmap = new (execlib.lib.Map);
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib, ParentSinkMap.get('service')));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib, ParentSinkMap.get('user')));
  
  return sinkmap;
}

module.exports = sinkMapCreator;
