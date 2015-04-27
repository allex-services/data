function createRecord(execlib){
  var lib = execlib.lib;

  function Field(prophash){
    this.name = prophash.name;
    if(!this.name){
      throw "Field needs a name";
    }else{
      console.log('Field name',this.name);
    }
    this.value = prophash.value;
  }
  Field.prototype.destroy = function(){
    this.name = null;
    this.value = null;
  };

  function Record(prophash){
    if(!(prophash && prophash.fields)){
      console.trace();
      throw "Record needs the fields array in its property hash";
    }
    this.fields = [];
    prophash.fields.forEach(this.addField.bind(this));
  }
  Record.prototype.destroy = lib.dummyFunc;
  Record.prototype.addField = function(fielddesc){
    this.fields.push(new Field(fielddesc));
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
