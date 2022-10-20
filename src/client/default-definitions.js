// keys:
// - `available`: executed on start, before userGesture
// - `initialize`: executed on userGesture
// - `finalize`: executed on userGesture, after initialize
export default {
  'web-audio': {
    available: function(state, audioContext) {
      if (!audioContext) {
        throw new Error('feature `web-audio` requires an audio context as argument');
      }

      return Promise.resolve(!!audioContext);
    },

    initialize: async function(state, audioContext) {
      // @note - maybe not needed anymore, as even Safari implements that
      if (!('resume' in audioContext)) {
        audioContext.resume = () => {
          return Promise.resolve();
        }
      }

      const result = await audioContext.resume();

      if (!state.infos.mobile) {
        return Promise.resolve(true);
      }

      const g = audioContext.createGain();
      g.connect(audioContext.destination);
      g.gain.value = 0.000000001; // -180dB

      const o = audioContext.createOscillator();
      o.connect(g);
      o.frequency.value = 20;
      o.start(0);

      // prevent android from stopping audio by keeping the oscillator active
      if (state.infos.os !== 'android') {
        o.stop(audioContext.currentTime + 0.01);
      }

      return Promise.resolve(true);
    },
  },

  /**
   * This definition is automatically required when the `web-audio` definition
   * is required on iOS.
   * Bascally reloads the page when the `audioContext.sampleRate` has a weird
   * value, i.e. < 40000
   */
  'check-ios-audio-context-sample-rate': {
    finalize: function(state, audioContext) {
      if (state.infos.os === 'ios') {
        // in iphones, sampleRate has been observed to be set at 16000Hz
        // sometimes causing clicks and noisy audio, as no exhaustive testing
        // has been made... just assume < 40000 is a bad value.
        if (audioContext.sampleRate < 40000) {
          window.location.reload(true);
          Promise.resolve(false);
        }
      }

      return Promise.resolve(true);
    },
  },
};
