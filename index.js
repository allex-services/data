function createServicePack(execlib){
  'use strict';

  return {
    service: {
      dependencies: ['.', 'allex_datalib']
    },
    sinkmap: {
      dependencies: ['.', 'allex_datalib']
    }/*,
    tasks: {
      dependencies: ['allex_datalib']
    }*/
  };
}

module.exports = createServicePack;
