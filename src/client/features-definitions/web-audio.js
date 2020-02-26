
/**
 * Resume the given audio context and start an ongoing oscillator at -180dB.
 * (this hack prevented some old Android to stop audio abruptely at some moment)
 *
 * (This should be rested from time to time, this is maybe no longer needed)
 */
const webAudioDefinition = {
  id: 'web-audio',
  available: function(state, audioContext) {
    if (!audioContext) {
      throw new Error('feature `web-audio` requires an audio context as argument');
    }

    return Promise.resolve(!!audioContext);
  },

  initialize: async function(state, audioContext) {
    // @todo - put also in wawves-audio
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

    // prevent android to stop audio by keeping the oscillator active
    if (state.infos.os !== 'android') {
      o.stop(audioContext.currentTime + 0.01);
    }

    return Promise.resolve(true);
  }
};

export default webAudioDefinition;
