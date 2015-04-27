function createRecordStorage(execlib,Record){
  var lib = execlib.lib;
  function RecordStorage(recorddescriptor){
    this.record = new Record(recorddescriptor);
    this.primaryKeyName = recorddescriptor.PK;
    this.data = [];
  }
  RecordStorage.prototype.destroy = function(){
    this.data = null;
    this.primaryKeyName = null;
  };
  RecordStorage.prototype.setIfRecordMatchesPrimaryKey = function(resultobj,primarykeyvalue,record){
    if(primarykeyvalue===record[this.primaryKeyName]){
      resultobj.result = record;
      return true;
    }
    return false;
  };
  RecordStorage.prototype.findRecord = function(primarykeyvalue){
    var record = {result:null};
    this.data.some(this.setIfRecordMatchesPrimaryKey.bind(this,record,primarykeyvalue));
    return record.result;
  };
  RecordStorage.prototype.recordDescriptor = [];
  RecordStorage.inherit = function(childctor,childrecorddescriptor){
    lib.inherit(childctor,this);

  };
  return RecordStorage;
}

module.exports = createRecordStorage;
