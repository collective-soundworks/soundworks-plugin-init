import '@babel/polyfill';
import { Client } from '@soundworks/core/client';
import platformServiceFactory from '@soundworks/service-platform/client';
import PlayerExperience from './PlayerExperience';

const willFailFeatures = [
  {
    id: 'fail-available',
    available: (platformState, ...args) => {
      return Promise.resolve(false);
    },
  },
  {
    id: 'fail-authorize',
    authorize: (platformState, ...args) => {
      return Promise.resolve(false);
    },
  },
  {
    id: 'fail-initialize',
    initialize: (platformState, ...args) => {
      return Promise.resolve(false);
    },
  },
  {
    id: 'fail-finalize',
    finalize: (platformState, ...args) => {
      return Promise.resolve(false);
    },
  },
];

async function init($container, i) {
  try {
    const client = new Client();
    const audioContext = new AudioContext();

    client.registerService('platform', platformServiceFactory, {
      features: [
        ['web-audio', audioContext], // will resume audio context first gesture
        (willFailFeatures[i] && willFailFeatures[i].id), // require failing feature
      ],
    }, []);

    // add feature definition dedicated at failing...
    if (willFailFeatures[i]) {
      const platform = client.serviceManager.get('platform');
      platform.addFeatureDefinition(willFailFeatures[i]);
    }

    const config = window.soundworksConfig;
    await client.init(config);

    const playerExperience = new PlayerExperience(client, config, $container);

    document.body.classList.remove('loading');

    await client.start()
    playerExperience.start();

    client.socket.addListener('close', () => {
      setTimeout(() => window.location.reload(true), 2000);
    });
  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', () => {
  let $container = document.querySelector('#container');

  for (let i = 0; i < 5; i++) {
    const $div = document.createElement('div');
    $div.style.float = 'left';
    $div.style.width = '300px';
    $div.style.height = '500px';
    $div.style.outline = '1px solid #aaaaaa';
    $container.appendChild($div);

    init($div, i);
  }

  // init($container, 0);
});

// QoS
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    window.location.reload(true);
  }
}, false);
