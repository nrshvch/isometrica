/**
 * The world as a local server on a thread of its own (core/serve), as the
 * game has it on a Web Worker: what test:core sends it the protocol over.
 */
import { parentPort } from "node:worker_threads";
import { loader } from "./coreloader.mjs";

var server = await loader(),
  serve = (await server.ssrLoadModule("/src/core/serve.js")).default,
  receive = serve(function (message, transfer) {
    parentPort.postMessage(message, transfer);
  }, false);

parentPort.on("message", function (m) {
  if (m.type === "quit") {
    receive({ type: "close" });
    server.close().then(function () {
      process.exit(0);
    });
    return;
  }
  receive(m);
});
parentPort.postMessage({ type: "ready" });
