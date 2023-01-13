import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import { html, render, nothing } from 'lit/html.js';
import devicemotion from '@ircam/devicemotion';

import createLayout from './views/layout.js';

import platformInitPlugin from '../../../../../src/client/plugin-platform-init.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

/**
 * Grab the configuration object written by the server in the `index.html`
 */
const config = window.SOUNDWORKS_CONFIG;

// If multiple clients are emulated you want to share the same context
const audioContext = new AudioContext();

const searchParams = new URLSearchParams(window.location.search);
const testCase = searchParams.get('case') || 'webaudio';

console.log('> configure the view you want to test with:');
console.log('> http://127.0.0.1:8000?&case=webaudio');

async function main($container) {
  /**
   * Create the soundworks client
   */
  const client = new Client(config);

  /**
   * Register some soundworks plugins, you will need to install the plugins
   * before hand (run `npx soundworks` for help)
   */
  // -------------------------------------------------------------------
  // register features in plugin
  // -------------------------------------------------------------------
  switch(testCase) {
    case 'webaudio': {
      client.pluginManager.register('platform-init', platformInitPlugin, {
        webaudio: audioContext,
      });
      break;
    }
    case 'webaudio-alias': {
      client.pluginManager.register('platform-init', platformInitPlugin, { audioContext });
      break;
    }
    // @ircam/devicemotion
    case 'devicemotion': {
      client.pluginManager.register('platform-init', platformInitPlugin, { devicemotion });
      break;
    }

    case 'microphone': {
      client.pluginManager.register('platform-init', platformInitPlugin, {
        audioContext, // needed for the test
        microphone: true,
      });
      break;
    }
    case 'camera': {
      client.pluginManager.register('platform-init', platformInitPlugin, {
        camera: true,
      });
      break;
    }
  }


  client.pluginManager.onStateChange(plugins => {
    if (plugins['platform-init'].status === 'inited') {
      render(html`
        <h2>test case: ${testCase}</h2>
        <button
          id="launch-init"
          @click="${e => plugins['platform-init'].onUserGesture(e)}"
        >click to launch</button>
      `, $container);
    }
  });

  // client init will fail because devicemotion is not accessible on desktops
  let platformInit = null;

  try {
    await client.init();
    // if init failed this won't work any way
    platformInit = await client.pluginManager.get('platform-init');
  } catch(err) {
    console.log(err);
  }

  render(html`
    <h2>test case: ${testCase}</h2>
    <p>open console to see log results</p>
    <a href="/?case=webaudio">webaudio</a>
    <a href="/?case=webaudio-alias">webaudio-alias</a>
    <a href="/?case=devicemotion">devicemotion</a>
    <a href="/?case=microphone">microphone</a>
    <a href="/?case=camera">camera</a>
    ${testCase === 'camera' ? html`<br /><video autoplay="true"></video>` : nothing}
  `, $container);

  switch (testCase) {
    case 'webaudio': {
      console.log(`${testCase}:`, audioContext.state);

      const src = audioContext.createOscillator();
      src.connect(audioContext.destination);
      src.start(audioContext.currentTime);
      src.stop(audioContext.currentTime + 0.01);
      break;
    }
    case 'webaudio-alias': {
      console.log(`${testCase}:`, audioContext.state);

      const src = audioContext.createOscillator();
      src.connect(audioContext.destination);
      src.start(audioContext.currentTime);
      src.stop(audioContext.currentTime + 0.01);
      break;
    }
    // @ircam/devicemotion
    case 'devicemotion': {
      console.log(`${testCase}:`, devicemotion._available);
      break;
    }

    case 'microphone': {
      if (platformInit) {
        const stream = platformInit.get('microphone');
        console.log(`${testCase}:`, stream.active);

        console.log('-----------------------------------------');
        console.log('MAKE SOME NOISE!');
        console.log('-----------------------------------------');
        const src = audioContext.createMediaStreamSource(stream);
        src.connect(audioContext.destination);
      } else {
        // stream is not active
        console.log(`${testCase}: access failed`);
      }
      break;
    }
    case 'camera': {
      if (platformInit) {
        const stream = platformInit.get('camera');
        console.log(`${testCase}:`, stream.active);

        const $video = document.querySelector('video');
        $video.srcObject = stream;
      } else {
        // stream is not active
        console.log(`${testCase}: access failed`);
      }

      break;
    }
  }
}

// The launcher enables instanciation of multiple clients in the same page to
// facilitate development and testing.
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
