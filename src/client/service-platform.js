import NoSleep from 'nosleep.js';
// default built-in definition
import * as defaultDefinitions from './features-definitions';
// utils
import getPlatformInfos from './utils/platform-infos';


const serviceFactory = function(Service) {
  /**
   * Interface for the client `'platform'` service.
   * @todo - review outdated
   *
   * The `platform` services is responsible for giving general informations
   * about the user's device as well as checking availability and providing hooks
   * in order to initialize the features required by the application (audio,
   * microphone, etc.).
   * If one of the required definitions is not available, a view is created with
   * an error message and `client.compatible` is set to `false`.
   *
   * Available built-in definitions are:
   * - 'web-audio': resume the given audioContext, also perform some additionnal
   *  check on iOS devices (sampleRate and clock drift)
   * - 'mobile-device': only-accept mobile devices in the application (based on
   *   User-Agent sniffing)
   * - 'full-screen': Android Only, this feature won't block the application if
   *   not available.
   *
   *
   * _<span class="warning">__WARNING__</span> This class should never be
   * instanciated manually_
   *
   * @param {Object} options
   * @param {Array<String>|String} options.features - Id(s) of the feature(s)
   *  required by the application. Available build-in features are:
   *  - 'web-audio'
   *  - 'mobile-device': only accept mobile devices (recognition based User-Agent)
   *  - 'audio-input': Android only
   *  - 'full-screen': Android only
   *  - 'geolocation': accept geolocalized devices. Populate the client with
   *     current position
   *  - 'wake-lock': this feature should be used with caution as
   *     it has been observed to use 150% of cpu in chrome desktop.
   * @param {Boolean} [options.showDialog=true] - If set to `false`, the service
   *  execute all hooks without waiting for a user interaction and doesn't show
   *  the service's view. This option should only be used on controlled
   *  environnements where the target platform is known for working without
   *  this need (e.g. is not iOS).
   *
   * @memberof module:soundworks/client
   * @example
   * // inside the experience constructor
   * this.platform = this.require('platform', { features: 'web-audio' });
   *
   * @see {@link module:soundworks/client.client#platform}
   */
  return class Platform extends Service {
    constructor(client, name, options) {
      super(client, name);

      const defaults = {
        features: [],
      };

      this._requiredFeatures = new Set();
      this._featureDefinitions = {};

      for (let name in defaultDefinitions) {
        this.addFeatureDefinition(defaultDefinitions[name]);
      }

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
     * Structure of the definition for the test of a feature.
     *
     * @param {module:soundworks/client.Platform~definition} obj - Definition of
     *  the feature.
     */
    addFeatureDefinition(obj) {
      this._featureDefinitions[obj.id] = obj;

      if (obj.alias) {
        this._featureDefinitions[obj.alias] = obj;
      }
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
      super.start();
      // check that all required features are defined
      this._requiredFeatures.forEach(({ id, args }) => {
        if (!this._featureDefinitions[id]) {
          throw new Error(`[${this.name}] Undefined required feature: "${id}"`)
        }
      });

      this.state = await this.client.stateManager.create(`s:${this.name}`);

      this.started();

      // check if all required features are available on the platform
      const infos = getPlatformInfos();
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
     *   platformService.onUserGesture(e);
     * });
     */
    async onUserGesture(event) {
      // cf. https://stackoverflow.com/questions/46746288/mousedown-and-mouseup-triggered-on-touch-devices
      event.preventDefault();


      /** -------------------------------------------------------------
       * - No sleep
       *
       * @note - we dont care to have that on desktop (we don't actually want
       * that, because of weird CPU usage on chrome),but it is hard to separate
       * an emulated mobile from real mobile, the only solution seems to be
       * through usage of `navigator.platform` but the list long
       * cf. https://stackoverflow.com/questions/19877924/what-is-the-list-of-possible-values-for-navigator-platform-as-of-today
       * ...so we only remove mac OSX for now... we will adapt later according
       * to real world usage..
       */
      const noSleepExcludePlatform = ['MacIntel'];
      const noSleepExcluded = noSleepExcludePlatform.indexOf(navigator.platform) !== -1

      if (mode === 'touch' &&  !noSleepExcluded) {
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
        if (this._featureDefinitions[id][step]) {
          const state = this.state.getValues();
          const featureResult = await this._featureDefinitions[id][step](state, ...args);

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

serviceFactory.defaultName = 'service-platform';

export default serviceFactory;
