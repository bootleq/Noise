'use strict';

let bound = false;
let port = browser.runtime.connect();

function onMessage(msg, sender, respond) {
  if (typeof msg.type !== 'string') {
    return;
  }

  switch (msg.type) {
  case 'bind':
    addListeners();
    break;

  case 'unbind':
    removeListeners();
    break;

  case 'reconnect':
    if (port) {
      return;
    }
    port = browser.runtime.connect();
    addListeners();
    break;
  }
}

function onEvent(e) {
  port.postMessage({
    type: 'content.on',
    event: {
      type: e.type
    }
  });
}

function addListeners() {
  if (!bound) {
    window.addEventListener('copy', onEvent);
    window.addEventListener('cut', onEvent);
  }
  bound = true;
}

function removeListeners() {
  window.removeEventListener('copy', onEvent);
  window.removeEventListener('cut', onEvent);
  bound = false;
}

addListeners();
port.onMessage.addListener(onMessage);
port.onDisconnect.addListener((p) => { // stop when background script unload
  port = null;
  removeListeners();
});
browser.runtime.onMessage.addListener(onMessage);

window.addEventListener('unload', () => port.disconnect());
