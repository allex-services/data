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

    SinkAware.prototype.set_sink = function (sink) {
      if (this._mgl) this._mgl.destroy();
      this._mgl = null;

      if (sink) {
        this.set('sinkData', sink.data);
        this._mgl = sink.monitorDataForGui(this._onUpdateCB);
        //OVDE kao da nikad ne dobijem recordDescriptor ....
        this.recordDescriptorTranslator(sink.recordDescriptor);
        
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
        this.set('sink', this.get('user').getSubSink(path) || null);
      }else{
        this.set('sink', null);
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
        subinits: [{name: this.get('sinkPath'), identity: {role: this.get('user').get('role')}, propertyhash: this.get('propertyhash') || {}, cb: this.set.bind(this, 'sink')}]
      });
    };

    DynamicSink.prototype.set_sink = function (sink) {
      if (sink) {
        var c = this.config;
        taskRegistry.run('materializeData', {
          sink: sink,
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
      SinkAware.prototype.set_sink.call(this, sink);
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
  module.factory ('allex.data.GridMixIn', ['$compile', function ($compile) {

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
      this.gridOptions.columnDefs = this.produceColumnDefs(rd);
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
