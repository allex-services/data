(function (module, lib, allex) {

  module.factory ('allex.data.GridMixIn', ['allex.lib.UserDependentMixIn', function (UserDependentMixIn) {
    function AllexDataGridMixIn ($scope, gridOptions, subsinkPath) {
      UserDependentMixIn.call(this, $scope);
      this.subsinkPath = subsinkPath;

      this.gridOptions = gridOptions || {};
      this.gridOptions.data = "_ctrl.subsink.data";
      this.subsink = null;

      this._ad_usr_state_l= this.get('user').attachListener('state', this._ad_usr_stateChanged.bind(this));
    }
    AllexDataGridMixIn.prototype.__cleanUp = function () {

      this._ad_usr_state_l.destroy();
      this._ad_usr_state_l = null;

      this.subsinkPath = null;
      this.gridOptions = null;
      this.subsink = null;
    };

    AllexDataGridMixIn.prototype._ad_usr_stateChanged = function (state) {
      this.set('subsink', this.get('user').getSubSink(this.subsinkPath));
    };

    AllexDataGridMixIn.prototype.set_subsink = function (subsink) {
      this.subsink = subsink;
      ///hoce li mi ovaj reci destroyed? mislim da ne i da nema potrebe, samo ce da se zanovi valjda
      this.$apply();
    };

    AllexDataGridMixIn.prototype.get_data = function () {
      return this.subsink ? this.subsink.data : null;
    };

    AllexDataGridMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods (extendedClass, AllexDataGridMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged');
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
