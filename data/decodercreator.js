function createDataDecoder(execlib){
  'use strict';
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      filterFactory = dataSuite.filterFactory;

  function CommandGroup(name, arg_s) {
    this.name = name;
    this.arg_s_group = [arg_s];
  }
  CommandGroup.prototype.destroy = function () {
    this.arg_s_group = null;
    this.name = null;
  };
  CommandGroup.prototype.add = function (arg_s) {
    this.arg_s_group.push(arg_s);
  };
  CommandGroup.prototype.apply = function (decoder) {
    var m = decoder[this.name], as, ret;
    if (!lib.isFunction(m)) {
      return lib.q(false);
    }
    this.arg_s_group.forEach(function(a, aind, as) {
      if (lib.isArray(a)) {
        as[aind] = m.apply(decoder, a);
      } else {
        as[aind] = m.call(decoder, a);
      }
    });
    as = this.arg_s_group;
    this.arg_s_group = [];
    ret = lib.q.allSettled(as);
    ret.then(this.destroy.bind(this));
    return ret;
  };

  function Decoder(storable){
    this.storable = storable;
    this.queryID = null;
    this.working = false;
    this.deqer = this.deq.bind(this);
    this.errdeqer = this.deqFromError.bind(this);
    this.q = new lib.Fifo();
  }
  Decoder.prototype.destroy = function(){
    var qi;
    if (this.q) {
      while (this.q.getFifoLength()) {
        qi = this.q.pop();
        if (qi.destroy) {
          qi.destroy();
        }
      }
      this.q.destroy();
    }
    this.q = null;
    this.errdeqer = null;
    this.deqer = null;
    this.working = null;
    this.queryID = null;
    this.storable = null;
  };
  Decoder.prototype.enq = function(command, arg_s) {
    var ce;
    if (!this.q) {
      return;
    }
    if (this.working) {
      //console.log('saving',Array.prototype.slice.call(arguments));
      var done = false,
        last = this.q.last(),
        lastc;
      if (last) {
        lastc = last.content;
      }
      if (lastc) { 
        if (lib.isArray(lastc)) {
          if (lastc[0] === command) {
            last.content = new CommandGroup(lastc[0], lastc[1]);
            last.content.add(arg_s);
            done = true;
          }
        } else {
          if (lastc.name === command) {
            lastc.add(arg_s);
            done = true;
          }
        }
      }
      if (!done) {
        this.q.push([command, arg_s]);
      }
    }else{
      this.working = true;
      //console.log('Decoder doing',command,'on',this.storable.__id,this.storable.data);
      //console.log('doing',command, args);
      if (lib.isString(command)) {
        if (lib.isArray(arg_s)) {
          this[command].apply(this, arg_s).then(this.deqer, this.errdeqer);
        } else {
          this[command].call(this, arg_s).then(this.deqer, this.errdeqer);
        }
      } else {
        command.apply(this).then(this.deqer, this.errdeqer);
        //console.log('group apply done');
      }
    }
  };
  Decoder.prototype.deq = function(){
    if (!this.q) {
      return;
    }
    this.working = false;
    if(this.q.getFifoLength()){
      var p = this.q.pop();
      if (lib.isArray(p)) {
        this.enq(p[0], p[1]);
      } else {
        this.enq(p);
      }
    }
  };
  Decoder.prototype.deqFromError = function (err) {
    console.error(process.pid, 'Data Decoeder error', err);
    this.deq();
  };
  Decoder.prototype.onStream = function(item){
    //console.log('Decoder', this.storable.__id,'got',item);
    //console.log('Decoder got',require('util').inspect(item,{depth:null}));
    switch(item[0]){
      case 'i':
        this.enq('setID', item[1]);
        break;
      case 'rb':
        this.enq('beginRead', item[1]);
        break;
      case 're':
        this.enq('endRead', item[1]);
        break;
      case 'r1':
        this.enq('readOne', item[2]);
        break;
      case 'c':
        this.enq('create', item[1]);
        break;
      case 'ue':
        this.enq('updateExact', [item[1], item[2]]);
        break;
      case 'u':
        this.enq('update', [item[1], item[2]]);
        break;
      case 'd':
        this.enq('delete', item[1]);
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
