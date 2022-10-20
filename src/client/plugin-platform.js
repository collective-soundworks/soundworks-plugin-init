import NoSleep from 'nosleep.js';
import MobileDetect from 'mobile-detect';
// default built-in definition
import defaultDefinitions from './default-definitions.js';

const definitions = {};

const pluginFactory = function(AbstractPlugin) {
  return class PluginPlatform extends AbstractPlugin {
    constructor(client, name, options) {
      super(client, name);

      const defaults = {
        features: {},
      };

      for (let name in options) {
        if (!(name in defaults)) {
          throw new Error(`[plugin:${this.id}] Unknown option "${name}" (available options: ${Object.keys(defaults).join(', ')})`);
        }
      }

      this.options = Object.assign(defaults, options);

      this.state = {
        userGestureTriggered: false,
        infos: null,
        available: null,
        initialized: null,
        finalized: null,
      };

      this._requiredFeatures = new Set();
      this._startPromiseResolve = null;
      this._startPromiseReject = null;

      const features = this.options.features;

      for (let id in features) {
        // make sure args is an array
        let args = features[id];

        if (!Array.isArray(args)) {
          args = [args];
        }

        this._requiredFeatures.add({ id, args });

        // automatically add feature to check audioContext on iOS
        if (id === 'web-audio') {
          const audioContext = args[0];

          this._requiredFeatures.add({
            id: 'check-ios-audio-context-sample-rate',
            args: [audioContext],
          });
        }
      }

      this._requiredFeatures.forEach(({ id, args }) => {
        if (!definitions[id]) {
          throw new Error(`[plugin:${this.id}] Required undefined feature: "${id}"`)
        }
      });

      // make "this" safe
      this.onUserGesture = this.onUserGesture.bind(this);
    }

    /**
     *  Lifecycle:
     *  - check required features
     *  - if (false)
     *     show 'sorry' screen
     *  - else
     *     show 'welcome' screen
     *     execute start hook (promise)
     *     - if (promise === true)
     *        show touch to start
     *        bind events
     *     - else
     *        show 'sorry' screen
     *
     * @private
     */
    async start() {
      // this promise will be resolved of rejected only on user gesture
      const startPromise = new Promise((resolve, reject) => {
        this._startPromiseResolve = resolve;
        this._startPromiseReject = reject;
      });

      const ua = window.navigator.userAgent;
      const md = new MobileDetect(ua);
      const mobile = (md.mobile() !== null);
      const _os = md.os();
      let os;

      if (_os === 'AndroidOS') {
        os = 'android';
      } else if (_os === 'iOS') {
        os = 'ios';
      } else {
        os = 'other';
      }

      const infos = { mobile, os };

      const availablePromises = this._executeFeatures('available');
      const available = await this._resolveFeatures(availablePromises);
      this.propagateStateChange({ infos, available });

      if (!available.result) {
        this._startPromiseReject('not compatible');
        return;
      }

      return startPromise;
    }

    /**
     * Method to be executed by the application on the first user gesture.
     * Calling this method several times will result in a no-op after the first call.
     *
     * @example
     * myView.addEventListener((e) => {
     *   platformPlugin.onUserGesture(e);
     * });
     */
    async onUserGesture(event) {
      // prevent calling twice
      if (this.state.userGestureTriggered === true) {
        return;
      }

      this.propagateStateChange({ userGestureTriggered: true });

      // cf. https://stackoverflow.com/questions/46746288/mousedown-and-mouseup-triggered-on-touch-devices
      // event.preventDefault();

      // we need some feedback to show that the user gesture has been taken into account
      //
      // @note - we cannot `await` here, because `audioContext.resume` must be called
      // directly into the user gesture, for some reason Safari does not understand that
      // cf. https://stackoverflow.com/questions/57510426/cannot-resume-audiocontext-in-safari
      // this.state.set({ initializing: true });

      // we need a user gesture:
      // cf. https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
      if (event.type !== 'click') {
        throw new Error(`[[${this.name}] onUserGesture MUST be called on ""mouseup" or "touchend" events
cf. https://developers.google.com/web/updates/2017/09/autoplay-policy-changes`);
      }

      //* -------------------------------------------------------------
      // - The "No sleep" tail
      //
      // @note 1 (??/??/????)  - we dont care to have that on desktop (we don't
      // actually want that, because of weird CPU usage on chrome), but it is hard
      // to separate an emulated mobile from real mobile, the only solution seems
      // to be through usage of `navigator.platform` but the list is long...
      // cf. https://stackoverflow.com/questions/19877924/what-is-the-list-of-possible-values-for-navigator-platform-as-of-today
      // ...so we only remove mac OSX for now... we will adapt later according
      // to real world usage..
      //
      // const noSleepExcludePlatform = ['MacIntel'];
      // const noSleepExcluded = noSleepExcludePlatform.indexOf(navigator.platform) !== -1
      //
      // if (mode === 'touch' && !noSleepExcluded) {
      //   const noSleep = new NoSleep();
      //   noSleep.enable();
      // }
      //
      // @note 2 (23/10/2020) - this seems to be fixed w/ native WakeLock API
      // (keep the code just in case...)
      //
      // @note 3 (23/10/2020) - Android still uses the video fallback
      //
      // @note 4 (23/10/2020) - arg... - https://github.com/richtr/NoSleep.js/issues/100
      // Let's listen for a 'click' event in the @soundworks/template-helpers as
      // a preventive action. We anyway never used the `info.interactionMode`
      // so let's consider it is a problem of the application.
      //
      // -------------------------------------------------------------
      const noSleep = new NoSleep();
      noSleep.enable();

      // execute interaction hooks from the platform

      // note (24/09/2021) - Safari > 14 does not allow any async calls before
      // accesing deviceMotion.requestPermission, so all initialize should be
      // be called synchronously, and we must resolve the Promises after
      // therefore `_resolveFeatures` is now a synchronous `_executeFeatures`
      // and `_resolveFeatures` is called after.
      const initializedPromises = this._executeFeatures('initialize');
      const initialized = await this._resolveFeatures(initializedPromises);
      this.propagateStateChange({ initialized });

      if (initialized.result === false) {
        this._startPromiseReject('initialization failed');
        return;
      }

      // @warning - no `await` should happen before that point
      const finalizedPromises = await this._executeFeatures('finalize');
      const finalized = await this._resolveFeatures(finalizedPromises);
      this.propagateStateChange({ finalized });

      if (finalized.result === false) {
        this._startPromiseReject('finalization failed');
        return;
      }

      // nothing failed, we are ready
      this._startPromiseResolve();
    }

    // note (19/10/2022) @important - the split between this 2 methods looks silly,
    // but is important in order to make devicemotion.requestPermission work on iOS
    // so DO NOT change that!!!
    _executeFeatures(step) {
      const promises = {};

      for (const { id, args } of this._requiredFeatures) {
        if (definitions[id][step]) {
          const featureResultPromise = definitions[id][step](this.state, ...args);

          promises[id] = featureResultPromise;
        } else {
          promises[id] = Promise.resolve(true); // result cannot change in this case
        }
      };

      return promises;
    }

    async _resolveFeatures(promises) {
      const result = {
        details: {},
        result: true,
      };

      for (let id in promises) {
        const featureResult = await promises[id];
        result.details[id] = featureResult;
        result.result = result.result || featureResult;
      }

      return result;
    }
  }
}

/**
 * Structure of the definition for the test of a feature.
 *
 * @param {Object} - definition of a feature
 * @param {String} obj.id
 * @param {Function : Promise.resolve(true|false)} [obj.available=undefined] -
 *  called *before* user gesture
 * @param {Function : Promise.resolve(true|false)} [obj.initialize=undefined] -
 *  called *after* user gesture
 * @param {Function : Promise.resolve(true|false)} [obj.finalize=undefined] -
 *  called *after* user gesture
 *
 * @param {module:soundworks/client.Platform~definition} obj - Definition of
 *  the feature.
 */
pluginFactory.addFeatureDefinition = function(id, obj) {
  definitions[id] = obj;
}

// add default definitions
for (let id in defaultDefinitions) {
  pluginFactory.addFeatureDefinition(id, defaultDefinitions[id]);
}

export default pluginFactory;
