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
        repeat_attr+=(' track by '+(config.track?config.track:'$index'));
        if (config.orderBy) {
          //TODO
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
