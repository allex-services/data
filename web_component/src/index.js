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
        this.set('record_descriptor', subsink.sink.recordDescriptor);
      }
      this.$apply();
    };
    DataMonitorMixIn.prototype.set_record_descriptor = function () {
    };

    DataMonitorMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods (extendedClass, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged', 'set_record_descriptor');
    };

    return DataMonitorMixIn;
  }]);


})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
