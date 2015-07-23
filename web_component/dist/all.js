(function (module, lib, allex) {
})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {

  module.factory('allex.data.DataMonitorMixIn', ['allex.lib.UserDependentMixIn', function (UserDependentMixIn) {
    function DataMonitorMixIn ($scope, subsinkPath) {
      UserDependentMixIn.call(this, $scope);
      this.subsinkPath = subsinkPath;
      this.subsink = null;
      this._ad_usr_state_l= this.get('user').attachListener('state', this._ad_usr_stateChanged.bind(this));
    }

    DataMonitorMixIn.prototype.__cleanUp = function () {
      this._ad_usr_state_l.destroy();
      this._ad_usr_state_l = null;
      this.subsinkPath = null;
      this.subsink = null;
    };

    DataMonitorMixIn.prototype._ad_usr_stateChanged = function (state) {
      this.set('subsink', this.get('user').getSubSink(this.subsinkPath));
    };

    DataMonitorMixIn.prototype.set_subsink = function (subsink) {
      this.subsink = subsink;
      ///hoce li mi ovaj reci destroyed? mislim da ne i da nema potrebe, samo ce da se zanovi valjda
      this.$apply();
    };

    DataMonitorMixIn.prototype.get_data = function () {
      return this.subsink ? this.subsink.data : null;
    };

    DataMonitorMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods (extendedClass, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged');
    };

    return DataMonitorMixIn;
  }]);

  module.factory ('allex.data.GridMixIn', ['allex.data.DataMonitorMixIn', function (DataMonitorMixIn) {
    function AllexDataGridMixIn ($scope, gridOptions, subsinkPath) {
      this.gridOptions = gridOptions || {};
      this.gridOptions.data = "_ctrl.subsink.data";
      DataMonitorMixIn.call(this, $scope, subsinkPath);
    }

    AllexDataGridMixIn.prototype.__cleanUp = function () {
      this.gridOptions = null;
    };

    AllexDataGridMixIn.addMethods = function (extendedClass) {
      DataMonitorMixIn.addMethods(extendedClass);
    };
    return AllexDataGridMixIn;
  }]);


  module.directive('allexDataGridAutoResize', [function () {
    return {
      restrict:'E',
      transclude:true,
      replace:true,
      template: '<div class="allexdatagrid"><div class="grid_container" ui-grid="_ctrl.gridOptions" ui-grid-auto-resize></div></div>'
    };
  }]);

  module.directive('allexDataGrid', [function () {
    return {
      restrict: 'E',
      transclude:true,
      replace:true,
      template: '<div class="allexdatagrid"><div class="grid_container" ui-grid="_ctrl.gridOptions"></div></div>'
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
//samo da te vidim
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
      template: '<div js-tree="_ctrl.treeConfig", ng-model="_ctrl.treeData" tree="_ctrl.treeInstance" tree-events="ready:_ctrl._onTreeReady; create_node:_ctrl._onTreeNodeCreated"></div>',
      link: function () {
        console.log('SAMO DA TE VIDIM ...');
      }
    };
  });



})(angular.module('allex.data'), ALLEX.lib, ALLEX);

