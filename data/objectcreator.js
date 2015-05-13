function createDataObject(execlib){
  var lib = execlib.lib;
  function DataObject(prophash){
    lib.traverse(prophash,this._inverseSet.bind(this));
  }
  DataObject.prototype._inverseSet = function(val,name){
    this.set(name,val);
  };
  DataObject.prototype._fieldToHash = function(hash,fieldname){
    var val = this.get(fieldname), und;
    if(val!==und){
      hash[fieldname] = val;
    }
  };
  DataObject.prototype.toHash = function(fields){
    var result = {};
    fields.forEach(this._fieldToHash.bind(this,result));
    return result;
  };
  DataObject.prototype.matchesField = function(datahash,fieldname){
    return datahash[fieldname] === this.get(fieldname);
  };
  DataObject.prototype.matches = function(datahash){
    var fns = this.fieldNames(); //overridable!
    return fns.all(this.matchesField.bind(this,datahash));
  };
  //the following methods are for override
  DataObject.prototype.fieldNames = function(){
    return Object.getOwnPropertyNames(this);
  };
  DataObject.prototype.hasFieldNamed = function(fieldname){
    return this.hasOwnProperty(fieldname);
  };
  DataObject.prototype.set = function(name,val){
    this[name] = val;
  };
  DataObject.prototype.get = function(name){
    return this[name];
  };
  return DataObject;
}

module.exports = createDataObject;
