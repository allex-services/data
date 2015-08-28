(function (module, lib, allex) {
  ///TODO: complex primary key not covered ...

  module.factory ('allex.CRUDAHelpers', [function () {
    function hasPermission (cruds, actions, role, name) {
      if ('create' === name) return false; //discard create, it's not allowed action ...
      var c = name in cruds ? cruds[name] : (actions ? actions[name] : null);
      if (!c) return false;

      if (!('roles' in c)) return true; ///no roles given ... so allowd to all
      if (!c.roles || !c.roles.length) return false; // roles: null or roles: '' will forbid for all
      
      return c.roles.split(',').indexOf(role) > -1;
    }

    function itemActions (view) {
      var sc = view.get('sinkConfiguration'), user = view.get('user'), primaryKey = view.get('recordDescriptor').primaryKey;
      if (!primaryKey) return null;
      if (!sc || !sc.crud) return null;
      if (!(sc.crud.edit || sc.crud.delete)) return null;
      ///AJ SAMO PROVERI OVAJ ILI ... ako imas sc.crud.edit ili 
      return (sc.item_action_order ? sc.item_action_order : ['edit', 'delete']).filter(hasPermission.bind(null, sc.crud, sc.actions, user.get('role')));
    }

    function buildWidget (DEFAULTS, type, sc, name) {
      var c = name in sc.crud ? sc.crud[name] : sc.actions[name];
      if (!c) return '';
      return (c.widget ? c.widget : DEFAULTS[name]) || '';
    }

    function buildActionsWidget (view) {
      var actions = itemActions(view);
      if (!actions || !actions.length) return;
      var type = view.get('viewType');
      var DEFAULTS = ALLEX_CONFIGURATION.DEFAULT_VIEW_ACTION_WIDGETS[type];
      if (!DEFAULTS) {
        console.warn('NO DEFAULTS FOR VIEW ACTIONS for type ',type);
      }
      return actions.map(buildWidget.bind(null, DEFAULTS, type, view.get('sinkConfiguration'))).join('');
    }

    function tofd (defaults, item) {
      var ext = {required: true};
      if (defaults && defaults[item.name]) ext.default = defaults[item.name];
      return {schema: angular.extend({}, item, ext)};
    }

    function trd (ret, defaults, item) {
      ret[item.name] = tofd(defaults, item);
    }
    function buildFormDescriptor (recordDescriptor, defaults, config) {
      var ret = {fields: {}};
      recordDescriptor.fields.forEach (trd.bind(null, ret.fields, defaults));

      if (config && config.form) {
        var f = config.form;
        lib.traverse(f, buildFormDescriptor_extend.bind(null, ret.fields));
      }

      return ret;
    }

    buildFormDescriptor_extend = function (form, content, key){
      form[key] = angular.extend({}, form[key], content);
    };
    return {
      itemActions: itemActions,
      buildActionsWidget: buildActionsWidget,
      buildFormDescriptor: buildFormDescriptor
    };
  }]);


  module.directive('allexDataView', ['$parse', 'allex.lib.UserDependentMixIn', 'allex.Router', function ($parse, UserDependentMixIn, Router) {
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
        //at this point, we should check if this is a remote sink ... if is send askForRemote as well
        this._is_remote = user.isSinkRemote(this.sink_name);
        if (this._is_remote) {
          user.execute('askForRemote', this.sink_name)
            .done(this._got_sinkReady.bind(this, sinkRepresentation), this._failed.bind(this));
        }
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

  module.factory ('allex.data.CreateNewItemControllerF', ['allex.lib.form.WaitingUserModalTwoButtonForm','allex.CRUDAHelpers', function (WaitingUserModalTwoButtonForm, CRUDAHelpers) {
    function CreateNewItemController($scope, $modalInstance, settings) {
      this.sink_name = settings.sink_name;
      var config = settings.config;
      var form = CRUDAHelpers.buildFormDescriptor(settings.recordDescriptor, null, config ? angular.extend({}, config['#fields'], config.create) : null);
      WaitingUserModalTwoButtonForm.call(this, $scope, $modalInstance, {
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

    lib.inherit(CreateNewItemController, WaitingUserModalTwoButtonForm);
    CreateNewItemController.prototype.__cleanUp = function () {
      this.sink_name = null;
      WaitingUserModalTwoButtonForm.prototype.__cleanUp.call(this);
    };

    CreateNewItemController.prototype._onCreate = function (cb) {
      this.set('promise', this.get('user').getSubSink(this.get('sink_name')).sink.call('create',this.vals));
    };

    return CreateNewItemController;
  }]);


  module.controller('allex.data.CreateNewItemController',['$scope', '$modalInstance', 'settings', 'allex.data.CreateNewItemControllerF', function ($scope, $modalInstance, settings, CreateNewItemController) {
    new CreateNewItemController($scope, $modalInstance, settings);
  }]);

  module.directive('allexDataNew', ['$compile', 'allex.Router', 'allex.dialog', function ($compile, Router, Dialog) {
    var CREATE_DEFAULTS = {
      label: 'Add new',
      klass:'btn-default'
    };
    function AllexDataCrud ($scope) {
      lib.BasicController.call(this, $scope);
      this._parent = $scope.$parent._ctrl;
      this._ready = false;
      this._config = null;
      this._rdl = this._parent.attachListener('recordDescriptor', this._onRecordDescriptor.bind(this));
      this.label = 'Add new';
    }
    lib.inherit(AllexDataCrud, lib.BasicController);
    AllexDataCrud.prototype.__cleanUp = function () {
      this._parent = null;
      this._ready = false;
      this._config = null;
      this._rdl.destroy();
      this._rdl = null;
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    AllexDataCrud.prototype.isAllowed = function () {
      return this._ready && this._allowed;
    };

    AllexDataCrud.prototype.onClick = function () {
      if (!this._parent.isCRUDAllowed('create')) {
        return Router.go('dialog.CRUDCreateNotAllowed', [this.get('sink_name')]);
      }
      var crudc = this._parent.getCRUDConfig('create');
      if (!crudc) {
        return Router.go('dialog.CRUDNoConfig', [this.get('sink_name'), 'create']);
      }
      if (lib.isBoolean(crudc) || !crudc.dialogs) {
        Dialog.open({controller:'allex.data.CreateNewItemController'}, {
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

    AllexDataCrud.prototype._onRecordDescriptor = function (rd) {
      ///use record descriptor as a moment detector: when sink is ready ...
      this._ready = !!rd;
      this._config = null;
      if (this._parent.isCRUDAllowed('create')) {
        this._config = angular.extend({}, CREATE_DEFAULTS, this._parent.getCRUDConfig ('create') || {});
      }
      this.$apply();
    };

    AllexDataCrud.prototype.get_sink_name = function ( ){
      return this._parent.sink_name;
    };

    AllexDataCrud.prototype.get_role = function () {
      return this._parent.get('user').get('role');
    };

    AllexDataCrud.prototype.get_recordDescriptor = function () {
      return this._parent.get('recordDescriptor');
    };
    return {
      restrict: 'E',
      replace: true,
      controller: AllexDataCrud,
      scope: true,
      template: '<button class="btn" data-ng-class="_ctrl._config.klass" data-ng-show="_ctrl._ready && _ctrl._config" data-ng-click="_ctrl.onClick()">{{_ctrl._config.label}}</button>'
    };
  }]);

  module.run (['allex.Router', 'allex.dialog', function (Router, Dialog, TBActionSettings) {
    Router.register('dialog.CRUDCreateNotAllowed', function (sink_name) {
      return Dialog.error({'content': "You are not allowed to do create on sink <strong>{{_ctrl.getData().sink_name}}</strong>", data: {sink_name: sink_name}});
    });

    Router.register('dialog.CRUDNoConfig', function (sink_name, action) {
      return Dialog.error({'content': 'Unable to find configuration for action <strong>{{_ctrl.getData().action}}</strong> for sink <strong>{{_ctrl.getData().sink_name}}', data: {sink_name: sink_name, action: action}});
    });

    Router.register('dialog.data.action.edit', function (action, data, view) {
      return Dialog.open({controller: 'allex.data.EditController'}, {action:action, data: data, view: view});
    });
  }]);

  module.factory('allex.data.EditControllerF', ['allex.CRUDAHelpers','allex.lib.form.WaitingUserModalTwoButtonForm', function (CRUDAHelpers, WaitingUserModalTwoButtonForm) {
    function EditController($scope, $modalInstance, settings) {
      this.view = settings.view;
      var rd = this.view.get('recordDescriptor');
      if (!rd.primaryKey) {
        //ovo  mora ranije
        throw new Error('NO PRIMARY KEY ...');
      }
      this.primaryKey = rd.primaryKey;
      var config = this.view.get('config');
      var form = CRUDAHelpers.buildFormDescriptor(settings.view.get('recordDescriptor'), settings.data, config ? angular.extend({}, config['#fields'], config.edit) : null);

      form.fields[this.get('primaryKey')].attribs = {
        'ng-disabled':'1'
      };

      WaitingUserModalTwoButtonForm.call(this, $scope, $modalInstance, {
        settings: {
          dialog : { 
            messages: {autofade: 2000},
            success: { autoclose: 1000 },
            title: 'Edit',
            '#content': 'jsonform'
          },
          button_config: {
            buttons: {
              save: {
                cb: this.doSave.bind(this),
                visible: false
              },
              cancel: {action : 'close'}
            }
          }
        },
        form: form
      });
    }

    lib.inherit(EditController, WaitingUserModalTwoButtonForm);
    EditController.prototype.__cleanUp = function () {
      this.primaryKey = null;
      this.view = null;
      WaitingUserModalTwoButtonForm.prototype.__cleanUp.call(this);
    };

    EditController.prototype.doSave = function () {
      var primaryKey = this.get('primaryKey'),
        promise = this.get('user').getSubSink(this.view.get('sink_name')).sink.call('update', {op:'eq', field:primaryKey, value: this.vals[primaryKey]} ,this.get('vals'));
      //TODO: sad bismo trebali da odgovorimo nesto pametno ...
      this.set('promise', promise);
    };

    return EditController;
  }]);


  module.controller('allex.data.EditController', ['$scope', '$modalInstance', 'settings', 'allex.data.EditControllerF', function ($scope, $modalInstance, settings, EditController) {
    new EditController($scope, $modalInstance, settings);
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
