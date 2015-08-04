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

    SinkAware.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      if (this._mgl) this._mgl.destroy();
      this._mgl = null;

      if (sinkRepresentation) {
        this.set('sinkData', sinkRepresentation.data);
        this._mgl = sinkRepresentation.monitorDataForGui(this._onUpdateCB);
        this.recordDescriptorTranslator(sinkRepresentation.sink.recordDescriptor);
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
        this.set('sinkRepresentation', this.get('user').getSubSink(path) || null);
      }else{
        this.set('sinkRepresentation', null);
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
        subinits: [{name: this.get('sinkPath'), identity: {role: this.get('user').get('role')}, propertyhash: this.get('propertyhash') || {}, cb: this.set.bind(this, 'sinkRepresentation')}]
      });
    };

    DynamicSink.prototype.set_sinkRepresentation = function (sinkRepresentation) {
      if (sinkRepresentation) {
        var c = this.config;
        taskRegistry.run('materializeData', {
          sink: sinkRepresentation.sink,
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
      SinkAware.prototype.set_sinkRepresentation.call(this, sinkRepresentation);
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
