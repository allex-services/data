(function (module, lib, allex) {
  module.directive('allexDataView', ['$parse', 'allex.lib.UserDependentMixIn', function ($parse, UserDependentMixIn) {
    function AllexDataViewController ($scope) {
      lib.BasicController.call(this, $scope);
      UserDependentMixIn.call(this, $scope);
      this.el = null;
      this.config = null;
      this.name = null;
      this.sink_name = null;
      this.data = null;
      this.viewType = null;
      this._monitorForGui = null;
    }
    lib.inherit(AllexDataViewController, lib.BasicController);
    UserDependentMixIn.addMethods(AllexDataViewController);

    AllexDataViewController.prototype.__cleanUp = function () {
      if (this._monitorForGui) this._monitorForGui.destroy();
      this._monitorForGui = null;
      this.sink_name = null;
      this.name = null;
      this.el = null;
      this.config = null;
      this.data = null;
      this.viewType = null;
      UserDependentMixIn.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    AllexDataViewController.prototype._fetchSink = function () {
      var user = this.get('user');
      if (!this.get('sink_name')) return;
      if ('loggedin' !== user.get('state')) return; //reconsider this one ...

      ///za sad samo statici ...
      this.set('sinkRepresentation', this.get('user').getSubSink(this.sink_name));
    };


    AllexDataViewController.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      if (this._monitorForGui) this._monitorForGui.destroy();
      this._monitorForGui = null;

      if (sinkRepresentation) {
        this.set('data', sinkRepresentation.data);
        this._monitorForGui = sinkRepresentation.monitorDataForGui(this._updateCB.bind(this));
        this.set('recordDescriptor', sinkRepresentation.sink.recordDescriptor);
      }
    };

    AllexDataViewController.prototype.set_recordDescriptor = function (recordDescriptor) {
      console.log('AND RECORD DESCRIPTOR IS ', recordDescriptor);
    };

    AllexDataViewController.prototype._updateCB = function () {
      console.log('SAMO DA VIDIM DATU ... ', this.data);
      this.$apply();
    };

    AllexDataViewController.prototype.set_userState = function (state) {
      UserDependentMixIn.prototype.set_userState.call(this, state);
      this._fetchSink();
    };

    AllexDataViewController.prototype.set_sink_name = function (name) {
      this.sink_name = name;
      this._fetchSink();
    };

    AllexDataViewController.prototype.configure = function (config) {
      if (!ALLEX_CONFIGURATION.VIEWS) throw new Error('No views configuration');
      if (!ALLEX_CONFIGURATION.VIEWS[config.sink]) throw new Error('No view configuration for sink '+config.sink);
      if (!ALLEX_CONFIGURATION.VIEWS[config.sink][config.name]) throw new Error('No view configuration for view '+config.name);
      var configuration = ALLEX_CONFIGURATION.VIEWS[config.sink][config.name];
      this.set('viewType', configuration.view);
      this.set('config', configuration.config);
      this.name = configuration.name;
      this.set('sink_name', config.sink);
    };

    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: 'partials/allex_dataservice/partials/dataview.html',
      controller: AllexDataViewController,
      link: function (scope, el, attrs) {
        scope._ctrl.set('el', el);
        scope._ctrl.configure($parse(attrs.config)(scope));
      }
    };
  }]);


  module.directive ('allexDataSetitem', ['$parse', function ($parse) {
    return {
      'restrict': 'A',
      'scope': false,
      'link': function (scope, el, attrs) {
        scope._ctrl.set('item',scope.$parent._ctrl.data[$parse(attrs.allexDataSetitem)(scope)]);
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
