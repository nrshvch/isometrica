//the city builder's page (index.html)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./ui/router";
import { connect } from "./ui/session";
import { watchInstall } from "./ui/install";
import { watchUpdates } from "./ui/updates";
import "./ui/app.css";

//before anything else: the browser says it can put the game on the home
//screen when it likes
watchInstall();
connect(router);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

//the game opens without a connection from what the browser kept of it the
//first time it was opened with one - all of it (public/sw.js) - and plays
//the city saved here till it is back; and a new release is found, and taken
//up (ui/updates.js). Not in development: what was kept would be served
//instead of what changed
if (import.meta.env.PROD) watchUpdates();
