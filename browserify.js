ALLEX.execSuite.registry.registerClientSide('allex_dataservice',require('./sinkmapcreator')(ALLEX, ALLEX.execSuite.registry.getClientSide('.'), ALLEX.execSuite.libRegistry.get('allex_datafilterslib')));
ALLEX.execSuite.taskRegistry.register("allex_dataservice",require('./taskcreator')(ALLEX, ALLEX.execSuite.libRegistry.get('allex_datafilterslib')));
