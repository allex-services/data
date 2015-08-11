(function (module, lib, allex) {
})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {
  module.directive('allexDataView', ['$parse', 'allex.lib.UserDependentMixIn', function ($parse, UserDependentMixIn) {
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
      //console.log('AJ DA VIDIMO ...', this.sink_name);
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

  module.factory ('allex.data.CreateNewItemControllerF', ['allex.lib.form.WaitingUserModalTwoButtonForm',function (WaitingUserModalTwoButtonForm) {
    function CreateNewItemController($scope, $modalInstance, settings) {
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
        form: this._buildFormDescriptor(settings.recordDescriptor)
      });
    }

    lib.inherit(CreateNewItemController, WaitingUserModalTwoButtonForm);
    CreateNewItemController.prototype.__cleanUp = function () {
      WaitingUserModalTwoButtonForm.prototype.__cleanUp.call(this);
    };

    function tofd (item) {
      return {schema: angular.extend({}, item, {required: true})};
    }
    CreateNewItemController.prototype._buildFormDescriptor = function (rd) {
      return {fields: rd.fields.map(tofd)};
    };

    CreateNewItemController.prototype.set_form_ready = function (val) {
      WaitingUserModalTwoButtonForm.prototype.set_form_ready.call(this, val);
      this.settings.setButton('save', 'visible', val);
    };

    CreateNewItemController.prototype._onCreate = function (cb) {
      this.set('promise', cb(this.vals));
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
          doCreate : this.doCreate.bind(this)
        });
      }else{
        if (!crudc.dialogs[this.get('role')]){
          return Router.go('dialog.CRUDCreateNotAllowed', [this.get('sink_name')]);
        }else{
          return Router.go(crudc.dialogs[this.get('role')]);
        }
      }
    };

    AllexDataCrud.prototype.doCreate = function (vals) {
      var defer = lib.q.defer();
      console.log('SAAAAAAAAAAAAAAMO DA TA VIDIM ...', vals); ///TODO: STIGAO SI DO OVDE ...
      return defer.promise;
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

  module.run (['allex.Router', 'allex.dialog', function (Router, Dialog) {
    Router.register('dialog.CRUDCreateNotAllowed', function (sink_name) {
      return Dialog.error({'content': "You are not allowed to do create on sink <strong>{{_ctrl.getData().sink_name}}</strong>", data: {sink_name: sink_name}});
    });

    Router.register('dialog.CRUDNoConfig', function (sink_name, action) {
      return Dialog.error({'content': 'Unable to find configuration for action <strong>{{_ctrl.getData().action}}</strong> for sink <strong>{{_ctrl.getData().sink_name}}', data: {sink_name: sink_name, action: action}});
    });
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
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
(function (module, lib, allex) {
  module.directive('allexDataGrid', ['allex.lib.interfaces', '$compile', function (Interfaces, $compile) {
    function AllexDataGrid($scope) {
      lib.BasicController.call(this, $scope);
      Interfaces.Element.call(this);
      this._parent = $scope.$parent._ctrl;
      this._record_descriptor_l = null;
    }
    lib.inherit(AllexDataGrid, lib.BasicController);
    Interfaces.Element.addMethods(AllexDataGrid);
    AllexDataGrid.prototype.__cleanUp = function () {
      this._record_descriptor_l.destroy();
      this._record_descriptor_l = null;
      this._parent = null;
      Interfaces.Element.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
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
      var $grid = $('<div>').addClass('allex_grid').attr('data-ui-grid', '_ctrl.gridOptions');
      var el = this.get('el');
      el.append($grid);
      el.removeClass();
      el.addClass('allex_grid_container');

      var config = this._parent.get('config');
      if (config) {
        if (config.autoresize) $grid.attr('ui-grid-auto-resize', '');
        if (config.container_class) el.addClass(config.container_class);
        if (config.grid_class) $grid.addClass(config.grid_class);
      }

      $compile(this.get('el').contents())(this.scope);
    };

    AllexDataGrid.prototype.prepareGridOptions = function (recordDescriptor) {
      var grid = this._parent.get('config') ? this._parent.get('config').grid: null;
      var config = angular.extend({}, grid);
      var cfgd = config.columnDefs;
      config.columnDefs = recordDescriptor.fields.map (this._buildColumnDef.bind(this, cfgd));
      return config;
    };

    AllexDataGrid.prototype._buildColumnDef = function (cfgd, rditem) {
      return angular.extend( (cfgd && cfgd[rditem.name]) || {}, {displayName: rditem.title, 'field': rditem.name});
    };

    return {
      restrict: 'E',
      replace: true,
      scope: true,
      transclude: true,
      controller: AllexDataGrid,
      template: '<div class="allex_grid_container"></div>',
      link: function (scope, el, attrs) {
        scope._ctrl.set('el', el);
      }
    };
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
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
  module.directive('allexDataCrudNew', ['$compile', 'allex.lib.UserDependentMixIn', 'allex.Router', function ($compile, UserDependentMixIn, AllexRouter) {
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
      console.log('==============>', this.get('user').getSubSink(this.sink));

    };

    return {
      restrict: 'E',
      controller: DataCrudNew,
      replace: true,
      template: '<button class="btn" data-ng-show="_ctrl.allowed" data-ng-click="_ctrl.go()"></button>',
      link: function (scope, el, attrs) {
        scope._ctrl.set('sink', attrs.sink);
        if (attrs.roles && attrs.roles.length) scope._ctrl.set('roles', attrs.roles);
        el.html(attrs.label);
      }
    };
  }]);

  module.directive ('allexDataCrudView', ['$compile', 'allex.AllexViewChild', function ($compile, AllexViewChild) {
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

    return {
      restrict: 'E',
      controller: CrudView,
      replace: true,
      template: '<div class="crudview"></div>',
      link:function (scope, el) {
        var $view = $('<allex-data-view>');
        var config = scope._ctrl.get('config');
        var c = {sink: config.sink, name: config.name};
        $view.attr('data-config', JSON.stringify(c));
        if (config.klass)  el.addClass(config.klass);
        el.append($view);
        $compile(el.contents())(scope);
      }
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
