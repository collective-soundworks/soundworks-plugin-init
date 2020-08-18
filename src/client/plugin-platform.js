import NoSleep from 'nosleep.js';
import MobileDetect from 'mobile-detect';
// default built-in definition
import * as defaultDefinitions from './features-definitions';

const definitions = {};

const pluginFactory = function(AbstractPlugin) {
  return class PluginPlatform extends AbstractPlugin {
    constructor(client, name, options) {
      super(client, name);

      const defaults = {
        features: [],
      };

      this._requiredFeatures = new Set();

      this.onUserGesture = this.onUserGesture.bind(this);
      this.options = this.configure(defaults, options);
    }

    /** @private */
    configure(defaults, options) {
      if (options.features) {
        let features = options.features;

        if (typeof features === 'string') {
          features = [features];
        }

        // change that, this is an ugly API...
        features.forEach((feature, index) => {
          if (feature === undefined || feature === null) {
            return;
          }

          if (typeof feature === 'string') {
            feature = [feature]
            features[index] = feature;
          }

          const [id, ...args] = feature;
          this._requiredFeatures.add({ id, args });

          // automatically add feature to check audioContext on iOS
          if (feature[0] === 'web-audio') {
            const audioContext = feature[1];

            this._requiredFeatures.add({
              id: 'clean-ios-audio-context',
              args: [audioContext],
            });
          }
        });
      }

      return super.configure(defaults, options);
    }

    /**
     *  Algorithm:
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
      // check that all required features are defined
      this._requiredFeatures.forEach(({ id, args }) => {
        if (!definitions[id]) {
          throw new Error(`[${this.name}] Undefined required feature: "${id}"`)
        }
      });

      this.state = await this.client.stateManager.create(`s:${this.name}`);

      this.started();

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

      const available = await this._resolveFeatures('available');
      await this.state.set({ infos, available });

      if (!available.result) {
        return this.error('not compatible');
      }

      // ask for authorizations
      const authorized = await this._resolveFeatures('authorize');
      await this.state.set({ authorized });

      if (!authorized.result) {
        return this.error('missing authorizations');
      }

      // @note - we now wait for user gesture to finish initialization
    }

    /**
     * Method to be executed by the application on the first user gesture.
     *
     * @example
     * myView.addEventListener((e) => {
     *   platformPlugin.onUserGesture(e);
     * });
     */
    async onUserGesture(event) {
      // cf. https://stackoverflow.com/questions/46746288/mousedown-and-mouseup-triggered-on-touch-devices
      // event.preventDefault();

      // we need some feedback to show that the user gesture has been taken into account
      //
      // @note - we cannot `await` here, because `audioContext.resume` must be called
      // directly into the user gesture, for some reason Safari do not understand that
      // cf. https://stackoverflow.com/questions/57510426/cannot-resume-audiocontext-in-safari
      this.state.set({ initializing: true });

      /** -------------------------------------------------------------
       * - No sleep
       *
       * @note - we dont care to have that on desktop (we don't actually want
       * that, because of weird CPU usage on chrome), but it is hard to separate
       * an emulated mobile from real mobile, the only solution seems to be
       * through usage of `navigator.platform` but the list long
       * cf. https://stackoverflow.com/questions/19877924/what-is-the-list-of-possible-values-for-navigator-platform-as-of-today
       * ...so we only remove mac OSX for now... we will adapt later according
       * to real world usage..
       */
      const noSleepExcludePlatform = ['MacIntel'];
      const noSleepExcluded = noSleepExcludePlatform.indexOf(navigator.platform) !== -1

      if (mode === 'touch' && !noSleepExcluded) {
        const noSleep = new NoSleep();
        noSleep.enable();
      }
      /** ------------------------------------------------------------- */

      let mode;

      if (event.type !== 'mouseup' && event.type !== 'touchend') {
        throw new Error(`[[${this.name}] onUserGesture MUST be called on ""mouseup" or "touchend" events
cf. https://developers.google.com/web/updates/2017/09/autoplay-policy-changes`);
      }

      if (event.type === 'mouseup') {
        mode = 'mouse';
      } else if (event.type === 'touchend') {
        mode = 'touch';
      }

      const infos = this.state.get('infos');
      infos.interactionMode = mode;

      // execute interaction hooks from the platform
      // @warning - no `await` should happen before that point
      const initialized = await this._resolveFeatures('initialize');
      await this.state.set({ infos, initialized });

      if (initialized.result === false) {
        return this.error('initialization failed') ;
      }

      const finalized = await this._resolveFeatures('finalize');
      await this.state.set({ finalized });

      if (finalized.result === false) {
        return this.error('finalization failed') ;
      }

      // nothing failed, we are ready
      this.ready();
    }

    /**
     * steps: [available, authorize, initialize, finalize]
     */
    async _resolveFeatures(step) {
      const details = {};
      let result = true;

      for (const { id, args } of this._requiredFeatures) {
        if (definitions[id][step]) {
          const state = this.state.getValues();
          const featureResult = await definitions[id][step](state, ...args);

          details[id] = featureResult;
          result = result && featureResult;
        } else {
          details[id] = true; // result cannot change in this case
        }
      };

      return { details, result };
    }
  }
}

/**
 * Structure of the definition for the test of a feature.
 *
 * @param {String} id
 * @param -  {Function : Promise.resolve(true|false)} [available=undefined]
 * @param -  {Function : Promise.resolve(true|false)} [authorize=undefined]
 * @param -  {Function : Promise.resolve(true|false)} [initialize=undefined]
 * @param -  {Function : Promise.resolve(true|false)} [finalize=undefined]
 *
 * @param {module:soundworks/client.Platform~definition} obj - Definition of
 *  the feature.
 */
pluginFactory.addFeatureDefinition = function(obj) {
  definitions[obj.id] = obj;

  if (obj.alias) {
    definitions[obj.alias] = obj;
  }
}

// add default definitions
for (let name in defaultDefinitions) {
  pluginFactory.addFeatureDefinition(defaultDefinitions[name]);
}

export default pluginFactory;
