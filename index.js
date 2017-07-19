function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['.', 'allex_datafilterslib']
    },
    sinkmap: {
      dependencies: ['.', 'allex_datafilterslib']
    },
    tasks: {
      dependencies: ['allex_datafilterslib']
    }
  };
}

module.exports = createServicePack;
