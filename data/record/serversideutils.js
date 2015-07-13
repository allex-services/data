function createServerSideRecordUtils(execlib,suite){
  function userInheritProcCreator(classname,originalUIP){//originalUIP <=> original User inheritance proc
    //classname not used, but may be useful for error reporting...
    return function(childCtor,methodDescriptors,stateFilterCtor,visiblefieldsarray){
      if(arguments.length===3){
        console.trace();
        console.log(arguments);
        throw "Recheck your inherit call";
      }
      originalUIP.call(this,childCtor,methodDescriptors,stateFilterCtor);
      childCtor.prototype.visibleFields = suite.copyAndAppendNewElements(this.prototype.visibleFields,visiblefieldsarray);
      childCtor.inherit = this.inherit;
      //console.log('after inherit',childCtor.prototype.visibleFields,'out of parent',this.prototype.visibleFields,'and',visiblefieldsarray);
    };
  }
  var sp = execlib.execSuite.registry.get('.');
  suite.userInheritProc = userInheritProcCreator('DataUser',sp.Service.prototype.userFactory.get('user').inherit);
}

module.exports = createServerSideRecordUtils;
