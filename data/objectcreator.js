function createDataObject(execlib){
  var lib = execlib.lib;
  function DataObject(prophash){
    Object.getOwnPropertyNames(prophash).forEach(this._hashToField.bind(this,prophash));
  }
  DataObject.prototype._hashToField = function(hash,fieldname){
    this.set(fieldname,hash[fieldname]);
  };
  DataObject.prototype._fieldToHash = function(hash,fieldname){
    var val = this.get(fieldname), und;
    if(val!==und){
      hash[fieldname] = val;
    }
  };
  function undefize(o,name){
    o.set(name,void 0);
  }
  DataObject.prototype.destroy = function(){
    var opns = Object.getOwnPropertyNames(this);
    opns.forEach(undefize.bind(null,this));
    /*
    console.trace();
    console.log(this,'destroyed');
    */
  };
  DataObject.prototype.toHash = function(fields){
    var result = {};
    fields.forEach(this._fieldToHash.bind(this,result));
    return result;
  };
  DataObject.prototype.clone = function(){
    return this.toHash(Object.getOwnPropertyNames(this));
  };
  function equalator(o1,o2,propname){
    return o1[propname] === o2[propname];
  }
  function compareObjects(o1,o2){
    var o1pns = Object.getOwnPropertyNames(o1),
        o2pns = Object.getOwnPropertyNames(o2);
    if(o1pns.length!==o2pns.length){
      return false;
    }
    if(o1pns.length<1){
      return true;
    }
    return o1pns.every(equalator.bind(null,o1,o2));
  }
  DataObject.prototype.matchesField = function(datahash,fieldname){
    var d = datahash[fieldname],
        f = this.get(fieldname),
        tod = typeof d,
        tof = typeof f;
    if(tod!==tof){
      return false;
    }
    if(tod === 'object'){
      if(d===null){
        return f===null;
      }else if(f===null){
        return d!==null;
      }
      if(d instanceof Array){
        if(!(f instanceof Array)){
          return false;
        }
        return compareArrays(d,f);
      }
      return compareObjects(d,f);
    }
    return datahash[fieldname] === this.get(fieldname);
  };
  DataObject.prototype.matches = function(datahash){
    var fns = this.fieldNames(); //overridable!
    return fns.every(this.matchesField.bind(this,datahash));
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
