  // {
  //   id: 'audio-input',
  //   check: function(platform, ...args) {
  //     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  //       return Promise.resolve(true);
  //     } else {
  //       navigator.getUserMedia = (
  //         navigator.getUserMedia ||
  //         navigator.webkitGetUserMedia ||
  //         navigator.mozGetUserMedia ||
  //         navigator.msGetUserMedia
  //       );

  //       return Promise.resolve(!!navigator.getUserMedia);
  //     }
  //   },
  //   startHook: function(platform, ...args) {
  //     if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  //       return navigator.mediaDevices.getUserMedia({ audio: true })
  //         .then(stream => {
  //           stream.getAudioTracks()[0].stop();
  //           return Promise.resolve(true);
  //       })
  //       .catch(err => {
  //         console.log(err);
  //         return Promise.resolve(false);
  //       });
  //     } else {
  //       return new Promise(function(resolve, reject) {
  //         navigator.mediaDevices.getUserMedia({ audio: true }, (stream) => {
  //           stream.getAudioTracks()[0].stop();
  //           resolve(true);
  //         }, (err) => {
  //           resolve(false);
  //           throw err;
  //         });
  //       });
  //     }
  //   }
  // },


  // {
  //   id: 'geolocation',
  //   check: function(platform, ...args) {
  //     return Promise.resolve(!!navigator.geolocation.getCurrentPosition);
  //   },
  //   startHook: function(platform, ...args) {
  //     return new Promise(function(resolve, reject) {
  //       navigator.geolocation.getCurrentPosition((position) => {
  //         resolve(true);
  //       }, (err) => {
  //         resolve(false);
  //       }, {});
  //     });
  //   }
  // },
  // {
  //   id: 'geolocation-mock',
  //   check: function(platform, ...args) {
  //     return Promise.resolve(true);
  //   },
  //   startHook: function(platform, ...args) {
  //     const lat = Math.random() * 360 - 180;
  //     const lng = Math.random() * 180 - 90;
  //     platform.coordinates = [lat, lng];

  //     return Promise.resolve(true);
  //   }
  // },
