(function (module, lib, allex, wcomponent) {
  var allexcomponent = allex.WEB_COMPONENT,
    UserDependentMixIn = allexcomponent.user.UserDependentMixIn,
    WaitingModalUserTwoButtonForm = allexcomponent.forms.WaitingModalUserTwoButtonForm,
    CRUDAHelpers = wcomponent.helpers,
    Router = allexcomponent.routers.RouterSet;

  function CreateNewItemController($scope, $modalInstance, settings) {
    this.sink_name = settings.sink_name;
    var config = settings.config;
    var form = CRUDAHelpers.buildFormDescriptor(settings.recordDescriptor, null, config ? angular.extend({}, config['#fields'], config.create) : null);
    WaitingModalUserTwoButtonForm.call(this, $scope, $modalInstance, {
      settings: {
        dialog: {
          data: null,
          title: 'Create new item: '+settings.sink_name,
          '#content': 'jsonform',
        },
        button_config: {
          buttons: {
            save: {
              'cb': this._onCreate.bind(this, settings.doCreate),
              'visible': false
            },
            cancel: {
              'action': 'close'
            }
          }
        }
      },
      form: form
    });
  }

  lib.inherit(CreateNewItemController, WaitingModalUserTwoButtonForm);
  CreateNewItemController.prototype.__cleanUp = function () {
    this.sink_name = null;
    WaitingModalUserTwoButtonForm.prototype.__cleanUp.call(this);
  };

  CreateNewItemController.prototype._onCreate = function (cb) {
    this.set('promise', this.get('user').getSubSink(this.get('sink_name')).sink.call('create',this.get('vals')));
  };

  var CREATE_DEFAULTS = {
    label: 'Add new',
    klass:'btn-default'
  };
  function CreateNewBtnController ($scope,dialog) {
    lib.BasicController.call(this, $scope);
    this._parent = $scope.$parent._ctrl;
    this._ready = false;
    this._config = null;
    this._dialog = dialog;
    this._rdl = this._parent.attachListener('recordDescriptor', this._onRecordDescriptor.bind(this));
    this.label = 'Add new';
  }
  lib.inherit(CreateNewBtnController, lib.BasicController);
  CreateNewBtnController.prototype.__cleanUp = function () {
    this._dialog = null;
    this._parent = null;
    this._ready = false;
    this._config = null;
    this._rdl.destroy();
    this._rdl = null;
    lib.BasicController.prototype.__cleanUp.call(this);
  };

  CreateNewBtnController.prototype.isAllowed = function () {
    return this._ready && this._allowed;
  };

  CreateNewBtnController.prototype.onClick = function () {
    if (!this._parent.isCRUDAllowed('create')) {
      return Router.go('dialog.CRUDCreateNotAllowed', [this.get('sink_name')]);
    }
    var crudc = this._parent.getCRUDConfig('create');
    if (!crudc) {
      return Router.go('dialog.CRUDNoConfig', [this.get('sink_name'), 'create']);
    }
    if (lib.isBoolean(crudc) || !crudc.dialogs) {
      this._dialog.open({controller:'allex.data.CreateNewItemController'}, {
        sink_name: this.get('sink_name'),
        recordDescriptor : this.get('recordDescriptor'),
        config: this._parent.get('config')
      });
    }else{
      if (!crudc.dialogs[this.get('role')]){
        return Router.go('dialog.CRUDCreateNotAllowed', [this.get('sink_name')]);
      }else{
        return Router.go(crudc.dialogs[this.get('role')]);
      }
    }
  };

  CreateNewBtnController.prototype._onRecordDescriptor = function (rd) {
    ///use record descriptor as a moment detector: when sink is ready ...
    this._ready = !!rd;
    this._config = null;
    if (this._parent.isCRUDAllowed('create')) {
      this._config = angular.extend({}, CREATE_DEFAULTS, this._parent.getCRUDConfig ('create') || {});
    }
    this.$apply();
  };

  CreateNewBtnController.prototype.get_sink_name = function ( ){
    return this._parent.sink_name;
  };

  CreateNewBtnController.prototype.get_role = function () {
    return this._parent.get('user').get('role');
  };

  CreateNewBtnController.prototype.get_recordDescriptor = function () {
    return this._parent.get('recordDescriptor');
  };


  module.controller('allex.data.CreateNewItemController',['$scope', '$modalInstance', 'settings', function ($scope, $modalInstance, settings) {
    new CreateNewItemController($scope, $modalInstance, settings);
  }]);

  module.controller('allex.data.CreateNewBtnController', ['$scope','allex.dialog', function ($scope, Dialog) {
    new CreateNewBtnController($scope, Dialog);
  }]);

  module.directive('allexDataNew', [function () {
    return {
      restrict: 'E',
      replace: true,
      controller: 'allex.data.CreateNewBtnController',
      scope: true,
      template: '<button class="btn" data-ng-class="_ctrl._config.klass" data-ng-show="_ctrl._ready && _ctrl._config" data-ng-click="_ctrl.onClick()">{{_ctrl._config.label}}</button>'
    };
  }]);


})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
