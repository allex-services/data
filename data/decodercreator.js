function createDataDecoder(execlib){
  var lib = execlib.lib,
      dataClientSuite = execlib.dataClientSuite;

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
  return Decoder;
}

module.exports = createDataDecoder;
