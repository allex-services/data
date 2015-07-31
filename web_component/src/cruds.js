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
