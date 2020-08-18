
const schema = {
  available: {
    type: 'any',
    default: null,
    nullable: true,
  },
  authorized: {
    type: 'any',
    default: null,
    nullable: true,
  },
  initializing: {
    type: 'any',
    default: null,
    nullable: true,
  },
  initialized: {
    type: 'any',
    default: null,
    nullable: true,
  },
  finalized: {
    type: 'any',
    default: null,
    nullable: true,
  },
  infos: {
    type: 'any',
    default: null,
    nullable: true,
  },
};

const pluginFactory = function(AbstractPlugin) {
  return class PluginPlatform extends AbstractPlugin {
    constructor(server, name, options) {
      super(server, name);

      this.states = new Map();
      this.server.stateManager.registerSchema(`s:${this.name}`, schema);
    }

    start() {
      this.server.stateManager.observe(async (schemaName, stateId, clientId) => {
        if (schemaName === `s:${this.name}`) {
          const state =  await this.server.stateManager.attach(schemaName, stateId);

          this.states.set(clientId, state);
          state.onDetach(() => this.states.delete(clientId));
          // this could be a good place to log things about clients
        }
      });

      this.started();
      this.ready();
    }
  }
}

export default pluginFactory;
