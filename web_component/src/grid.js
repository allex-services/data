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
      this._mgl.destroy();
      this._mgl = null;
    };

    DataMonitorMixIn.prototype._ad_usr_stateChanged = function (state) {
      this.set_subsink(this.get('user').getSubSink(this.subsinkPath));
    };

    DataMonitorMixIn.prototype.set_subsink = function (subsink) {
      if (subsink) {
        this.data = subsink.data;
        subsink.monitorDataForGui(this.$apply.bind(this));
      }else{
        this.data = null;
      }
      this.$apply();
    };

    DataMonitorMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods (extendedClass, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged');
    };

    return DataMonitorMixIn;
  }]);

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
