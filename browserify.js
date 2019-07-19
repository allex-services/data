var lR = ALLEX.execSuite.libRegistry;
ALLEX.execSuite.registry.registerClientSide('allex_dataservice',require('./sinkmapcreator')(ALLEX, ALLEX.execSuite.registry.getClientSide('.'), lR.get('allex_datalib')));
