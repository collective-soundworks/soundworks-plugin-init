// keys:
// - alias, optionnnal aliased id
// - `check`: executed on start, before userGesture
// - `activate`: executed on userGesture
export default {
  'web-audio': {
    alias: 'webaudio',
    check: function(state, audioContext) {
      if (!audioContext) {
        throw new Error('feature `web-audio` requires an audio context as argument');
      }

      return Promise.resolve(!!audioContext);
    },

    activate: async function(state, audioContext) {
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

      // in iphones, sampleRate has been observed to be set at 16000Hz
      // sometimes causing clicks and noisy audio, as no exhaustive testing
      // has been made... just assume < 40000 is a bad value.
      if (state.infos.os === 'ios') {
        if (audioContext.sampleRate < 40000) {
          window.location.reload(true);
        }
      }

      return Promise.resolve(true);
    },
  },
};
