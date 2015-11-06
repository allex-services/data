(function (module, lib, allex, wcomponent) {

  var allex_component = allex.WEB_COMPONENT,
    UserDependentMixIn = allex_component.user.UserDependentMixIn,
    Router = allex_component.routers.RouterSet;

  module.factory ('allexDataViewController', ['$parse', function ($parse) {
    function AllexDataViewController ($scope) {
      lib.BasicController.call(this, $scope);
      this.el = null;
      this.config = null;
      this.name = null;
      this.sink_name = null;
      this.data = null;
      this.viewType = null;
      this._monitorForGui = null;
      this._is_remote = null;
      this.recordDescriptor = null;
      this.crudable = null;
      this.actionable = null;
      UserDependentMixIn.call(this, $scope);
    }
    lib.inherit(AllexDataViewController, lib.BasicController);
    UserDependentMixIn.addMethods(AllexDataViewController);

    AllexDataViewController.prototype.__cleanUp = function () {
      this._forgetSink();
      this.sink_name = null;
      this.name = null;
      this.el = null;
      this.config = null;
      this.data = null;
      this.viewType = null;
      this.recordDescriptor = null;
      this.crudable = null;
      this.actionable = null;
      UserDependentMixIn.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    AllexDataViewController.prototype._fetchSink = function () {
      var user = this.get('user');
      if (!this.get('sink_name')) return;
      if ('loggedin' !== user.get('state')) return; //reconsider this one ...
      this.set('sinkRepresentation', this.get('user').getSubSink(this.sink_name));
    };

    AllexDataViewController.prototype._forgetSink  = function () {
      if (this._is_remote) {
        //send detach ...
      }
      this._is_remote = null;
      if (this._monitorForGui) this._monitorForGui.destroy();
      this._monitorForGui = null;
    };


    AllexDataViewController.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      this._forgetSink();
      var user = this.get('user');
      console.log(this.sink_name, sinkRepresentation);

      if (sinkRepresentation) {
        this._got_sinkReady(sinkRepresentation);
      }else{
        this.set('data', null);
        this.set('recordDescriptor', null);
      }
    };

    AllexDataViewController.prototype._failed = function () {
      console.log('DJE BA ZAPELO?', arguments);
    };

    AllexDataViewController.prototype._got_sinkReady = function (sinkRepresentation) {
      this.set('data', sinkRepresentation.data);
      this._monitorForGui = sinkRepresentation.monitorDataForGui(this._updateCB.bind(this));
      this.set('recordDescriptor', sinkRepresentation.sink.recordDescriptor);
    };

    AllexDataViewController.prototype.set_recordDescriptor = function (recordDescriptor) {
      //console.log('AND RECORD DESCRIPTOR IS ', JSON.stringify(recordDescriptor, null, 2));
      this.recordDescriptor = recordDescriptor;
    };

    AllexDataViewController.prototype._updateCB = function () {
      //console.log('SAMO DA VIDIM DATU ... ', this.data);
      this.$apply();
    };

    AllexDataViewController.prototype.set_userState = function (state) {
      UserDependentMixIn.prototype.set_userState.call(this, state);
      this._fetchSink();
    };

    AllexDataViewController.prototype.get_sinkConfiguration = function () {
      return ALLEX_CONFIGURATION && ALLEX_CONFIGURATION.VIEWS ? ALLEX_CONFIGURATION.VIEWS[this.get('sink_name')] : null;
    };

    AllexDataViewController.prototype.get_viewConfiguration = function () {
      var SINK = this.get('sinkConfiguration');
      return SINK ? SINK[this.get('name')] : null;
    };

    AllexDataViewController.prototype.configure = function (config) {

      this.set('sink_name', config.sink);
      this.set('name', config.name);

      var SINK = this.get('sinkConfiguration');
      var VIEW = this.get('viewConfiguration');

      if (!SINK) throw new Error('No view configuration for sink '+config.sink);
      if (!VIEW) throw new Error('No view configuration for view '+config.name);

      this.set('viewType', VIEW.view);
      this.set('config', VIEW.config);


      this.set('crudable', (!!SINK.crud) && VIEW.crud);
      this.set('actionable', (!!SINK.actions) && VIEW.actions);

      this._fetchSink();
    };

    AllexDataViewController.prototype.isCRUDAllowed = function (action) {
      var csc = this.get('sinkConfiguration').crud;
      if (!csc || !csc[action]) return false;
      if (lib.isBoolean(csc[action])) return csc[action];
      if (!csc[action].roles) return false;
      return (csc[action].roles.split(',').indexOf(this.get('user').get('role')) > -1);
    };

    AllexDataViewController.prototype.getCRUDConfig = function (action) {
      var csc = this.get('sinkConfiguration').crud;
      return lib.isBoolean(csc[action]) ? null : csc[action];
    };

    AllexDataViewController.prototype._doAction = function (dialog, action, data) {
      Router.go(dialog, [action, data, this]);
    };

    AllexDataViewController.prototype._doEdit = function (dialog, data) {
      var rd = this.get('recordDescriptor');
      if (!rd.primaryKey) {
        Router.go('dialog.error', [{'content':'No primary key in record descriptor, can not edit'}]);
        return;
      }
      this._doAction(dialog, 'edit', data);
    };

    AllexDataViewController.prototype._doRemove = function (data) {
      var rd = this.get('recordDescriptor');
      if (!rd.primaryKey) {
        Router.go('dialog.error', [{'content':'No primary key in record descriptor, can not remove'}]);
        return;
      }

      Router.go('dialog.singleConfirm', [{
        dialog:{content: 'samo da te vidim..'}
      }, this._doActualRemove.bind(this, data)]);
    };

    AllexDataViewController.prototype._doActualRemove = function (data) {
      var rd = this.get('recordDescriptor'), primaryKey = rd.primaryKey;
      this.get('user').getSubSink(this.get('sink_name')).sink.call('delete', {op:'eq', field: primaryKey, value:data[primaryKey]}).done (this._onRemoveSuccessfull.bind(this,primaryKey, data[primaryKey]), this._onRemoveFailed.bind(this, primaryKey, data[primaryKey]));
    };

    AllexDataViewController.prototype._onRemoveSuccessfull = function (primaryKey, value) {
      Router.go('dialog.success', [{
        data: {primaryKey: primaryKey, value: value}, 
        content: 'Record with key <strong>{{_ctrl.settings.data.primaryKey}}: {{_ctrl.settings.data.value}}</strong> was successfuly removed'
      }]);
    };
    AllexDataViewController.prototype._onRemoveFailed = function (primaryKey, value) {
      Router.go('dialog.error', [{
        data: {primaryKey: primaryKey, value: value}, 
        content: 'Failed to remove record with key <strong>{{_ctrl.settings.data.primaryKey}}: {{_ctrl.settings.data.value}}</strong>'
      }]);
    };


    return AllexDataViewController;
  }]);

  module.controller('allexdataviewController', ['$scope','allexDataViewController', function ($scope, AllexDataViewController) {
    new AllexDataViewController($scope);
  }]);

  module.directive('allexDataView', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: 'partials/allex_dataservice/partials/dataview.html',
      controller: 'allexdataviewController',
      link: function (scope, el, attrs) {
        scope._ctrl.set('el', el);
        scope._ctrl.configure($parse(attrs.config)(scope));
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
