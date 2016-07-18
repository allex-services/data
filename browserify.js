ALLEX.execSuite.registry.registerClientSide('allex_dataservice',require('./sinkmapcreator')(ALLEX, ALLEX.execSuite.registry.getClientSide('.')));
ALLEX.execSuite.taskRegistry.register("allex_dataservice",require('./taskcreator')(ALLEX));
