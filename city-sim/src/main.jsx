//the city builder's page (index.html)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./ui/router";
import { connect } from "./ui/session";
import "./ui/app.css";

connect(router);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

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
