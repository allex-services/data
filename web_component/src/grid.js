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
