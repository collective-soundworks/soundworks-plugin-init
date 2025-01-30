import { assert } from 'chai';
import { Server } from '@soundworks/core/server.js';
import { Client } from '@soundworks/core/client.js';
import ServerPluginPlatformInit from '../src/ServerPluginPlatformInit.js';
import ClientPluginPlatformInit from '../src/ClientPluginPlatformInit.node.js';

const config = {
  app: {
    name: 'plugin-manager-test',
    clients: {
      test: { runtime: 'node' },
    },
  },
  env: {
    port: 8081,
    serverAddress: '127.0.0.1',
    useHttps: false,
    verbose: false,
  },
};

describe('# node-runtime', () => {
  it('should be able to register plugin (no-op)', async () => {
    const server = new Server(config);
    server.pluginManager.register('platform-init', ServerPluginPlatformInit);
    await server.start();

    const client = new Client({ role: 'test', ...config });
    client.pluginManager.register('platform-init', ClientPluginPlatformInit);
    await client.start();

    const plugin = await client.pluginManager.get('platform-init');
    assert.isTrue(plugin instanceof ClientPluginPlatformInit);

    await client.stop();
    await server.stop();
  });
});

