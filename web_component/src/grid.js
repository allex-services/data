(function (module, lib, allex) {
  module.directive('allexDataGrid', ['allex.lib.interfaces', '$compile', 'allex.CRUDAHelpers', function (Interfaces, $compile, CRUDAHelpers) {
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

    AllexDataGrid.prototype._doAction = function (form, action, data) {
      this._parent._doAction.call(this._parent, form, action, data.toHash(data.fieldNames()));
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
      var sf = this._parent.get('sinkConfiguration');
      var global_config = sf.action_cell_config && sf.action_cell_config.grid ? sf.action_cell_config.grid : {};
      this._appendCrudAndActions(config.columnDefs, global_config, this._parent.get('config'));
      return config;
    };

    AllexDataGrid.prototype._appendCrudAndActions = function (defs, gc, viewc) {
      var item_actions = CRUDAHelpers.buildActionsWidget(this._parent);
      if (!item_actions || !item_actions.length) return;

      var desc = angular.extend({name: 'Action'}, gc.action_cell_config, viewc.action_cell_config, {
        cellTemplate: item_actions
      });
      defs.unshift(desc);
      console.log('====DESC', desc, gc, viewc);
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
