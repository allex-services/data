(function (module, lib, allex) {

  module.directive ('allexDataCrudView', ['$compile', 'allex.AllexViewChild', function ($compile, AllexViewChild) {
    function CrudView ($scope) {
      lib.BasicController.call(this, $scope);
      AllexViewChild.call(this, $scope);
      this.config = this.get('data');
    }

    lib.inherit(CrudView, lib.BasicController);
    AllexViewChild.addMethods(CrudView);

    CrudView.prototype.__cleanUp = function () {
      this.config = null;
      AllexViewChild.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    return {
      restrict: 'E',
      scope: false,
      transclude : true,
      controller: CrudView,
      replace: true,
      template: '<div class="crudview"></div>',
      link:function (scope, el) {
        var $view = $('<allex-data-view>');
        $view.attr('data-config', JSON.stringify(scope._ctrl.config));
        el.append($view);
        $compile(el.contents())(scope);
      }
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
