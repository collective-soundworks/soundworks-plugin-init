import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { Server } from '@soundworks/core/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

import ServerPluginPlatformInit from '../../../src/ServerPluginPlatformInit.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

if (process.env.TEST !== undefined) {
  config.env.verbose = false;
} else {
  console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
  `);
}

const server = new Server(config);
configureHttpRouter(server);

// Register plugins and create shared state classes
server.pluginManager.register('platform-init', ServerPluginPlatformInit);

await server.start();
