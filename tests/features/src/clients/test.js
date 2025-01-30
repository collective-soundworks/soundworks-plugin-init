import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render, nothing } from 'lit';
import devicemotion from '@ircam/devicemotion';

import ClientPluginPlatformInit from '../../../../src/ClientPluginPlatformInit.browser.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const audioContext = new AudioContext();

  const searchParams = new URLSearchParams(window.location.search);
  const testCase = searchParams.get('case') || 'webaudio';

  console.log('> configure the view you want to test with:');
  console.log('> http://127.0.0.1:8000?&case=webaudio');

  const config = loadConfig();
  const client = new Client(config);

  let onCheckCalled = false;
  let onActivateCalled = false;

  // -------------------------------------------------------------------
  // register features in plugin
  // -------------------------------------------------------------------
  switch(testCase) {
    case 'webaudio': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, {
        webaudio: audioContext,
      });
      break;
    }
    case 'webaudio-alias': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, { audioContext });
      break;
    }
    // @ircam/devicemotion
    case 'devicemotion': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, { devicemotion });
      break;
    }

    case 'microphone': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, {
        audioContext, // needed for the test
        microphone: true,
      });
      break;
    }
    case 'camera': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, {
        camera: true,
      });
      break;
    }
    case 'userDefinedPlaceholders': {
      client.pluginManager.register('platform-init', ClientPluginPlatformInit, {
        onCheck: (plugin) => {
          onCheckCalled = true;
          return Promise.resolve();
        },
        onActivate: (plugin) => {
          onActivateCalled = true;
          return Promise.resolve();
        }
      });
      break;
    }
  }


  client.pluginManager.onStateChange(plugins => {
    if (plugins['platform-init'].status === 'inited') {
      render(html`
        <div class="simple-layout">
          <h2>test case: ${testCase}</h2>
          <button
            id="launch-init"
            @click="${e => plugins['platform-init'].onUserGesture(e)}"
          >click to launch</button>
        </div>
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

  console.log('> init done')

  render(html`
    <div class="simple-layout">
      <h2>test case: ${testCase}</h2>
      <p>open console to see log results</p>
      <p><a href="/?case=webaudio">webaudio</a></p>
      <p><a href="/?case=webaudio-alias">webaudio-alias</a></p>
      <p><a href="/?case=devicemotion">devicemotion</a></p>
      <p><a href="/?case=microphone">microphone</a></p>
      <p><a href="/?case=camera">camera</a></p>
      <p><a href="/?case=userDefinedPlaceholders">user defined "onCheck" and "onActivate" placeholders</a></p>
      ${testCase === 'camera' ? html`<br /><video autoplay="true"></video>` : nothing}
    </div>
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
    case 'userDefinedPlaceholders': {
      console.log(`${testCase}: onCheck called - ${onCheckCalled}`);
      console.log(`${testCase}: onActivate called - ${onActivateCalled}`);
      break;
    }
  }
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
