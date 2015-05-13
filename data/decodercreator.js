function createDataDecoder(execlib){
  var lib = execlib.lib,
      dataClientSuite = execlib.dataClientSuite;

  function Decoder(recordctor){
    this.recordctor = recordctor || dataClientSuite.ObjectRecord;
    this.initbundles = new lib.Map;
  }
  Decoder.prototype.destroy = function(){
    this.recordctor = null;
    this.initbundles.destroy();
    this.initbundles = null;
  };
  Decoder.prototype.onStream = function(item){
    console.log(item);
    switch(item.o){
      case 'rb':
        this.beginRead(item.d);
        break;
      case 're':
        this.endRead(item.d);
        break;
      case 'r1':
        this.readOne(item.d);
        break;
    }
  };
  Decoder.prototype.beginRead = function(txnid){
    if(this.initbundles.get(txnid)){
      throw "Transaction "+txnid+" already started";
    }
    this.initbundles.add(txnid,[]);
  };
  Decoder.prototype.endRead = function(txnid){
    var txn = this.initbundles.remove(txnid);
    console.log(txn); //where do I put this?
  };
  Decoder.prototype.readOne = function(data){
    var txnid = data.id,
        txn = this.initbundles.get(txnid);
    if(!txn){
      throw "Transaction "+txnid+" did not start";
    }
    txn.push(new (this.recordctor)(data.d));
  };
  return Decoder;
}

module.exports = createDataDecoder;
