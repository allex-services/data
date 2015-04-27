function getData(defer){
  if(this.dataDefer){
    defer.resolve([]);
    return;
  }
  this.dataDefer = defer;
  this.__service.attachToData(this);
}

module.exports = {
  getData: getData
};
