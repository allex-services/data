function createDataDecoder(execlib){
  'use strict';
  var lib = execlib.lib,
      q = lib.q,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory;

  function Decoder(storable){
    this.storable = storable;
    this.queryID = null;
  }
  function destroyer (qi) {
    if (qi.destroy) {
      qi.destroy();
    }
  }
  Decoder.prototype.destroy = function(){
    var qi;
    this.queryID = null;
    this.storable = null;
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder', this.storable.__id,'got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item[0]){
      case 'i':
        this.setID(item[1]);
        break;
      case 'rb':
        this.beginRead(item[1]);
        break;
      case 're':
        this.endRead(item[1]);
        break;
      case 'r1':
        this.readOne(item[2]);
        break;
      case 'c':
        this.create(item[1]);
        break;
      case 'ue':
        this.updateExact(item[1], item[2]);
        break;
      case 'u':
        this.update(item[1], item[2]);
        break;
      case 'd':
        this.delete(item[1]);
        break;
    }
  };
  Decoder.prototype.setID = function (id) {
    this.queryID = id;
    return lib.q(true);
  };
  Decoder.prototype.beginRead = function(itemdata){
    return this.storable.beginInit(itemdata);
  };
  Decoder.prototype.endRead = function(itemdata){
    this.storable.endInit(itemdata);
    return lib.q(true);
  };
  Decoder.prototype.readOne = function(itemdata){
    return this.storable.create(itemdata);
  };
  Decoder.prototype.create = function(itemdata){
    return this.storable.create(itemdata);
  };
  Decoder.prototype.delete = function(itemdata){
    var f = filterFactory.createFromDescriptor(itemdata);
    if(!f){
      console.error('NO FILTER FOR',itemdata);
      return lib.q(true);
    }else{
      //console.log(this.storable,this.storable.delete.toString(),'will delete');
      return this.storable.delete(f);
    }
  };
  Decoder.prototype.updateExact = function(newitem, olditem){
    var f = filterFactory.createFromDescriptor({op:'hash',d:olditem});
    return this.storable.update(f,newitem);
  };
  Decoder.prototype.update = function(filter, datahash){
    var f = filterFactory.createFromDescriptor(filter);
    return this.storable.update(f,datahash);
  };
  return Decoder;
}

module.exports = createDataDecoder;
