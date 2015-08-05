(function (module, lib, allex) {

  module.factory('allex.data.sinkFactory', [function () {
    var CLDestroyable = lib.CLDestroyable,
      taskRegistry = allex.execSuite.taskRegistry;

    function SinkAware(config){
      CLDestroyable.call(this);
      if (!config) config = {};
      this.sinkPath = null;
      this.sinkData = null;
      this.user = config.user;
      this._mgl = null;

      ///THIS IS SOOOOO OBSOLETE ...
      this.recordDescriptorTranslator = config.recordDescriptorTranslator || lib.dummyFunc;
      this._onUpdateCB = config.onUpdate || lib.dummyFunc;
      this.config = config;

      this._user_state_l = this.user.attachListener ('state', this._onUserStateChanged.bind(this));
    }
    lib.inherit(SinkAware, CLDestroyable);

    SinkAware.prototype.__cleanUp = function () {
      this.config = null;
      if (this._user_state_l) this._user_state_l.destroy();
      this._user_state_l = null;

      if (this._mgl) this._mgl.destroy();
      this._mgl = null;

      this.user = null;
      this.sinkData = null;
      this.sinkPath = null;
      this._onUpdateCB = null;
      this.recordDescriptorTranslator = null;
      CLDestroyable.prototype.__cleanUp.call(this);
    };

    SinkAware.prototype._onUserStateChanged = function (user_state) {
      this._createSink();
    };

    SinkAware.prototype.set_sinkPath = function (path) {
      this.sinkPath = path;
      this._createSink();
    };

    SinkAware.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      if (this._mgl) this._mgl.destroy();
      this._mgl = null;

      if (sinkRepresentation) {
        this.set('sinkData', sinkRepresentation.data);
        this._mgl = sinkRepresentation.monitorDataForGui(this._onUpdateCB);
        this.recordDescriptorTranslator(sinkRepresentation.sink.recordDescriptor);
      }
      this._onUpdateCB();
    };

    function StaticSink(config) {
      SinkAware.call(this, config);
    }
    lib.inherit(StaticSink, SinkAware);

    StaticSink.prototype.__cleanUp = function () {
      SinkAware.prototype.__cleanUp.call(this);
    };

    StaticSink.prototype._createSink = function () {
      var path = this.get('sinkPath');
      if (path) {
        this.set('sinkRepresentation', this.get('user').getSubSink(path) || null);
      }else{
        this.set('sinkRepresentation', null);
      }
    };

    function DynamicSink(config){
      SinkAware.call(this, config);
      this.propertyhash = config.propertyhash;
      this._dataCbs = config.dataCallBacks;
    }
    lib.inherit(DynamicSink, SinkAware);
    DynamicSink.prototype.__cleanUp = function () {
      this._dataCbs = null;
      this.propertyhash = null;
      SinkAware.prototype.__cleanUp.call(this);
    };

    DynamicSink.prototype._createSink = function () {
      var path = this.get('sinkPath');
      if (path) {
        this.get('user').execute('askForRemote', path)
          .done(this._doConnect.bind(this), this._remoteFailed.bind(this));
      }
    };
    DynamicSink.prototype._remoteFailed = function () {
      //STA SAD?
    };

    DynamicSink.prototype._doConnect = function () {
      taskRegistry.run('acquireSubSinks', {
        state: taskRegistry.run('materializeState', {sink: this.get('user').get('user_sink')}),
        subinits: [{name: this.get('sinkPath'), identity: {role: this.get('user').get('role')}, propertyhash: this.get('propertyhash') || {}, cb: this.set.bind(this, 'sinkRepresentation')}]
      });
    };

    DynamicSink.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      if (sinkRepresentation) {
        var c = this.config;
        taskRegistry.run('materializeData', {
          sink: sinkRepresentation.sink,
          data: this.sinkData,
          onInitiated: c.onInitiated,
          onRecordCreation: c.onRecordCreation,
          onDelete: c.onDelete,
          onNewRecord: c.onNewRecord,
          onRecordDeletion: c.onRecordDeletion,
          onUpdate: c.onUpdate,
          onRecordUpdate: c.onRecordUpdate
        });
      }
      SinkAware.prototype.set_sinkRepresentation.call(this, sinkRepresentation);
    };


    return function (type, config) {
      if (type !== 'dynamic' && type !== 'static') throw new Error ('Unknown sink type: '+type);
      return (type === 'dynamic') ? new DynamicSink(config) : new StaticSink(config);
    };

  }]);


  module.factory('allex.data.ViewSetUp', [function () {
    return function (sink, view) {
      if (!sink) throw new Error('No sink given');
      if (!view) throw new Error('No view given');
      if (!ALLEX_CONFIGURATION.VIEWS[sink]) throw new Error('No view configuration for sink '+sink);
      if (!ALLEX_CONFIGURATION.VIEWS[sink][view]) throw new Error('No view configuration for sink '+view);
      return {
        sink_type:ALLEX_CONFIGURATION.VIEWS[sink].sink_type,
        view: ALLEX_CONFIGURATION.VIEWS[sink][view] 
      };
    };
  }]);


})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
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
      //console.log('AND RECORD DESCRIPTOR IS ', recordDescriptor);
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
  module.factory ('allex.data.GridMixIn', ['$compile', function ($compile) {


    ///TODO: ovaj deo je djubre ....

    var DEFAULT_GRID_OPTIONS = {
      enableSorting:false,
      minimumColumnSize: 150 ///not working at the moment ...
    };

    function AllexDataGridMixIn ($scope, gridOptions, options) {
      options = options || {};
      this.gridOptions = angular.extend({}, DEFAULT_GRID_OPTIONS, gridOptions);
      this.gridOptions.data = "_ctrl."+ options.dataPath ? options.dataPath : "sinkData";
      this.renderer = '<div class="grid_container" ui-grid="_ctrl.gridOptions"></div>';
      this.autoresize = options.autoresize || true;
      this._ready = false;
    }

    AllexDataGridMixIn.prototype.__cleanUp = function () {
      this.renderer = null;
      this.autoresize = null;
      this.gridOptions = null;
      this._ready = null;
    };

    AllexDataGridMixIn.addMethods = function (extendedClass) {
      lib.inheritMethods(extendedClass, AllexDataGridMixIn, 'set_el', '_doRender', 'set_record_descriptor', 'set_auto_resize', 'set_subsinksPath');
    };

    AllexDataGridMixIn.prototype.set_auto_resize = function (ar) {
      this.autoresize = ar;
      this._doRender();
    };

    AllexDataGridMixIn.prototype.set_el = function (el) {
      this.el = el;
      this._doRender();
    };

    AllexDataGridMixIn.prototype.set_record_descriptor = function (rd) {
      //this.gridOptions.columnDefs = this.produceColumnDefs(rd);
      this._ready = true;
      this._doRender();
    };

    AllexDataGridMixIn.prototype._doRender = function () {
      if (!(this._ready && this.el)) return;
      this.el.empty();
      var $ap = $(this.renderer);
      if (this.autoresize) {
        $ap.attr('ui-grid-auto-resize' ,'');
      }
      this.el.append($ap);
      $compile(this.el.contents())(this.scope);
    };

    return AllexDataGridMixIn;
  }]);

  module.directive('allexDataGrid', [function () {
    return {
      restrict: 'E',
      transclude:true,
      replace:true,
      template: '<div class="allexdatagrid"></div>',
      link:function (scope, el) {
        scope._ctrl.set('el', el);
      }
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {

  ///TODO: aj sad poteci, malo prepakuj nesto ;)

  module.factory('allex.data.TreeMixIn', ['allex.data.DataMonitorMixIn', function(DataMonitorMixIn) {
    var DEFAULT_TREE_CONFIG = {
      core : {
        multiple : false,
        animation: true,
        error : function(error) {
          log.error('treeCtrl: error from js tree - ' + angular.toJson(error));
        },
        check_callback : true,
        worker : true
      },
      types : {
        default : {
          icon : 'glyphicon glyphicon-flash'
        },
        star : {
          icon : 'glyphicon glyphicon-star'
        },
        cloud : {
          icon : 'glyphicon glyphicon-cloud'
        }
      },
      version : 1,
      plugins : ['types','checkbox']
    };

    function TreeMixIn ($scope, config, subsinkPath) {
      this.treeConfig = angular.extend({}, DEFAULT_TREE_CONFIG, config);
      this.treeInstance = null;
      this.treeData = null;

      DataMonitorMixIn.call(this, $scope, subsinkPath);
    }

    TreeMixIn.prototype.__cleanUp = function () {
      this.treeConfig = null;
      this.treeInstance = null;
      this.treeData = null;
      DataMonitorMixIn.prototype.__cleanUp.call(this);
    };

    TreeMixIn.addMethods = function (extended) {
      DataMonitorMixIn.addMethods(extended);
      lib.inheritMethods(extended, TreeMixIn, '_onTreeReady', '_onTreeNodeCreated', '_reprocessStructure');
    };

    TreeMixIn.prototype._onTreeReady = function () {
      ///override if you need
    };
    TreeMixIn.prototype._onTreeNodeCreated = function () {
      ///override if you need
    };

    TreeMixIn.prototype._reprocessStructure = function () {
      ///SHOULD DO REPROCESSING PART UPON FETCHED DATA ....
    };

    return TreeMixIn;
  }]);

  module.directive ('allexTree', function () {
    return {
      restrict: 'E',
      replace: true,
      template: '<div js-tree="_ctrl.treeConfig", ng-model="_ctrl.treeData" tree="_ctrl.treeInstance" tree-events="ready:_ctrl._onTreeReady; create_node:_ctrl._onTreeNodeCreated"></div>'
    };
  });
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {
  var taskRegistry = allex.execSuite.taskRegistry;

  module.factory ('allex.data.Views', [
    'allex.data.ViewSetUp',
    'allex.AllexViewChild', 
    'allex.lib.UserDependentMixIn',
    'allex.data.sinkFactory', 
    'allex.data.GridMixIn',

    function (viewSetup, AllexViewChild, UserDependentMixIn, sinkFactory, GridMixIn) {

      function Table ($scope){
        lib.BasicController.call(this, $scope);
        AllexViewChild.call(this, $scope);
        UserDependentMixIn.call(this, $scope);

        var config = this.get('data');
        this.view_setup = viewSetup(config.sink, config.view);
        this.sink_wrapper = sinkFactory(this.view_setup.sink_type, {
          user: this.get('user'),
          onUpdate : this._onUpdate.bind(this)
        });
        GridMixIn.call(this, $scope, this.view_setup.view.grid, this.view_setup.view.config);
        this.sink_wrapper.set('sinkPath', config.sink);
      }
      lib.inherit(Table, lib.BasicController);
      AllexViewChild.addMethods(Table);
      UserDependentMixIn.addMethods(Table);
      GridMixIn.addMethods(Table);

      Table.prototype.__cleanUp = function () {
        this.sink_wrapper.destroy();
        this.sink_wrapper = null;
        this.view_setup = null;
        UserDependentMixIn.prototype.__cleanUp.call(this);
        AllexViewChild.prototype.__cleanUp.call(this);
        GridMixIn.prototype.__cleanUp.call(this);
        lib.BasicController.prototype.__cleanUp.call(this);
      };

      Table.prototype._onUpdate = function () {
        this.$apply();
        console.log('AJ DA TE VIDIM ...');
      };
    return {
      'Table': Table
    };
  }]);

  module.controller ('allex.data.ViewsController', ['$scope', 'allex.data.Views', function ($scope, Views) {
    new Views.Table($scope);
  }]);


  module.config(['allex.PageRouterProvider', function (PageRouteProvider) {
    PageRouteProvider.router.setAlias('partials/allex_dataservice/partials/crudtableview.html','table_cruds');
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
