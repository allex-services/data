function createRecord(execlib){
  var lib = execlib.lib;

  function Field(prophash){
    this.name = prophash.name;
    if(!this.name){
      throw "Field needs a name";
    }
    this.value = prophash.value;
    this.default = prophash.default || null;
  }
  Field.prototype.destroy = function(){
    this.name = null;
    this.value = null;
  };
  Field.prototype.valueFor = function(val){
    var und;
    if(val===und){
      return this.default;
    }
    //TODO: validate
    return val;
  };

  function Record(prophash){
    if(!(prophash && prophash.fields)){
      console.trace();
      throw "Record needs the fields array in its property hash";
    }
    this.objCtor = prophash.objCtor || execlib.dataSuite.DataObject;
    this.fields = [];
    this.fieldsByName = new lib.Map();
    prophash.fields.forEach(this.addField.bind(this));
  }
  Record.prototype.destroy = function(){
    this.fieldsByName.destroy();
    this.fieldsByName = null;
    lib.arryDestroyAll(this.fields);
    this.fields = null;
  };
  Record.prototype.addField = function(fielddesc){
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
  Record.prototype.stateStreamFilterForRecord = function(storage,datahash){
    return new StateStreamFilter(storage,datahash,this);
  };

  function StateStreamFilter(manager,datahash,record){
    this.manager = manager;
    this.hashfilterdescriptor = {op:'hash',d:datahash};
    this.record = record;
  }
  StateStreamFilter.prototype.destroy = function(){
    this.manager = null;
    this.hashfilterdescriptor = null;
    this.record = null;
  };
  StateStreamFilter.prototype.onStream = function(item){
    var val = this.record.filterStateStream(item);
    if(val){
      this.manager.updateByDescriptor(this.hashfilterdescriptor,val);
    }
  };

  /*
  Record.createFrom = function(prophash){
    if(!(prophash && prophash.type)){
      throw "Record needs type in its description";
    }
    switch(prophash.type){
      case 'static':
        return new StaticPart(prophash);
      case 'remote':
        return new RemotePart(prophash);
      default:
        throw "RecordPart type "+prophash.type+" not recognized";
    }
  };

  function StaticPart(prophash){
    Part.call(this,prophash);
  }
  lib.inherit(StaticPart,Part);
  StaticPart.prototype.FieldCtor = StaticField;
  StaticPart.prototype.type = 'static';

  function RemotePart(prophash){
    Part.call(this,prophash);
    this.source = prophash.source;
    this.client = null;//connect to data provider??
  }
  lib.inherit(RemotePart,Part);
  RemotePart.prototype.FieldCtor = RemoteField;
  RemotePart.prototype.type = 'remote';


  function Record(parts){
    if(!(parts && lib.isArray(parts))){
      throw "Record needs the recordparts array";
    }
    this.length = 0;
    this.parts = [];
    this.fields = new lib.Map();
    parts.forEach(this.addPart.bind(this));
  }
  Record.prototype.destroy = function(){
    this.fields.destroy();
    this.fields = null;
    lib.arryDestroyAll(this.parts);
    this.parts = null;
    this.length = null;
  };
  Record.prototype.addPart = function(partdesc){
    var rp = Part.createFrom(partdesc);
    rp.fields.forEach(this.addField.bind(this));
    this.length += rp.length;
    this.parts.push(rp);
  };
  Record.prototype.addField = function(field){
    this.fields.add(field.name,field);
  };
  */
  return Record;
}

module.exports = createRecord;
