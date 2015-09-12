(function (module, lib, allex) {
  module.factory('allex.data.DataReaderMixin', function () {

    function DataReaderJob(datareader, promise) {
      this.reader = datareader;
      promise.then(
        this.onDone.bind(this),
        this.onError.bind(this),
        this.onData.bind(this)
      );
    }
    DataReaderJob.prototype.destroy = function () {
      if (this.reader) {
        if (this.reader.activeReader === this) {
          this.reader.activeReader = null;
        }
      }
      this.reader = null;
    };
    DataReaderJob.prototype.onDone = function () {
      if (!this.reader) {
        return;
      }
      this.reader.$apply();
      this.destroy();
    };
    DataReaderJob.prototype.onError = function () {
      if (!this.reader) {
        return;
      }
      //something should be done about this error
      this.reader.$apply();
      this.destroy();
    };
    DataReaderJob.prototype.onData = function (datahash) {
      if (!this.reader) {
        return;
      }
      this.reader.data.push(datahash);
    };

    function DataReaderMixin(sinkname, data) {
      this.sinkname = sinkname;
      this.data = data || [];
      this.activeReader = null;
    }
    DataReaderMixin.prototype.__cleanUp = function () {
      this.data = null;
      this.sinkname = null;
    };
    DataReaderMixin.prototype.readData = function () {
      var u = this.get('user');
      if (!u) {
        return;
      }
      if (this.activeReader) {
        this.activeReader.destroy();
      }
      this.data.splice(0);
      this.activeReader = new DataReaderJob(
        this,
        u.execute(
          'readData',
          this.sinkname,
          this.createDataReadFilter()
        )
      );
    };
    DataReaderMixin.addMethods = function (extendedClass) {
      lib.inheritMethods(extendedClass, DataReaderMixin, ['readData']);
    };

    return DataReaderMixin;
  });
})(angular.module('allex.data'), ALLEX.lib, ALLEX);
