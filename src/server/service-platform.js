
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

const serviceFactory = function(Service) {
  return class Platform extends Service {
    constructor(server, name, options) {
      super(server, name);

      this.states = new Map();

      this.server.stateManager.registerSchema(`s:${this.name}`, schema);
    }

    start() {
      this.server.stateManager.observe(async (schemaName, clientId) => {
        if (schemaName === `s:${this.name}`) {
          const state =  await this.server.stateManager.attach(schemaName, clientId);

          this.states.set(clientId, state);

          state.onDetach(() => {
            this.states.delete(clientId);
          });

          // nothing special here...
          // this could be a good place to log some things about clients
        }
      });

      this.started();
      this.ready();
    }
  }
}

serviceFactory.defaultName = 'service-platform';

export default serviceFactory;
