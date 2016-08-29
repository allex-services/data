function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['.', 'allex:datafilters:lib']
    },
    sinkmap: {
      dependencies: ['.', 'allex:datafilters:lib']
    },
    tasks: {
      dependencies: ['allex:datafilters:lib']
    }
  };
}

module.exports = createServicePack;
