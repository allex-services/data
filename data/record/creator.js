function createRecord(execlib){
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

  function Record(prophash,visiblefields){
    if(!(prophash && prophash.fields)){
      console.trace();
      throw "Record needs the fields array in its property hash";
    }
    this.objCtor = prophash.objCtor || execlib.dataSuite.DataObject;
    this.fields = [];
    this.fieldsByName = new lib.Map();
    prophash.fields.forEach(this.addField.bind(this,visiblefields));
  }
  Record.prototype.destroy = function(){
    this.fieldsByName.destroy();
    this.fieldsByName = null;
    lib.arryDestroyAll(this.fields);
    this.fields = null;
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
  Record.prototype.filterObject = function(obj){
    var prophash = {};
    this.fields.forEach(function(field){
      prophash[field.name] = field.valueFor(obj[field.name]);
    });
    return new this.objCtor(prophash);
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
      this.manager.updateByDescriptor({op:'hash',d:this.record.filterObject(this.recordinstance)},val);
    }
  };
  return Record;
}

module.exports = createRecord;
