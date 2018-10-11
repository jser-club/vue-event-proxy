'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
function plugin(Vue) {
  var version = Number(Vue.version.split('.')[0]);
  var NOOP = function NOOP() {};
  if (version < 2) {
    console.error('[vue-event-proxy] only support Vue 2.0+');
    return;
  }

  // Exit if the plugin has already been installed.
  if (plugin.installed) {
    return;
  }

  var eventMap = {};
  var vmEventMap = {};
  var globalRE = /^global:/;

  function mixinEvents(Vue) {
    var on = Vue.prototype.$on;
    Vue.prototype.$on = function proxyOn(eventName) {
      var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : NOOP;

      var vm = this;
      if (Array.isArray(eventName)) {
        eventName.forEach(function (item) {
          vm.$on(item, fn);
        });
      } else {
        if (globalRE.test(eventName)) {
          (vmEventMap[vm._uid] || (vmEventMap[vm._uid] = [])).push(eventName);
          (eventMap[eventName] || (eventMap[eventName] = [])).push(vm);
        }
        on.call(vm, eventName, fn);
      }
      return vm;
    };

    var emit = Vue.prototype.$emit;
    Vue.prototype.$emit = function proxyEmit(eventName) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var vm = this;
      if (!vm._fromGlobalEvent && globalRE.test(eventName)) {
        var vmList = eventMap[eventName] || [];
        vmList.forEach(function (item) {
          item._fromGlobalEvent = true;
          item.$emit.apply(item, [eventName].concat(args));
          item._fromGlobalEvent = false;
        });
      } else {
        emit.apply(vm, [eventName].concat(args));
      }
      return vm;
    };
  }

  function applyMixin(Vue) {
    Vue.mixin({
      beforeCreate: function beforeCreate() {
        // Fix for warnNonPresent
        this._fromGlobalEvent = false;
      },
      beforeDestroy: function beforeDestroy() {
        var vm = this;
        var events = vmEventMap[vm._uid] || [];
        events.forEach(function (event) {
          var targetIdx = eventMap[event].findIndex(function (item) {
            return item._uid === vm._uid;
          });
          eventMap[event].splice(targetIdx, 1);
        });
        delete vmEventMap[vm._uid];
      }
    });
  }

  mixinEvents(Vue);
  applyMixin(Vue);
}

exports.default = plugin;