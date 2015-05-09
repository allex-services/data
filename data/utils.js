function createDataUtils(execlib){
  var lib = execlib.lib,
      dataSuite = execlib.dataSuite,
      recordSuite = dataSuite.recordSuite;

  function copyExceptRecord(dest,item,itemname){
    if(itemname!=='record'){
      dest[itemname] = item;
    }
  }
  function inherit(d1,d2){
    var result = {}, cp = copyExceptRecord.bind(null,result);
    lib.traverse(d1,cp);
    lib.traverse(d2,cp);
    result.record = recordSuite.inherit(d1.record,d2.record);
    return result;
  }

  dataSuite.inherit = inherit;
}

module.exports = createDataUtils;
