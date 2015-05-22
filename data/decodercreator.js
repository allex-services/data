function createDataDecoder(execlib){
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
  Decoder.prototype.enq = function(command,item){
    if(this.working){
      this.q.push({command:command,item:item});
    }else{
      this.working = true;
      this[command](item);
    }
  };
  Decoder.prototype.deq = function(){
    this.working = false;
    if(this.q.length){
      var p = this.q.pop();
      this.enq(p.command,p.item);
    }
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item.o){
      case 'rb':
        this.enq('beginRead',item);
        break;
      case 're':
        this.enq('endRead',item);
        break;
      case 'r1':
        this.enq('readOne',item);
        break;
      case 'c':
        this.enq('create',item);
        break;
      case 'ue':
        this.enq('updateExact',item);
        break;
      case 'd':
        this.enq('delete',item);
        break;
    }
  };
  Decoder.prototype.beginRead = function(item){
    this.storable.beginInit(item.d);
    this.deq();
  };
  Decoder.prototype.endRead = function(item){
    this.storable.endInit(item.d);
    this.deq();
  };
  Decoder.prototype.readOne = function(item){
    this.storable.create(item.d.d).then(this.deq.bind(this));
  };
  Decoder.prototype.create = function(item){
    this.storable.create(item.d).then(this.deq.bind(this));
  };
  Decoder.prototype.delete = function(item){
    var f = filterFactory.createFromDescriptor(item.d);
    if(!f){
      console.log('NO FILTER FOR',item.d);
      this.deq();
    }else{
      this.storable.delete(f).then(this.deq.bind(this));
    }
  };
  Decoder.prototype.updateExact = function(item){
    var f = filterFactory.createFromDescriptor({op:'hash',d:item.d.o});
    this.storable.update(f,item.d.n);
  };
  return Decoder;
}

module.exports = createDataDecoder;
