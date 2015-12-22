(function (lib, allex, wcomponent) {
  function hasPermission (cruds, actions, role, name) {
    if ('create' === name) return false; //discard create, it's not allowed action ...
    var c = name in cruds ? cruds[name] : (actions ? actions[name] : null);
    if (!c) return false;

    if (!('roles' in c)) return true; ///no roles given ... so allowd to all
    if (!c.roles || !c.roles.length) return false; // roles: null or roles: '' will forbid for all
    
    return c.roles.split(',').indexOf(role) > -1;
  }

  function itemActions (view) {
    ///TODO: uvedi koncept deklarisanja widget-a u konfiguraciji ....
    if (!view.actionable) return null;

    var sc = view.get('sinkConfiguration'), 
      user = view.get('user'), 
      primaryKey = view.get('recordDescriptor').primaryKey,
      viewc = sc[view.get('name')];
    if (!primaryKey) return null;

    var items = null, 
      order = 'item_action_order' in viewc ? viewc.item_action_order : sc.item_action_order;

    if (!order) return null; ///you do not want actions on this view, right?
    return order ? order.filter(hasPermission.bind(null, sc.crud, sc.actions, user.get('role'))) : null;
  }

  function buildWidget (DEFAULTS, sc, name) {
    var c = name in sc.crud ? sc.crud[name] : sc.actions[name];
    if (!c) return '';
    return (c.widget ? c.widget : DEFAULTS[name]) || '';
  }

  function buildActionsWidget (view, wdefaults) {
    var actions = itemActions(view);
    if (!actions || !actions.length) return;
    var type = view.get('viewType');
    var widgets = angular.extend({}, wdefaults, ALLEX_CONFIGURATION.VIEW_ACTION_WIDGETS ? ALLEX_CONFIGURATION.VIEW_ACTION_WIDGETS[type] : null, view.get('sinkConfiguration')[view.get('name')].actions);
    if (!widgets) return;
    return actions.map(buildWidget.bind(null, widgets, view.get('sinkConfiguration'))).join('');
  }

  function tofd (defaults, item) {
    var ext = {required: true};
    if (defaults && defaults[item.name]) ext.default = defaults[item.name];
    return {schema: angular.extend({}, item, ext)};
  }

  function trd (ret, defaults, item) {
    ret[item.name] = tofd(defaults, item);
  }
  function buildFormDescriptor (recordDescriptor, defaults, config) {
    var ret = {fields: {}};
    recordDescriptor.fields.forEach (trd.bind(null, ret.fields, defaults));

    if (config && config.form) {
      var f = config.form;
      lib.traverse(f, buildFormDescriptor_extend.bind(null, ret.fields));
    }

    return ret;
  }

  buildFormDescriptor_extend = function (form, content, key){
    form[key] = angular.extend({}, form[key], content);
  };

  wcomponent.helpers = {
    itemActions: itemActions,
    buildActionsWidget: buildActionsWidget,
    buildFormDescriptor: buildFormDescriptor
  };

})(ALLEX.lib, ALLEX, ALLEX.web_components.data);
