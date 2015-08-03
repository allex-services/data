(function (module, lib, allex) {
  var taskRegistry = allex.execSuite.taskRegistry;

  module.factory ('allex.data.Views', [
    'allex.data.ViewSetUp',
    'allex.AllexViewChild', 
    'allex.lib.UserDependentMixIn',
    'allex.data.sinkFactory', 
    'allex.data.GridMixIn',

    function (viewSetup, AllexViewChild, UserDependentMixIn, sinkFactory, GridMixIn) {

      function Table ($scope){
        lib.BasicController.call(this, $scope);
        AllexViewChild.call(this, $scope);
        UserDependentMixIn.call(this, $scope);

        var config = this.get('data');
        this.view_setup = viewSetup(config.sink, config.view);
        this.sink_wrapper = sinkFactory(this.view_setup.sink_type, {
          user: this.get('user'),
          onUpdate : this._onUpdate.bind(this)
        });
        GridMixIn.call(this, $scope, this.view_setup.view.grid, this.view_setup.view.config);
        this.sink_wrapper.set('sinkPath', config.sink);
      }
      lib.inherit(Table, lib.BasicController);
      AllexViewChild.addMethods(Table);
      UserDependentMixIn.addMethods(Table);
      GridMixIn.addMethods(Table);

      Table.prototype.__cleanUp = function () {
        this.sink_wrapper.destroy();
        this.sink_wrapper = null;
        this.view_setup = null;
        UserDependentMixIn.prototype.__cleanUp.call(this);
        AllexViewChild.prototype.__cleanUp.call(this);
        GridMixIn.prototype.__cleanUp.call(this);
        lib.BasicController.prototype.__cleanUp.call(this);
      };

      Table.prototype._onUpdate = function () {
        this.$apply();
        console.log('AJ DA TE VIDIM ...');
      };
    return {
      'Table': Table
    };
  }]);

  module.controller ('allex.data.ViewsController', ['$scope', 'allex.data.Views', function ($scope, Views) {
    new Views.Table($scope);
  }]);


  module.config(['allex.PageRouterProvider', function (PageRouteProvider) {
    PageRouteProvider.router.setAlias('partials/allex_dataservice/partials/crudtableview.html','table_cruds');
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
