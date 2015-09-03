function createRecord(execlib){
  'use strict';
  var lib = execlib.lib;

  function DefaultHandler(desc){
    this.proc = null;
    if(lib.isString(desc) && desc.length>4 && desc.indexOf('{{')===0 && desc.lastIndexOf('}}')===desc.length-2){
      this.proc = function(){
      };
    }
    this._value = desc;
    if('undefined' === typeof this._value){
      this._value = null;
    }
  }
  DefaultHandler.prototype.destroy = function(){
    this.proc = null;
    this._value = null;
  };
  DefaultHandler.prototype.value = function(){
    if(this.proc){
      return this.proc();
    }
    return this._value;
  };

  function Field(prophash){
    this.name = prophash.name;
    if(!this.name){
      throw "Field needs a name";
    }
    this.value = prophash.value;
    this.default = new DefaultHandler(prophash.default);
  }
  Field.prototype.destroy = function(){
    this.default.destroy();
    this.default = null;
    this.value = null;
    this.name = null;
  };
  Field.prototype.valueFor = function(val){
    var und;
    if(val===und){
      return this.default.value();
    }
    //TODO: validate
    return val;
  };

  function createRecordObjectCtor (fields) {
    var DataObject = execlib.dataSuite.DataObject, ret, fs = fields.map(function(f) { return "this."+f.name+" = null;"; }),
      ctorcode = "ret = function DataObject_(prophash) {\n"+fs.join("\n")+"\n DataObject.call(this, prophash);\n};\nlib.inherit(ret, DataObject);",
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

  function createHashTemplate (fields) {
    var fs = fields.map(function (f) {return f.name+": void 0";});
    return "ret = {" + fs.join(',')+"}";
  }

  function Record(prophash,visiblefields){
    if(!(prophash && prophash.fields)){
      console.trace();
      throw "Record needs the fields array in its property hash";
    }
    this.primaryKey = prophash.primaryKey;
    this.objCtor = prophash.objCtor || createRecordObjectCtor(prophash.fields);
    this.fields = [];
    this.fieldsByName = new lib.Map();
    this.hashTemplate = createHashTemplate(prophash.fields);
    prophash.fields.forEach(this.addField.bind(this,visiblefields));
  }
  Record.prototype.destroy = function(){
    this.fieldsByName.destroy();
    this.fieldsByName = null;
    lib.arryDestroyAll(this.fields);
    this.fields = null;
    this.objCtor = null;
    this.primaryKey = null;
  };
  Record.prototype.isEmpty = function(){
    return this.fields.length<1;
  };
  Record.prototype.addField = function(visiblefields,fielddesc){
    if(visiblefields && visiblefields.indexOf(fielddesc.name)<0){
      return;
    }
    var field = new Field(fielddesc);
    this.fields.push(field);
    this.fieldsByName.add(field.name,field);
  };
  Record.prototype.createTemplateHash = function () {
    var ret;
    eval (this.hashTemplate);
    return ret;
  };
  function hashFiller(prophash, obj, field) {
    prophash[field.name] = field.valueFor(obj[field.name]);
  }
  Record.prototype.filterHash = function(obj){
    var prophash = this.createTemplateHash();//{};
    this.fields.forEach(hashFiller.bind(null, prophash, obj));
    return prophash;
  };
  Record.prototype.filterObject = function(obj){
    return new(this.objCtor)(this.filterHash(obj));
  };
  Record.prototype.filterStateStream = function(item){
    if(item.o==='u' && item.p && item.p.length===1){
      var f = this.fieldsByName.get(item.p[0]);
      if(f){
        var ret = {};
        ret[f.name] = f.valueFor(item.d[0]);
        return ret;
      }
    }
  };
  Record.prototype.stateStreamFilterForRecord = function(storage,record){
    return new StateStreamFilter(storage,record,this);
  };
  Record.prototype.updatingFilterDescriptorFor = function(datahash){
    if(this.primaryKey){
      if(lib.isArray(this.primaryKey)){
        var ret = {op: 'and', filters : this.primaryKey.map(function(pkfield){
          return {
            op: 'eq', field: pkfield, value:datahash[pkfield]
          };
        })};
      }else{
        return {op:'eq',field:this.primaryKey,value:datahash[this.primaryKey]};
      }
    }else{
      return {op:'hash',d:this.filterObject(record)};
    }
  };
  Record.prototype.defaultFor = function(fieldname){
    var f = this.fieldsByName.get(fieldname);
    if(f){
      return f.valueFor();
    }else{
      return null;
    }
  };

  function StateStreamFilter(manager,recordinstance,record){
    this.manager = manager;
    this.recordinstance = recordinstance;
    this.record = record;
  }
  StateStreamFilter.prototype.destroy = function(){
    this.record = null;
    this.recordinstance = null;
    this.manager = null;
  };
  StateStreamFilter.prototype.onStream = function(item){
    var val = this.record.filterStateStream(item);
    if(val){
      this.manager.updateByDescriptor(this.record.updatingFilterDescriptorFor(this.recordinstance),val);
    }
  };
  return Record;
}

module.exports = createRecord;
