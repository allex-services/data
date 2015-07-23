(function (module, lib, allex) {

  module.factory('allex.data.TreeMixIn', ['allex.data.DataMonitorMixIn', function(DataMonitorMixIn) {
    function TreeMixIn ($scope, config, subsinkPath) {
      this.treeConfig = config|| {};
      this.treeInstance = null;
      this.treeData = null;

      DataMonitorMixIn.call(this, $scope, subsinkPath);
    }

    TreeMixIn.prototype.__cleanUp = function () {
      this.treeConfig = null;
      this.treeInstance = null;
      this.treeData = null;
      DataMonitorMixIn.prototype.__cleanUp.call(this);
    };

    TreeMixIn.addMethods = function (extended) {
      lib.inheritMethods(extended, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged');
      lib.inheritMethods(extended, TreeMixIn, '_onTreeReady', '_onTreeNodeCreated');
    };

    TreeMixIn.prototype._onTreeReady = function () {
      ///override if you need
    };
    TreeMixIn.prototype._onTreeNodeCreated = function () {
      ///override if you need
    };

    return TreeMixIn;
  }]);

  module.directive ('allexTree', function () {
    return {
      restrict: 'E',
      replace: true,
      template: '<div js-tree="_ctrl.treeConfig", ng-model="_ctrl.treeData" tree="_ctrl.treeInstance" tree-events="ready:_ctrl._onTreeReady; create_node:_ctrl._onTreeNodeCreated"></div>'
    };
  });



})(angular.module('allex.data'), ALLEX.lib, ALLEX);

