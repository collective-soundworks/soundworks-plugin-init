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

      const availablePromises = this._executeFeatures('available');
      const available = await this._resolveFeatures(availablePromises);
      // console.log('available', available);
      await this.state.set({ infos, available });

      if (!available.result) {
        return this.error('not compatible');
      }

      // ask for authorizations
      // @note - this could probably be removed, but needs to update template-helpers too
      const authorizedPromises = this._executeFeatures('authorize');
      const authorized = await this._resolveFeatures(authorizedPromises);
      // console.log('authorized', authorized);
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
      // directly into the user gesture, for some reason Safari does not understand that
      // cf. https://stackoverflow.com/questions/57510426/cannot-resume-audiocontext-in-safari
      this.state.set({ initializing: true });

      // we need a user gesture:
      // cf. https://developers.google.com/web/updates/2017/09/autoplay-policy-changes
      if (event.type !== 'click' && event.type !== 'mouseup' && event.type !== 'touchend') {
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
      // console.log('initialized', initialized);
      await this.state.set({ initialized });

      if (initialized.result === false) {
        return this.error('initialization failed') ;
      }

      // @warning - no `await` should happen before that point
      const finalizedPromises = await this._executeFeatures('finalize');
      const finalized = await this._resolveFeatures(finalizedPromises);
      // console.log('finalized', finalized);
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
    _executeFeatures(step) {
      const promises = {};

      for (const { id, args } of this._requiredFeatures) {
        if (definitions[id][step]) {
          const state = this.state.getValues();
          const featureResultPromise = definitions[id][step](state, ...args);

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
