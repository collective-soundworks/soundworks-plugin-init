import MobileDetect from 'mobile-detect';
import getAudioFileExtension from './audio-file-extension';

/**
 * Populate `client.platform` with the prefered audio file extention
 * for the platform.
 * @private
 */
function getAudioFileExtention() {
  const a = document.createElement('audio');
  let ext = '.wav';
  // http://diveintohtml5.info/everything.html
  if (!!(a.canPlayType && a.canPlayType('audio/mpeg;'))) {
    ext = '.mp3';
  } else if (!!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"'))) {
    ext = '.ogg';
  }

  return ext;
}


/**
 * Populate `client.platform` with the os name.
 * @private
 */
export default function getPlatformInfos() {
  const ua = window.navigator.userAgent;
  const md = new MobileDetect(ua);

  // is mobile device
  const mobile = (md.mobile() !== null);

  //  which os
  const _os = md.os();
  let os;

  if (_os === 'AndroidOS') {
    os = 'android';
  } else if (_os === 'iOS') {
    os = 'ios';
  } else {
    os = 'other';
  }

  // prefered audio file extension
  const audioFileExtension = getAudioFileExtention();

  return { mobile, os, audioFileExtension };
}
