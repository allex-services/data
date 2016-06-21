function createServerSideRecordUtils(execlib,suite,ParentService){
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
  suite.userInheritProc = userInheritProcCreator('DataUser',ParentService.prototype.userFactory.get('user').inherit);
}

module.exports = createServerSideRecordUtils;
