(function (module, lib, allex) {
  allex.web_components.data = {};

  module.run (['allex.dialog.Router', 'allex.dialog', function (Router, Dialog) {
    Router.register('CRUDCreateNotAllowed', function (sink_name) {
      return Dialog.error({'content': "You are not allowed to do create on sink <strong>{{_ctrl.getData().sink_name}}</strong>", data: {sink_name: sink_name}});
    });

    Router.register('CRUDNoConfig', function (sink_name, action) {
      return Dialog.error({'content': 'Unable to find configuration for action <strong>{{_ctrl.getData().action}}</strong> for sink <strong>{{_ctrl.getData().sink_name}}', data: {sink_name: sink_name, action: action}});
    });

    Router.register('data.action.edit', function (action, data, view) {
      return Dialog.open({controller: 'allex.data.EditItemController'}, {action:action, data: data, view: view});
    });
  }]);



})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.resizeColumns','ui.grid.moveColumns', 'ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
(function (lib, allex, wcomponent) {
  function hasPermission (cruds, actions, role, name) {
    if ('create' === name) return false; //discard create, it's not allowed action ...
    var c = name in cruds ? cruds[name] : (actions ? actions[name] : null);
    if (!c) return false;

    if (!('roles' in c)) return true; ///no roles given ... so allowd to all
    if (!c.roles || !c.roles.length) return false; // roles: null or roles: '' will forbid for all
    
    return c.roles.split(',').indexOf(role) > -1;
  }

  function itemActions (view) {
    ///TODO: uvedi koncept deklarisanja widget-a u konfiguraciji ....
    if (!view.actionable) return null;

    var sc = view.get('sinkConfiguration'), 
      user = view.get('user'), 
      primaryKey = view.get('recordDescriptor').primaryKey,
      viewc = sc[view.get('name')];
    if (!primaryKey) return null;

    var items = null, 
      order = 'item_action_order' in viewc ? viewc.item_action_order : sc.item_action_order;

    if (!order) return null; ///you do not want actions on this view, right?
    return order ? order.filter(hasPermission.bind(null, sc.crud, sc.actions, user.get('role'))) : null;
  }

  function buildWidget (DEFAULTS, sc, name) {
    var c = name in sc.crud ? sc.crud[name] : sc.actions[name];
    if (!c) return '';
    return (c.widget ? c.widget : DEFAULTS[name]) || '';
  }

  function buildActionsWidget (view, wdefaults) {
    var actions = itemActions(view);
    if (!actions || !actions.length) return;
    var type = view.get('viewType');
    var widgets = angular.extend({}, wdefaults, ALLEX_CONFIGURATION.VIEW_ACTION_WIDGETS ? ALLEX_CONFIGURATION.VIEW_ACTION_WIDGETS[type] : null, view.get('sinkConfiguration')[view.get('name')].actions);
    if (!widgets) return;
    return actions.map(buildWidget.bind(null, widgets, view.get('sinkConfiguration'))).join('');
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

  wcomponent.helpers = {
    itemActions: itemActions,
    buildActionsWidget: buildActionsWidget,
    buildFormDescriptor: buildFormDescriptor
  };

})(ALLEX.lib, ALLEX, ALLEX.web_components.data);
//samo da te vidim
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
      UserDependentMixIn.call(this, $scope, null, null, $scope.userid);
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
      console.log('registered sink, data set to', sinkRepresentation.data);
      this._monitorForGui = sinkRepresentation.monitorDataForGui(this._updateCB.bind(this));
      sinkRepresentation.state.listenFor('name', this._readRd.bind(this, sinkRepresentation), true, false);
    };

    AllexDataViewController.prototype._readRd = function (sinkRepresentation) {
      //console.log('OK, OVO SE DESILO, ali', sinkRepresentation.sink.modulename);
      this.set('recordDescriptor', sinkRepresentation.sink.recordDescriptor);
    };

    AllexDataViewController.prototype.set_recordDescriptor = function (recordDescriptor) {
      this.recordDescriptor = recordDescriptor || null;
    };

    AllexDataViewController.prototype._updateCB = function () {
      console.log('SAMO DA VIDIM DATU ... ', this.data);
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
      this.set('actionable', !!SINK.actions || !!VIEW.actions);

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

    AllexDataViewController.prototype._doAction = function (route, action, data) {
      Router.go(route, [action, data, this]);
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

  module.directive('allexDataView', ['$parse',function ($parse) {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        userid: '@'
      },
      templateUrl: 'partials/allex_dataservice/partials/dataview.html',
      controller: 'allexdataviewController',
      link: function (scope, el, attrs) {
        scope._ctrl.set('el', el);
        scope._ctrl.configure($parse(attrs.config)(scope));
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
//samo da te vidim
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
//samo da te vidim
(function (module, lib, allex, wcomponent) {
  var allexcomponent = allex.WEB_COMPONENT,
    UserDependentMixIn = allexcomponent.user.UserDependentMixIn,
    WaitingModalUserTwoButtonForm = allexcomponent.forms.WaitingModalUserTwoButtonForm,
    helpers = wcomponent.helpers;


  function EditController($scope, $modalInstance, settings) {
    this.view = settings.view;
    var rd = this.view.get('recordDescriptor');
    if (!rd.primaryKey) {
      //ovo  mora ranije
      throw new Error('NO PRIMARY KEY ...');
    }
    this.primaryKey = rd.primaryKey;
    var config = this.view.get('config');
    var form = helpers.buildFormDescriptor(settings.view.get('recordDescriptor'), settings.data, config ? angular.extend({}, config['#fields'], config.edit) : null);

    form.fields[this.get('primaryKey')].attribs = {
      'ng-disabled':'1'
    };

    WaitingModalUserTwoButtonForm.call(this, $scope, $modalInstance, {
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
              visible: false
            },
            cancel: {action : 'close'}
          }
        }
      },
      form: form
    });
  }

  lib.inherit(EditController, WaitingModalUserTwoButtonForm);
  EditController.prototype.__cleanUp = function () {
    this.primaryKey = null;
    this.view = null;
    WaitingModalUserTwoButtonForm.prototype.__cleanUp.call(this);
  };

  EditController.prototype.dogo = function () {
    var primaryKey = this.get('primaryKey'),
      promise = this.get('user').getSubSink(this.view.get('sink_name')).sink.call('update', {op:'eq', field:primaryKey, value: this.vals[primaryKey]} ,this.get('vals'));
    //TODO: sad bismo trebali da odgovorimo nesto pametno ...
    this.set('promise', promise);
  };


  module.controller('allex.data.EditItemController', ['$scope', '$modalInstance', 'settings', function ($scope, $modalInstance, settings) {
    new EditController($scope, $modalInstance, settings);
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
//samo da te vidim
(function (module, lib, allex, wcomponent) {
  function DataReaderJob(datareader, promise) {
    this.reader = datareader;
    promise.then(
      this.onDone.bind(this),
      this.onError.bind(this),
      this.onData.bind(this)
    );
  }
  DataReaderJob.prototype.destroy = function () {
    if (this.reader) {
      if (this.reader.activeReader === this) {
        this.reader.activeReader = null;
      }
    }
    this.reader = null;
  };
  DataReaderJob.prototype.onDone = function () {
    if (!this.reader) {
      return;
    }
    this.reader.$apply();
    this.destroy();
  };
  DataReaderJob.prototype.onError = function () {
    if (!this.reader) {
      return;
    }
    //something should be done about this error
    this.reader.$apply();
    this.destroy();
  };
  DataReaderJob.prototype.onData = function (datahash) {
    if (!this.reader) {
      return;
    }
    this.reader.data.push(datahash);
  };

  function DataReaderMixin(sinkname, data) {
    this.sinkname = sinkname;
    this.data = data || [];
    this.activeReader = null;
  }
  DataReaderMixin.prototype.__cleanUp = function () {
    this.data = null;
    this.sinkname = null;
  };
  DataReaderMixin.prototype.readData = function () {
    var u = this.get('user');
    if (!u) {
      return;
    }
    if (this.activeReader) {
      this.activeReader.destroy();
    }
    this.data.splice(0);
    this.activeReader = new DataReaderJob(
      this,
      u.execute(
        'readData',
        this.sinkname,
        this.createDataReadFilter()
      )
    );
  };
  DataReaderMixin.addMethods = function (extendedClass) {
    lib.inheritMethods(extendedClass, DataReaderMixin, ['readData']);
  };

  wcomponent.DataReaderJob = DataReaderJob;
  wcomponent.DataReaderMixin = DataReaderMixin;

})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
//samo da te vidim
(function (module, lib, allex) {
  module.directive ('allexDataSetitem', ['$parse', function ($parse) {
    return {
      'restrict': 'A',
      'scope': false,
      'link': function (scope, el, attrs) {
        scope._ctrl.set('item',$parse(attrs.allexDataSetitem)(scope));
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex, wcomponent) {
  var acomponent = allex.WEB_COMPONENT,
    BasicViewTypeController = acomponent,
    helpers = wcomponent.helpers;


  var DEFAULT_ACTION_WIDGETS = {
    'edit': '<a href="#" data-ng-click="grid.appScope._ctrl._doEdit(\'dialog.data.action.edit\', row.entity)"><i class="fa fa-pencil-square-o"></i></a>',
    'delete':'<a href="#" data-ng-click="grid.appScope._ctrl._doRemove(row.entity)"><i class="fa fa-trash-o"></i></a>'
  };


  module.factory('allexDataGridController', ['$compile', function ($compile) {
    var IElement = acomponent.interfaces.Element;
    function AllexDataGrid($scope) {
      lib.BasicController.call(this, $scope);
      IElement.call(this);
      this._parent = $scope.$parent._ctrl;
      this._record_descriptor_l = null;
    }
    lib.inherit(AllexDataGrid, lib.BasicController);
    IElement.addMethods(AllexDataGrid);
    AllexDataGrid.prototype.__cleanUp = function () {
      this._record_descriptor_l.destroy();
      this._record_descriptor_l = null;
      this._parent = null;
      IElement.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    AllexDataGrid.prototype._doAction = function (route, action, data) {
      this._parent._doAction.call(this._parent, route, action, data.toHash(data.fieldNames()));
    };

    AllexDataGrid.prototype._doEdit = function (form, data) {
      this._parent._doEdit.call(this._parent, form, data.toHash(data.fieldNames()));
    };

    AllexDataGrid.prototype._doRemove = function (data) {
      this._parent._doRemove.call(this._parent, data.toHash(data.fieldNames()));
    };

    AllexDataGrid.prototype.get_data = function () {
      return this._parent.get('data');
    };

    AllexDataGrid.prototype.build = function () {
      this._record_descriptor_l = this._parent.attachListener('recordDescriptor', this.set.bind(this, 'recordDescriptor'));
    };

    AllexDataGrid.prototype.releaseGrid = function () {
      this.get('el').empty();
    };

    AllexDataGrid.prototype.set_recordDescriptor = function (recordDescriptor) {
      this.releaseGrid();
      if (!recordDescriptor) {
        return; ///TODO: append something like: no descriptor, can not move on?
      }


      this.gridOptions = this.prepareGridOptions(recordDescriptor);
      this.gridOptions.data = this._parent.get('data');
      var $grid = $('<div>').addClass('allex_grid').attr({
        'data-ui-grid':'_ctrl.gridOptions',
      });
      var el = this.get('el');
      el.append($grid);
      el.removeClass();
      el.addClass('allex_grid_container');

      var config = this._parent.get('config');
      if (config) {
        if (config.autoresize) $grid.attr('ui-grid-auto-resize', '');
        if (config.movablecolumns) $grid.attr('ui-grid-move-columns', '');
        if (config.resizablecolumns) $grid.attr('ui-grid-resize-columns', '');
        if (config.container_class) el.addClass(config.container_class);
        if (config.grid_class) $grid.addClass(config.grid_class);
      }

      $compile(this.get('el').contents())(this.scope);
    };

    AllexDataGrid.prototype.prepareGridOptions = function (recordDescriptor) {
      var grid = this._parent.get('config') ? this._parent.get('config').grid: null;
      var config = angular.extend({}, grid);
      var cfgd = config.columnDefs;
      config.columnDefs = cfgd ? cfgd : recordDescriptor.fields.map (this._buildColumnDef.bind(this));
      var sf = this._parent.get('sinkConfiguration');
      var global_config = sf.action_cell_config && sf.action_cell_config.grid ? sf.action_cell_config.grid : {};
      this._appendCrudAndActions(config.columnDefs, global_config, this._parent.get('config'));
      return config;
    };

    AllexDataGrid.prototype._appendCrudAndActions = function (defs, gc, viewc) {
      //var item_actions = angular.extend({}, DEFAULT_ACTION_WIDGETS, helpers.buildActionsWidget(this._parent));
      var item_actions = helpers.buildActionsWidget(this._parent, DEFAULT_ACTION_WIDGETS);
      if (!item_actions || !item_actions.length) return;

      var desc = angular.extend({name: 'Action'}, gc.action_cell_config, viewc.action_cell_config, {
        cellTemplate: item_actions
      });
      defs.unshift(desc);
      //console.log('====DESC', desc, gc, viewc);
    };

    AllexDataGrid.prototype._buildColumnDef = function (rditem) {
      return {displayName: rditem.title, 'field': rditem.name};
    };

    return AllexDataGrid;
  }]);

  module.controller ('allexdatagridController', ['$scope', 'allexDataGridController', function ($scope, allexDataGridController) {
    new allexDataGridController($scope);
  }]);

  module.directive('allexDataGrid', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      transclude: true,
      controller: 'allexdatagridController',
      template: '<div class="allex_grid_container"></div>',
      link: function (scope, el, attrs) {
        scope._ctrl.set('el', el);
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
//samo da te vidim
(function (module, lib, allex) {
  var DEFAULTS = {
    'no_item': '<strong>Items unavailable</strong>'
  };

  module.directive ('allexDataList', ['$compile', function ($compile) {
    return {
      restrict: 'E',
      scope: false,
      transclude: true,
      template: '<div class="allex_data_list"><div class="empty" data-ng-hide="_ctrl.data.length"></div><ul class="allex_data_list" data-ng-show="_ctrl.data.length"></ul></div>',
      replace: true,
      link: function (scope, el, attrs) {
        var config = scope._ctrl.get('config');
        var repeat_attr = '$litem in _ctrl.data';
        if (config.track) {
          repeat_attr+=(" track by "+config.track);
        }
        if (config.orderBy) {
          repeat_attr+= (" | orderBy:'"+config.orderBy+"'");
        }

        if (config.limitTo) {
          //TODO
        }

        var item = config.item;
        var $item = $('<li>'+config.item.content+'</li>');
        $item.attr({ 'data-ng-repeat': repeat_attr });
        $item.attr(item.attrs);
        if (config.filter) {
          $item.attr({'data-ng-if': config.filter});
        }
        if (config.list) {
          if (config.list.attrs) el.find('ul').attr(config.list.attrs);
        }
        el.find('ul').append($item);
        el.find('div.empty').append( config.empty ? config.empty : DEFAULTS.no_item);
        $compile(el.contents())(scope);
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {
  var allexcomponent = allex.WEB_COMPONENT,
    AllexViewChild = allexcomponent.routers.AllexViewChild,
    Router = allexcomponent.routers.RouterSet,
    UserDependentMixIn = allexcomponent.user.UserDependentMixIn;

  function DataCrudNew ($scope) {
    lib.BasicController.call(this, $scope);
    this.roles = null;
    this.allowed = false;
    this.sink = null;
    UserDependentMixIn.call(this, $scope);
  }
  lib.inherit(DataCrudNew, lib.BasicController);
  DataCrudNew.prototype.__cleanUp = function () {
    this.sink = null;
    this.allowed = null;
    this.roles = null;
    UserDependentMixIn.prototype.__cleanUp.call(this);
    lib.BasicController.prototype.__cleanUp.call(this);
  };

  DataCrudNew.prototype.set_userState = function (state) {
    UserDependentMixIn.prototype.set_userState.call(this, state);
    if ('loggedin' !== state) return;
    if (!this.roles) {
      this.set('allowed', true);
      return;
    }else{
      this.set('allowed', this._isAllowed());
    }
  };

  DataCrudNew.prototype._isAllowed = function () {
    return this.roles.split(',').indexOf(this.get('user').get('role')) > -1; 
  };

  DataCrudNew.prototype.set_roles = function(roles) {
    this.roles = roles;
    this.set('allowed', this._isAllowed());
    this.$apply();
  };

  DataCrudNew.prototype.set_allowed = function (allowed) {
    this.allowed = allowed;
    this.$apply();
  };

  DataCrudNew.prototype.go = function () {
    if (!this.sink) {
      //aj shibni neki errror
      return;
    }
    if (!this._isAllowed()) {
      //tresni mu nesto po sred nosa ...
      return;
    }
    //E SAD IDE ONAJ ZAGULJENI DEO KAD TREBA DA SAZNAS DESKRIPTORE ...
    //console.log('==============>', this.get('user').getSubSink(this.sink));
  };

  module.controller ('allexDataCrudNewController', ['$scope', function ($scope) {
    new DataCrudNew($scope);
  }]);

  module.directive('allexDataCrudNew', ['$compile', function ($compile) {
    function link (scope, el, attrs) {
      scope._ctrl.set('sink', attrs.sink);
      if (attrs.roles && attrs.roles.length) scope._ctrl.set('roles', attrs.roles);
      el.html(attrs.label);
    }

    return {
      restrict: 'E',
      controller: 'allexDataCrudNewController',
      replace: true,
      template: '<button class="btn" data-ng-show="_ctrl.allowed" data-ng-click="_ctrl.go()"></button>',
      link: link
    };
  }]);

  var ADD_NEW_DEFAULTS = {
    klass: 'btn-default',
    label: 'Add new'
  };

  function CrudView ($scope) {
    lib.BasicController.call(this, $scope);
    AllexViewChild.call(this, $scope);
    this.config = this.get('data');
  }

  lib.inherit(CrudView, lib.BasicController);
  AllexViewChild.addMethods(CrudView);

  CrudView.prototype.__cleanUp = function () {
    this.config = null;
    AllexViewChild.prototype.__cleanUp.call(this);
    lib.BasicController.prototype.__cleanUp.call(this);
  };

  module.controller ('allexDataCrudViewController', ['$scope', function ($scope) {
    new CrudView($scope);
  }]);

  module.directive ('allexDataCrudView', ['$compile', function ($compile) {
    function link (scope, el) {
      var $view = $('<allex-data-view>');
      var config = scope._ctrl.get('config');
      var c = {sink: config.sink, name: config.name};
      $view.attr('data-config', JSON.stringify(c));
      if (config.klass)  el.addClass(config.klass);
      el.append($view);
      $compile(el.contents())(scope);
    }
    return {
      restrict: 'E',
      controller: 'allexDataCrudViewController',
      replace: true,
      template: '<div class="crudview"></div>',
      link:link
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
