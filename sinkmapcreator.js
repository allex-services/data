function sinkMapCreator(execlib){
  'use strict';
  var sinkmap = new (execlib.lib.Map);
  sinkmap.add('service',require('./sinks/servicesinkcreator')(execlib));
  sinkmap.add('user',require('./sinks/usersinkcreator')(execlib));
  
  return sinkmap;
}

module.exports = sinkMapCreator;
