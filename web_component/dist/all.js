(function (module, lib, allex) {
  module.factory('allex.data.DataMonitorMixIn', ['allex.lib.UserDependentMixIn', function (UserDependentMixIn) {
    function DataMonitorMixIn ($scope, subsinkPath) {
      UserDependentMixIn.call(this, $scope);
      this.subsinkPath = subsinkPath || null;
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

    DataMonitorMixIn.prototype._attach_subsink = function () {
      if (!this.get('subsinkPath')) return;
      this.set_subsink(this.get('user').getSubSink(this.get('subsinkPath')));
    };

    DataMonitorMixIn.prototype._ad_usr_stateChanged = function (state) {
      this._attach_subsink();
    };

    DataMonitorMixIn.prototype.set_subsinksPath = function () {
      this._attach_subsink();
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
      lib.inheritMethods (extendedClass, DataMonitorMixIn, 'set_subsink', 'get_data', '_ad_usr_stateChanged', 'set_record_descriptor', 'set_subsinksPath', '_attach_subsink');
    };

    return DataMonitorMixIn;
  }]);


})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.autoResize']), ALLEX.lib, ALLEX);
//samo da te vidim
(function (module, lib, allex) {

  module.factory ('allex.data.GridMixIn', ['allex.data.DataMonitorMixIn', '$compile', function (DataMonitorMixIn, $compile) {

    var DEFAULT_GRID_OPTIONS = {
      enableSorting:false,
      minimumColumnSize: 150 ///not working at the moment ...
    };

    function AllexDataGridMixIn ($scope, gridOptions, options) {
      options = options || {};
      this.gridOptions = angular.extend({}, DEFAULT_GRID_OPTIONS, gridOptions);
      this.gridOptions.data = "_ctrl.data";
      this.renderer = '<div class="grid_container" ui-grid="_ctrl.gridOptions"></div>';
      this.autoresize = options.autoresize || true;
      this._ready = false;
      DataMonitorMixIn.call(this, $scope, options.subsinkPath);
    }

    AllexDataGridMixIn.prototype.__cleanUp = function () {
      this.renderer = null;
      this.autoresize = null;
      this.gridOptions = null;
      this._ready = null;
      DataMonitorMixIn.prototype.__cleanUp.call(this);
    };

    AllexDataGridMixIn.addMethods = function (extendedClass) {
      DataMonitorMixIn.addMethods(extendedClass);
      lib.inheritMethods(extendedClass, AllexDataGridMixIn, 'set_el', '_doRender', 'set_record_descriptor', 'set_auto_resize', 'set_subsinksPath');
    };

    AllexDataGridMixIn.prototype.set_subsinksPath = function (subsinkPath) {
      var old_desc = this.get('record_descriptor');
      this.set('record_descriptor', null);
      DataMonitorMixIn.prototype.set_subsinksPath.call(this, subsinkPath);
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

  module.factory ('allex.data.CrudControllers', ['allex.AllexViewChild', function (AllexViewChild) {
    function Table ($scope) {
      lib.BasicController.call(this, $scope);
      AllexViewChild.call(this, $scope);
      this.data = [];

      this.get('user').execute('askForRemote', 'Banks').done(
        this._subConnect.bind(this),
        console.error.bind(console,'nok')
      );
    }
    lib.inherit(Table, lib.BasicController);
    AllexViewChild.addMethods(Table);

    Table.prototype.__cleanUp = function () {
      this.data = null;
      AllexViewChild.prototype.__cleanUp.call(this);
      lib.BasicController.prototype.__cleanUp.call(this);
    };

    Table.prototype._onSubSink = function (sink) {
      if (!sink) {
        ///TODO: connection down ... now what?
        return;
      }
      taskRegistry.run ('materializeData', {
        sink: sink, 
        data: this.data,
        onInitiated: this._onInitiated.bind(this),
        onRecordCreation: this._onRecordCreation.bind(this)
      });
    };

    Table.prototype._onInitiated = function () {
      ///when we got initial data se
    };

    Table.prototype._onRecordCreation = function () {
      ///when we got a new record
    };

    Table.prototype._subConnect = function () {
      taskRegistry.run ('acquireSubSinks', {
        state: taskRegistry.run('materializeState', { sink: this.get('user')._user.sink }),
        subinits: [{name: 'Banks', identity: {role:'user'}, propertyhash:{bla:'truc'}, cb: this._onSubSink.bind(this)}]
      });
    };

    return {
      'Table': Table
    };
  }]);



  module.controller ('allex.data.CrudTableViewController', ['$scope', 'allex.data.CrudControllers', function ($scope, CrudControllers) {
    new CrudControllers.Table($scope);
  }]);


  module.config(['allex.PageRouterProvider', function (PageRouteProvider) {
    PageRouteProvider.router.setAlias('partials/allex_dataservice/partials/crudtableview.html','table_cruds');
  }]);
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
