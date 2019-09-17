# `@soundworks/service-platform`

> `soundworks` service dedicated at browser clients only, the service is 
> responsible at checking availability of the features required by the 
> application and at initializating features that require a user gesture (for 
> example resuming a given audio context.
> 
> For now, is dedicated at resuming the given `audioContext`

## Install

```sh
npm install --save @soundworks/service-platform
```

## Usage

### client

Lifecycle
> available --> authorize --> initialize --> finalize

#### registering the service

```js
// index.js
import { Client } from '@soundworks/core/client';
import servicePlatformFactory from '@soundworks/service-platform/client';

const client = new Client();
client.registerService('platform', servicePlatformFactory, {
  features: 
    ['web-audio', audioContext],
  ]
}, []);
```

#### requiring the service 

```js
// MyExperience.js
import { Experience } from '@soundworks/core/client';

class MyExperience extends Experience {
  constructor() {
    super();
    this.platform = this.require('platform');
  }
}
```

#### options

- `features` Array of the features to initialize

### server

#### registering the service

```js
// index.js
import { Server } from '@soundworks/core/server';
import servicePlatformFactory from '@soundworks/service-platform/server';

const server = new Server();
server.registerService('platform', servicePlatformFactory, {
  features: 
    ['web-audio', audioContext],
  ]
}, []);
```

#### requiring the service 

```js
// MyExperience.js
import { Experience } from '@soundworks/core/server';

class MyExperience extends Experience {
  constructor() {
    super();
    this.platform = this.require('platform');
  }
}
```

#### options

## Built-in features

- web-audio
<!-- - fullscreen 
<!-- - public-browsing -->

## License

BSD-3-Clause
