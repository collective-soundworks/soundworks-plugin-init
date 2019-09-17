import screenfull from 'screenfull';

const fullscreenDefinition = {
  id: 'fullscreen',
  check: function(platform, ...args) {
    // functionnality that cannot brake the application
    return Promise.resolve(true);
  },
  interactionHook(platform, ...args) {
    if (screenfull.enabled) {
      screenfull.request();
    }

    return Promise.resolve(true);
  }
}

export default fullscreenDefinition;
