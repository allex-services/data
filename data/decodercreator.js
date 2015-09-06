function createDataDecoder(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory;

  function Decoder(storable){
    this.storable = storable;
    this.working = false;
    this.q = new lib.Fifo();
  }
  Decoder.prototype.destroy = function(){
    this.q.destroy();
    this.q = null;
    this.working = null;
    this.storable = null;
  };
  Decoder.prototype.enq = function() {
    if(this.working){
      //console.log('saving',Array.prototype.slice.call(arguments));
      this.q.push(Array.prototype.slice.call(arguments));
    }else{
      var command = arguments[0], args = Array.prototype.slice.call(arguments,1);
      this.working = true;
      //console.log('Decoder doing',command,'on',this.storable.__id,this.storable.data);
      //console.log('doing',command, args);
      try {
      (this[command]).apply(this,args);
      } catch (e) {
        console.error(e.stack);
        console.error(e);
      }
    }
  };
  Decoder.prototype.deq = function(){
    this.working = false;
    if(this.q.length){
      var p = this.q.pop();
      this.enq.apply(this, p);
    }
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item[0]){
      case 'rb':
        this.enq('beginRead',item[1]);
        break;
      case 're':
        this.enq('endRead',item[1]);
        break;
      case 'r1':
        this.enq('readOne',item[2]);
        break;
      case 'c':
        this.enq('create',item[1]);
        break;
      case 'ue':
        this.enq('updateExact',item[1], item[2]);
        break;
      case 'u':
        this.enq('update',item[1], item[2]);
        break;
      case 'd':
        this.enq('delete',item[1]);
        break;
    }
  };
  Decoder.prototype.beginRead = function(itemdata){
    this.storable.beginInit(itemdata);
    this.deq();
  };
  Decoder.prototype.endRead = function(itemdata){
    this.storable.endInit(itemdata);
    this.deq();
  };
  Decoder.prototype.readOne = function(itemdata){
    this.storable.create(itemdata).then(this.deq.bind(this),console.error.bind(console, 'readOne error'));
  };
  Decoder.prototype.create = function(itemdata){
    this.storable.create(itemdata).then(this.deq.bind(this));
  };
  Decoder.prototype.delete = function(itemdata){
    var f = filterFactory.createFromDescriptor(itemdata);
    if(!f){
      console.log('NO FILTER FOR',itemdata);
      this.deq();
    }else{
      //console.log(this.storable,this.storable.delete.toString(),'will delete');
      this.storable.delete(f).then(this.deq.bind(this));
    }
  };
  Decoder.prototype.updateExact = function(newitem, olditem){
    var f = filterFactory.createFromDescriptor({op:'hash',d:olditem});
    this.storable.update(f,newitem).then(this.deq.bind(this));
  };
  Decoder.prototype.update = function(filter, datahash){
    var f = filterFactory.createFromDescriptor(filter);
    this.storable.update(f,datahash).then(this.deq.bind(this));
  };
  return Decoder;
}

module.exports = createDataDecoder;
