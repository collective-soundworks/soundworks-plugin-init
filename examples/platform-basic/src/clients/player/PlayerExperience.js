import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import debug from 'debug';

const log = debug('service-platform');


class PlayerExperience extends Experience {
  constructor(client, options = {}, $container, index) {
    super(client);

    this.options = options;
    this.$container = $container;

    this.platform = this.require('platform');

    this.client.serviceManager.observe(() => {
      const status = this.client.serviceManager.getValues();

      if (status['platform'] === 'started') {
        this.renderPlatformService();
      } else if (status['platform'] === 'errored') {
        this.renderErroredPlatformService();
      } else if (status['platform'] === 'ready') {
        this.renderApp();
      }
    });

    this.renderApp('Initializing...');
  }

  start() {
    super.start();

    this.renderApp(`Hello ${this.client.id}`, this.platform.state.get('infos'));
  }

  renderPlatformService() {
    const serviceState = this.platform.state.getValues();

    const $header = html`
      <section class="half-screen aligner">
        <div class="align-center">
          <h1 class="title">${this.options.app.name}</h1>
          <p class="author">by Platform Service</p>
        </div>
      </section>
    `

    let $html;

    if (serviceState.available === null) {
      log('checking available');

      $html = html`
        <div class="services screen">
          ${$header}
          <section class="half-screen aligner">
            <p class="normal align-center">Checkin...</p>
          </section>
        </div>`;

    } else if (serviceState.authorized === null) {
      log('authorizing');

      $html = html`
        <div class="services screen">
          ${$header}
          <section class="half-screen aligner">
            <p class="normal align-center">Authorizing...</p>
          </section>
        </div>`;

    } else if (serviceState.initialized === null) {
      log('initializing');

      $html = html`
        <div class="services screen"
        @mouseup="${this.platform.onUserGesture}"
        @touchend="${this.platform.onUserGesture}"
      >
          ${$header}
          <section class="half-screen aligner">
            <p class="normal align-center soft-blink">Please click to join</p>
          </section>
        </div>`;

    } else if (serviceState.finalized === null) {
      log('finalizing');

      $html = html`
        <div class="services screen">
          ${$header}
          <section class="half-screen aligner">
            <p class="normal align-center soft-blink">Finalizing</p>
          </section>
        </div>`;

    }

    render($html, this.$container);
  }


  renderErroredPlatformService() {
    log('error');
    const serviceState = this.platform.state.getValues();

    const $header = html`
      <section class="half-screen aligner">
        <div class="align-center">
          <h1 class="title">${this.options.app.name}</h1>
          <p class="author">by Platform Service</p>
        </div>
      </section>
    `

    const stepErrors = {
      available: 'checking device compatibility',
      authorized: 'asking authorizations',
      initialized: 'initializing application',
      finalized: 'finalizing initialization',
    }

    let errorMsg;
    let erroredFeatures = [];

    // set error message and find more informations in [step].details
    for (let step of Object.keys(stepErrors)) {
      if (serviceState[step].result === false) { // this is the guilty one
        errorMsg = stepErrors[step];

        for (let feature in serviceState[step].details) {
          if (serviceState[step].details[feature] === false) {
            erroredFeatures.push(feature);
          }
        }

        break;
      }
    }

    const $html = html`
      <div class="services screen">
        ${$header}
        <section class="half-screen aligner">
          <div class="initialization">
            <!-- <p class="normal">initializing: -->
            <ul>
              <li class="italic normal error">Sorry,</li>
              <li class="italic normal error">An error occured while...</li>
              <li class="normal error-item">${errorMsg}</li>
              <li class="normal error-item">(${erroredFeatures.join(', ')})</li>
            </ul>
          </div>
        </section>
      </div>`;

    render($html, this.$container);
  }

  renderApp(msg, infos) {
    render(html`
      <section class="screen">
        <section class="half-screen aligner">
          <div class="align-center">
            <h1 class="title">${msg}</h1>
          </div>
        </section>
        <section class="half-screen">
          <pre><code>${JSON.stringify(infos, null, 2)}</code></pre>
        </section>
      </section>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
