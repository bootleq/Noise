/*jslint bitwise: false, evil: true*/
/*global NoiseOverlay: true, Components: false, dump: false, gBrowser: false, toggleSidebar: true, gFindBar: true*/
if (!NoiseOverlay) {
  var NoiseOverlay = {};
}
Components.utils.import("resource://noise/noise.jsm");

NoiseOverlay = {
  init: function () {
    Noise.patchWindow(window);
    Noise.addEventHandlers(window);
    Noise.spawnAudio(window);
  },

  uninit: function () {
    Noise.undoPatchWindow(window);
    Noise.removeEventHandlers(window);
    Noise.respawnAudio(window);
  },

  reset: function (newMappings) {
    Noise.removeEventHandlers(window);
    Noise.addEventHandlers(window, newMappings);
  },

  createAudio: function () {
    return new Audio();
  }
};

window.addEventListener("load", function () {
  NoiseOverlay.init();
}, false);

window.addEventListener("unload", function () {
  NoiseOverlay.uninit();
}, false);
