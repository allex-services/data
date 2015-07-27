function createWriterUser(execlib,User,userSessionFactory){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      Query = dataSuite.Query,
      recordSuite = dataSuite.recordSuite;

  function WriterUser(prophash){
    this.distributor = null;
    this._filter = null;
    this._sessionsToAttach = new lib.Fifo();
    this.constructSelf(prophash);
  }
  require('./common/inherit')(execlib,WriterUser,User,require('../methoddescriptors/writeruser'),userSessionFactory);
  WriterUser.prototype.isEmpty = function () {
    return true; //nota bene!
  };

  return WriterUser;
}

module.exports = createWriterUser;
