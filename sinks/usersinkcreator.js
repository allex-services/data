function createUserSink(execlib){
  var lib = execlib.lib,
      execSuite = execlib.execSuite,
      ServiceSink = execSuite.ServiceSink,
      recordSuite = execlib.dataSuite.recordSuite;

  function UserSink(prophash,client){
    ServiceSink.call(this,prophash,client);
    this.consumeChannel('d',this.onData.bind(this));
  }
  ServiceSink.inherit(UserSink,require('../methoddescriptors/user'));
  UserSink.inherit = recordSuite.utils.sinkInheritProc;
  UserSink.prototype.visibleFields = [];
  ServiceSink.prototype.createStateFilter = function(){
    //TODO: create your filter here
    return null;
  };
  ServiceSink.prototype.onData = function(item){
    console.log(this.clientuser.client.identity.session,'onData',item);
  };
  return UserSink;
}

module.exports = createUserSink;
