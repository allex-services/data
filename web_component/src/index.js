(function (module, lib, allex) {
  allex.web_components.data = {};

  module.run (['allex.dialog.Router', 'allex.dialog', function (Router, Dialog) {
    Router.register('dialog.CRUDCreateNotAllowed', function (sink_name) {
      return Dialog.error({'content': "You are not allowed to do create on sink <strong>{{_ctrl.getData().sink_name}}</strong>", data: {sink_name: sink_name}});
    });

    Router.register('dialog.CRUDNoConfig', function (sink_name, action) {
      return Dialog.error({'content': 'Unable to find configuration for action <strong>{{_ctrl.getData().action}}</strong> for sink <strong>{{_ctrl.getData().sink_name}}', data: {sink_name: sink_name, action: action}});
    });

    Router.register('dialog.data.action.edit', function (action, data, view) {
      return Dialog.open({controller: 'allex.data.EditItemController'}, {action:action, data: data, view: view});
    });
  }]);



})(angular.module('allex.data', ['allex.lib', 'ui.grid','ui.grid.resizeColumns','ui.grid.moveColumns', 'ui.grid.autoResize']), ALLEX.lib, ALLEX);
