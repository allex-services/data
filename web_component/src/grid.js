(function (module, lib, allex) {
  
  module.directive('allexDataGrid', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: false,
      transclude: true,
      link: function (scope, el, attrs) {
        console.log('SAMO DA TE VIDIM ...');
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
