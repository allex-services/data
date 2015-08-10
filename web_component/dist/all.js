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

      var config = this._parent.get('config');
      this.gridOptions = this.prepareGridOptions(recordDescriptor);
      this.gridOptions.data = this._parent.get('data');
      var $grid = $('<div>').addClass('allex_grid').attr('data-ui-grid', '_ctrl.gridOptions');

      if (config.autoresize) {
        $grid.attr('ui-grid-auto-resize', '');
      }

      var el = this.get('el');
      el.append($grid);
      el.removeClass();
      el.addClass('allex_grid_container');

      if (config.container_class) el.addClass(config.container_class);
      if (config.grid_class) $grid.addClass(config.grid_class);

      $compile(this.get('el').contents())(this.scope);
    };

    AllexDataGrid.prototype.prepareGridOptions = function (recordDescriptor) {
      var config = angular.extend({}, this._parent.get('config').grid);
      var cfgd = config.columnDefs;
      config.columnDefs = recordDescriptor.fields.map (this._buildColumnDef.bind(this, cfgd));
      return config;
    };

    AllexDataGrid.prototype._buildColumnDef = function (cfgd, rditem) {
      return angular.extend(cfgd[rditem.name] || {}, {displayName: rditem.title, 'field': rditem.name});
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

  module.directive ('allexDataCrudView', ['$compile', 'allex.AllexViewChild', function ($compile, AllexViewChild) {
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
      scope: false,
      transclude : true,
      controller: CrudView,
      replace: true,
      template: '<div class="crudview"></div>',
      link:function (scope, el) {
        var $view = $('<allex-data-view>');
        $view.attr('data-config', JSON.stringify(scope._ctrl.config));
        el.append($view);
        $compile(el.contents())(scope);
      }
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
