/**
 * The game's icons, by the names its buttons are given them - here, and by
 * isometrica's client for the toggles of what it lays (client/buildman, a
 * road's surface and ways) - each a small piece of pixel art, scaled up
 * without smoothing.
 */
import back from "./icons/back.png";
import bulldozer from "./icons/bulldozer.png";
import chevronDown from "./icons/chevron-down.png";
import chevronUp from "./icons/chevron-up.png";
import cobbleOneWayBack from "./icons/cobble-one-way-back.png";
import cobbleOneWay from "./icons/cobble-one-way.png";
import cobbleRoad from "./icons/cobble-road.png";
import cobbleTwoWay from "./icons/cobble-two-way.png";
import cross from "./icons/cross.png";
import dice from "./icons/dice.png";
import gravelOneWayBack from "./icons/gravel-one-way-back.png";
import gravelOneWay from "./icons/gravel-one-way.png";
import gravelRoad from "./icons/gravel-road.png";
import gravelTwoWay from "./icons/gravel-two-way.png";
import home from "./icons/home.png";
import oneWayRoadBack from "./icons/one-way-road-back.png";
import oneWayRoad from "./icons/one-way-road.png";
import road from "./icons/road.png";
import tick from "./icons/tick.png";
import tileDollar from "./icons/tile-dollar.png";
import twoWayRoad from "./icons/two-way-road.png";

export default {
  "back-icon": back,
  //turning round is going back round
  "rotation-icon": back,
  "bulldozer-icon": bulldozer,
  "chevron-up-icon": chevronUp,
  "chevron-down-icon": chevronDown,
  "cross-icon": cross,
  "dice-icon": dice,
  "house-icon": home,
  "tick-icon": tick,
  "tile-dollar-icon": tileDollar,
  //what a road is laid in, toggled while it is laid - and the one being laid
  //the way it is driven: both ways, one way, one way the other way round
  "road-icon": road,
  "two-way-road-icon": twoWayRoad,
  "one-way-road-icon": oneWayRoad,
  "one-way-road-back-icon": oneWayRoadBack,
  "gravel-road-icon": gravelRoad,
  "gravel-two-way-icon": gravelTwoWay,
  "gravel-one-way-icon": gravelOneWay,
  "gravel-one-way-back-icon": gravelOneWayBack,
  "cobble-road-icon": cobbleRoad,
  "cobble-two-way-icon": cobbleTwoWay,
  "cobble-one-way-icon": cobbleOneWay,
  "cobble-one-way-back-icon": cobbleOneWayBack,
};
