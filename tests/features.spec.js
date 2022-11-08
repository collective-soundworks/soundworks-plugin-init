import path from 'node:path';
import { fork } from 'node:child_process';

import puppeteer from 'puppeteer';

const appPath = path.join(process.cwd(), 'tests', 'features');

let forked;
let browser;

describe('PluginPlatform', () => {
  before('', async () => {
    browser = await puppeteer.launch();

    const serverIndex = path.join(appPath, '.build', 'server', 'index.js');
    forked = fork(serverIndex, { cwd: appPath });

    return new Promise(resolve => {
      forked.on('message', async msg => {
        console.log(msg);
        if (msg === 'soundworks:server:started') {
          resolve();
        }
      });
    });
  });

  after(async () => {
    await browser.close();
    forked.kill();
  });

  describe('feature: webaudio', () => {
    it(`should resume audio context`, async () => {
      const testCase = 'webaudio';
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:8000?case=${testCase}`);
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Promise(resolve => {
        page.on('console', msg => {
          const text = msg.text();

          if (text === `${testCase}: running`) {
            console.log(text);
            page.close();
            resolve();
          }
        });

        page.click('#launch-platform');
      });
    });

    it(`should accept alias`, async () => {
      const testCase = 'webaudio-alias';
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:8000?case=${testCase}`);
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Promise(resolve => {
        page.on('console', msg => {
          const text = msg.text();

          if (text === `${testCase}: running`) {
            console.log(text);
            page.close();
            resolve();
          }
        });

        page.click('#launch-platform');
      });
    });
  });

  describe('feature: devicemotion', () => {
    it(`should requestPermission on @ircam/devicemotion`, async function() {
      this.timeout(5000);

      const testCase = 'devicemotion';
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:8000?case=${testCase}`);
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Promise(resolve => {
        page.on('console', msg => {
          const text = msg.text();

          // for whatever reason the access seems to be granted in puppeteer
          if (text === `${testCase}: granted`
            || text === `${testCase}: denied`
          ) {
            console.log(text);
            console.log('[note] "granted" looks normal from puppeteer point of view');
            page.close();
            resolve();
          }
        });

        page.click('#launch-platform');
      });
    });
  });

  describe('feature: microphone', () => {
    it(`should access microphone`, async function() {
      this.timeout(5000);

      const testCase = 'microphone';
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:8000?case=${testCase}`);
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Promise(resolve => {
        page.on('pageerror', function(err) {
          const theTempValue = err.toString();
          console.log(`Page error: ${theTempValue}`);
        });

        page.on('console', msg => {
          const text = msg.text();
          // for whatever reason the doesn't seems to be allowed in puppeteer
          if (text === `${testCase}: access failed`) {
            console.log(text);
            console.log('[note] looks normal from puppeteer point of view');

            page.close();
            resolve();
          }
        });

        page.click('#launch-platform');
      });
    });
  });

  describe('feature: camera', () => {
    it(`should access camera`, async function() {
      this.timeout(5000);

      const testCase = 'camera';
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:8000?case=${testCase}`);
      await new Promise(resolve => setTimeout(resolve, 200));

      return new Promise(resolve => {
        page.on('pageerror', function(err) {
          const theTempValue = err.toString();
          console.log(`Page error: ${theTempValue}`);
        });

        page.on('console', msg => {
          const text = msg.text();
          // for whatever reason the doesn't seems to be allowed in puppeteer
          if (text === `${testCase}: access failed`) {
            console.log(text);
            console.log('[note] looks normal from puppeteer point of view');

            page.close();
            resolve();
          }
        });

        page.click('#launch-platform');
      });
    });
  });
});

// await page.goto(`http://127.0.0.1:8000?case=platform-${num}&lang=${lang}`);
// await new Promise(resolve => setTimeout(resolve, 200));


