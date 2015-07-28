(function (module, lib, allex) {
  module.factory('allex.data.DataMonitorMixIn', ['allex.lib.UserDependentMixIn', function (UserDependentMixIn) {
    function DataMonitorMixIn ($scope, subsinkPath) {
      UserDependentMixIn.call(this, $scope);
      this.subsinkPath = subsinkPath;
      this.data = null;
      this._ad_usr_state_l= this.get('user').attachListener('state', this._ad_usr_stateChanged.bind(this));
      this._mgl = null;
    }

    DataMonitorMixIn.prototype.__cleanUp = function () {
      this._ad_usr_state_l.destroy();
      this._ad_usr_state_l = null;
      this.subsinkPath = null;
      this.data = null;
      if (this._mgl) this._mgl.destroy();
      this._mgl = null;
    };

    DataMonitorMixIn.prototype._ad_usr_stateChanged = function (state) {
      this.set_subsink(this.get('user').getSubSink(this.subsinkPath));
    };

    DataMonitorMixIn.prototype.set_subsink = function (subsink) {
      if (subsink) {
        this.data = subsink.data;
        this._mgl = subsink.monitorDataForGui(this.$apply.bind(this));
      }

      /*
      DONT YOU EVER AGAIN DO SOMETHING LIKE THIS ... changing reference in the scope on the fly was neve a good thing ...
      else{
        this.data = null;
      }
      */
      this.$apply();
    };

    DataMonitorMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods (extendedClass, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged');
    };

    return DataMonitorMixIn;
  }]);

})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {

  module.factory ('allex.data.GridMixIn', ['allex.data.DataMonitorMixIn', function (DataMonitorMixIn) {

    var DEFAULT_GRID_OPTIONS = {
      enableSorting:false,
      minimumColumnSize: 150 ///not working at the moment ...
    };

    function AllexDataGridMixIn ($scope, gridOptions, subsinkPath) {
      this.gridOptions = angular.extend({}, DEFAULT_GRID_OPTIONS, gridOptions);
      this.gridOptions.data = "_ctrl.data";
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

  ///TODO: aj sad poteci, malo prepakuj nesto ;)

  module.factory('allex.data.TreeMixIn', ['allex.data.DataMonitorMixIn', function(DataMonitorMixIn) {
    var DEFAULT_TREE_CONFIG = {
      core : {
        multiple : false,
        animation: true,
        error : function(error) {
          log.error('treeCtrl: error from js tree - ' + angular.toJson(error));
        },
        check_callback : true,
        worker : true
      },
      types : {
        default : {
          icon : 'glyphicon glyphicon-flash'
        },
        star : {
          icon : 'glyphicon glyphicon-star'
        },
        cloud : {
          icon : 'glyphicon glyphicon-cloud'
        }
      },
      version : 1,
      plugins : ['types','checkbox']
    };

    function TreeMixIn ($scope, config, subsinkPath) {
      this.treeConfig = angular.extend({}, DEFAULT_TREE_CONFIG, config);
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
      lib.inheritMethods(extended, TreeMixIn, '_onTreeReady', '_onTreeNodeCreated', '_reprocessStructure');
    };

    TreeMixIn.prototype._onTreeReady = function () {
      ///override if you need
    };
    TreeMixIn.prototype._onTreeNodeCreated = function () {
      ///override if you need
    };

    TreeMixIn.prototype._reprocessStructure = function () {
      ///SHOULD DO REPROCESSING PART UPON FETCHED DATA ....
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

