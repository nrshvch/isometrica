/**
 * Where the game is, in the address: the city played - /<id>, the address a
 * city is opened anywhere by - and the screen over it: the world itself,
 * /<id>/catalogue (a building of it, /<id>/catalogue/<code>), the city
 * screen, /<id>/city (a tab of it, /<id>/city/map).
 */
import { createBrowserRouter } from "react-router";
import GameScreen from "./world/GameScreen";
import WorldHud from "./world/WorldHud";
import Catalogue from "./catalogue/Catalogue";
import Building from "./catalogue/Building";
import CityScreen from "./city/CityScreen";

//the addresses of before, /#/<id>, handed out for cities that are still
//played - taken as the address they now are
if (location.hash.indexOf("#/") === 0)
  history.replaceState(null, "", location.hash.slice(1) || "/");

export var router = createBrowserRouter([
  {
    path: "/:city?",
    element: <GameScreen />,
    children: [
      { index: true, element: <WorldHud /> },
      { path: "catalogue", element: <Catalogue /> },
      { path: "catalogue/:code", element: <Building /> },
      { path: "city/:tab?", element: <CityScreen /> },
    ],
  },
]);
