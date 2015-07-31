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
      DataMonitorMixIn.addMethods(extended);
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
