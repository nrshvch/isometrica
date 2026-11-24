import serve from "../core/serve";

//The world's worker: the world as a local server (core/serve), its frames
//posted to the page (client/host OnWorker).

var receive = serve(function (message, transfer) {
  self.postMessage(message, transfer);
});

self.onmessage = function (e) {
  receive(e.data);
};
