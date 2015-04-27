function createFilterFactory(execlib){
  var lib = execlib.lib,
    Filter = require('./filtercreator')(execlib),
    AllPass = require('./allpasscreator')(execlib,Filter);

  function Factory(){
    lib.Map.call(this);
  }
  lib.inherit(Factory,lib.Map);
  Factory.prototype.createFromDescriptor = function(filterdescriptor){
    if(!filterdescriptor){
      return new AllPass;
    }
    var op = filterdescriptor.op;
    if(!op){
      return new AllPass;
    }
    var ctor = this.get(op);
    if(!ctor){
      console.log('No Filter factory for operator',op);
      return null;
    }
    return new ctor(filterdescriptor);
  };

  var factory = new Factory,
    BooleanFilters = require('./booleanfilterscreator')(execlib,Filter,factory),
    AndFilters = require('./andfilterscreator')(execlib,BooleanFilters),
    OrFilters = require('./orfilterscreator')(execlib,BooleanFilters),
    FieldFilter = require('./fieldfiltercreator')(execlib,Filter),
    GTFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    GTEFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    LTFilter = require('./gtfiltercreator')(execlib,FieldFilter),
    LTEFilter = require('./gtfiltercreator')(execlib,FieldFilter);

  factory.add('and',AndFilters);
  factory.add('or',OrFilters);
  factory.add('gt',GTFilter);
  factory.add('gte',GTEFilter);
  factory.add('lt',LTFilter);
  factory.add('lte',LTEFilter);
  return factory;
}

module.exports = createFilterFactory;
