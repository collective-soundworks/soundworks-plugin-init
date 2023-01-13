# `@soundworks/plugin-platform-init`

[`soundworks`](https://soundworks.dev) plugin to simplify initialization of certain client features such as resuming audio context, etc. 

## Table of Contents

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
  * [Server registration](#server-registration)
  * [Client registration](#client-registration)
- [Available features](#available-features)
- [License](#license)

<!-- tocstop -->

## Installation

```sh
npm install @soundworks/plugin-platform-init --save
```

## Usage

### Server registration

```js
// src/server/index.js
import { Server } from '@soundworks/core/server.js';
import platformInitPlugin from '@soundworks/plugin-platform-init/server.js';

const server = new Server(config);
server.pluginManager.register('platform-init', platformInitPlugin);
```

### Client registration

```js
// src/clients/**/index.js
import { Client } from '@soundworks/core/client.js';
import platformInitPlugin from '@soundworks/plugin-platform-init/client.js';

const audioContext = new AudioContext();

const client = new Client(config);
client.pluginManager.register('platform-init', platformInitPlugin, { audioContext });

await client.start();

console.log(audioContext.state === 'running');
```

## Available features

By default, the `@soundworks/plugin-platform-init` provide a way to resume audio context (as show above) but also to access microphone and camera streams, as well as access to the motion sensors throught the [`@ircam/devicemotion`](https://www.npmjs.com/package/@ircam/devicemotion) package.

```sh
npm install --save @ircam/devicemotion
```

```js
// src/clients/**/index.js
import { Client } from '@soundworks/core/client.js';
import platformInitPlugin from '@soundworks/plugin-platform-init/client.js';
import devicemotion from '@ircam/devicemotion';

const client = new Client(config);

client.pluginManager.register('platform-init', platformInitPlugin, { 
  microphone: true,
  camera: true,
  devicemotion,
});

await client.start();

const platformInit = await client.pluginManager.get('platform-init');

const micStream = platformInit.get('microphone');
const cameraStream = platformInit.get('camera');
devicemotion.addEventListener(e => console.log(e));
```

_Note these three additional features require a https connection._

## License

[BSD-3-Clause](./LICENSE)
