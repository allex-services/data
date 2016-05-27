function createDataObject(execlib){
  'use strict';
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
    return hash;
  };
  function undefize(o,name){
    o.set(name,void 0);
  }
  DataObject.prototype.destroy = function(){
    /*
    var opns = Object.getOwnPropertyNames(this);
    opns.forEach(undefize.bind(null,this));
    console.trace();
    console.log(this,'destroyed');
    */
  };
  DataObject.prototype.templateHash = function () {
    return {};
  };
  DataObject.prototype.toHash = function(fields){
    //return fields.reduce(this._fieldToHash.bind(this),this.templateHash());
    var ret = this.templateHash(), l = fields.length, f, val, und;
    for (var i=0; i<l; i++) {
      f = fields[i];
      val = this.get(f);
      if (val!==und) {
        ret[f] = val;
      }
    }
    return ret;
  };
  DataObject.prototype.clone = function(){
    return this.toHash(Object.getOwnPropertyNames(this));
  };
  function equalator(o1,o2,propname){
    return o1[propname] === o2[propname];
  }
  function compareObjects(o1,o2){
    var o1pns = Object.getOwnPropertyNames(o1),
        o2pns = Object.getOwnPropertyNames(o2),
        ret;
    if(o1pns.length!==o2pns.length){
      return false;
    }
    if(o1pns.length<1){
      return true;
    }
    ret = o1pns.every(equalator.bind(null,o1,o2));
    o1 = null;
    o2 = null;
    return ret;
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
    var ret = this.fieldNames().every(this.matchesField.bind(this,datahash));
    datahash = null;
    return ret;
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
  //return DataObject;

  function recordFieldMapper(f) { return "this."+f.name+" = null;"; }
  function createRecordObjectCtor (fields) {
    var ret, fs = fields.map(recordFieldMapper).join("\n"),
      ctorcode = "ret = function DataObject_(prophash) {\n"+fs+"\n DataObject.call(this, prophash);\n};\nlib.inherit(ret, DataObject);",
      hashtemplate = createHashTemplate(fields);
    eval(ctorcode);
    ret.prototype.templateHash = function (){
      var ret;
      eval(hashtemplate);
      return ret;
    };
    return ret;
    //return execlib.dataSuite.DataObject;
  }

  function RecordHiveElement (fid, fields) {
    this.id = fid;
    this.ctor = createRecordObjectCtor(fields);
    this.template = createHashTemplate(fields);
  }
  RecordHiveElement.prototype.destroy = function () {
    this.template = null;
    this.ctor = null;
    this.id = null;
  };

  function templateFieldMapper (f) {
    return f.name+": void 0";
  }
  function createHashTemplate (fields) {
    var fs = fields.map(templateFieldMapper);
    return "ret = {" + fs.join(',')+"}";
  }

  function hiveFieldConcatenator(res, f) { return res + '_' + f.name; }
  function fieldsid (fields) {
    return fields.reduce(hiveFieldConcatenator, '');
  };
  function RecordHive () {
    lib.Map.call(this);
  }
  lib.inherit(RecordHive, lib.Map);
  RecordHive.prototype.give = function (fields) {
    var fid = fieldsid(fields),
      ret = this.get(fid);
    if (!ret) {
      ret = new RecordHiveElement(fid, fields);
      this.add(fid, ret);
    }
    return ret;
  };
  RecordHive.prototype.dec = function (templateobject) {
    if (!(templateobject && templateobject.fid)) {
      return;
    }
    templateobject = this.remove(templateobject.fid);
    if (templateobject) {
      templateobject.destroy();
      templateobject = null;
    }
  };
  
  //var _recordHive = new RecordHive();
  return new RecordHive();

}

module.exports = createDataObject;
