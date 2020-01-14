
/**
 * This definition is automatically required when the `web-audio` definition
 * is required on iOS.
 * Bascally reloads the page when the `audioContext.sampleRate` has a weird
 * value, i.e. < 40000
 */
const cleanIosAudioContextDefinition = {
  id: 'clean-ios-audio-context',
  available: function(platform, ...args) {
    return Promise.resolve(true);
  },

  // we are sure the audio contexte is resumed...
  finalize: function(state, audioContext) {
    if (state.infos.os === 'ios') {
      // in iphones, sampleRate has been observed to be set at 16000Hz
      // sometimes, causing clicks and noisy audio, as no exhaustive testing
      // has been made assume < 40000 is a bad value.
      if (audioContext.sampleRate < 40000) {
        window.location.reload(true); // @note - this should be done application wise...
        Promise.resolve(false)
      }
    }

    return Promise.resolve(true);
  },
};

export default cleanIosAudioContextDefinition;
