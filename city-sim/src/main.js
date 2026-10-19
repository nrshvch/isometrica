//the city builder's page (index.html)
import UI from "./ui/js/main";
import Builder from "./game";

new UI(Builder).init();

//the game opens without a connection from what the browser kept of it while
//it had one (public/sw.js), and plays the city saved here till it is back.
//Not in development: what was kept would be served instead of what changed
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js?v=" + encodeURIComponent(__VERSION__))
    .catch(function (e) {
      console.warn("The game will not open offline", e);
    });
}
