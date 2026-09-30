import GeneratorCore from "./generatorcore";

//The generator worker: paints generated pictures off the main thread, so
//painting never holds up a frame. See client/generator for the other end.

var core = new GeneratorCore(function (message, transfer) {
  self.postMessage(message, transfer);
});

self.onmessage = function (e) {
  var message = e.data;

  if (message.type === "init") core.init(message);
  else if (message.type === "paint") core.paint(message);
};
