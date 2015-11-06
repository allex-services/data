(function (module, lib, allex, wcomponent) {
  var allexcomponent = allex.WEB_COMPONENT,
    UserDependentMixIn = allexcomponent.user.UserDependentMixIn,
    WaitingModalUserTwoButtonForm = allexcomponent.forms.WaitingModalUserTwoButtonForm,
    CRUDAHelpers = wcomponent.helpers;


  function EditController($scope, $modalInstance, settings) {
    this.view = settings.view;
    var rd = this.view.get('recordDescriptor');
    if (!rd.primaryKey) {
      //ovo  mora ranije
      throw new Error('NO PRIMARY KEY ...');
    }
    this.primaryKey = rd.primaryKey;
    var config = this.view.get('config');
    var form = CRUDAHelpers.buildFormDescriptor(settings.view.get('recordDescriptor'), settings.data, config ? angular.extend({}, config['#fields'], config.edit) : null);

    form.fields[this.get('primaryKey')].attribs = {
      'ng-disabled':'1'
    };

    WaitingModalUserTwoButtonForm.call(this, $scope, $modalInstance, {
      settings: {
        dialog : { 
          messages: {autofade: 2000},
          success: { autoclose: 1000 },
          title: 'Edit',
          '#content': 'jsonform'
        },
        button_config: {
          buttons: {
            save: {
              visible: false
            },
            cancel: {action : 'close'}
          }
        }
      },
      form: form
    });
  }

  lib.inherit(EditController, WaitingModalUserTwoButtonForm);
  EditController.prototype.__cleanUp = function () {
    this.primaryKey = null;
    this.view = null;
    WaitingModalUserTwoButtonForm.prototype.__cleanUp.call(this);
  };

  EditController.prototype.dogo = function () {
    var primaryKey = this.get('primaryKey'),
      promise = this.get('user').getSubSink(this.view.get('sink_name')).sink.call('update', {op:'eq', field:primaryKey, value: this.vals[primaryKey]} ,this.get('vals'));
    //TODO: sad bismo trebali da odgovorimo nesto pametno ...
    this.set('promise', promise);
  };


  module.controller('allex.data.EditItemController', ['$scope', '$modalInstance', 'settings', function ($scope, $modalInstance, settings) {
    new EditController($scope, $modalInstance, settings);
  }]);

})(angular.module('allex.data'), ALLEX.lib, ALLEX, ALLEX.web_components.data);
