(function (module, lib, allex) {
  var allexcomponent = allex.WEB_COMPONENT,
    AllexViewChild = allexcomponent.routers.AllexViewChild,
    Router = allexcomponent.routers.RouterSet,
    UserDependentMixIn = allexcomponent.user.UserDependentMixIn;

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
    //console.log('==============>', this.get('user').getSubSink(this.sink));
  };

  module.controller ('allexDataCrudNewController', ['$scope', function ($scope) {
    new DataCrudNew($scope);
  }]);

  module.directive('allexDataCrudNew', ['$compile', function ($compile) {
    function link (scope, el, attrs) {
      scope._ctrl.set('sink', attrs.sink);
      if (attrs.roles && attrs.roles.length) scope._ctrl.set('roles', attrs.roles);
      el.html(attrs.label);
    }

    return {
      restrict: 'E',
      controller: 'allexDataCrudNewController',
      replace: true,
      template: '<button class="btn" data-ng-show="_ctrl.allowed" data-ng-click="_ctrl.go()"></button>',
      link: link
    };
  }]);

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

  module.controller ('allexDataCrudViewController', ['$scope', function ($scope) {
    new CrudView($scope);
  }]);

  module.directive ('allexDataCrudView', ['$compile', function ($compile) {
    function link (scope, el) {
      var $view = $('<allex-data-view>');
      var config = scope._ctrl.get('config');
      var c = {sink: config.sink, name: config.name};
      $view.attr('data-config', JSON.stringify(c));
      if (config.klass)  el.addClass(config.klass);
      el.append($view);
      $compile(el.contents())(scope);
    }
    return {
      restrict: 'E',
      controller: 'allexDataCrudViewController',
      replace: true,
      template: '<div class="crudview"></div>',
      link:link
    };
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX);
