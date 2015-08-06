(function (module, lib, allex) {
  module.directive ('allexDataSetitem', ['$parse', function ($parse) {
    return {
      'restrict': 'A',
      'scope': false,
      'link': function (scope, el, attrs) {
        scope._ctrl.set('item',$parse(attrs.allexDataSetitem)(scope));
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
