/**
 * The terrain mode: tiles picked straight away, and whichever of clearing
 * them, raising them or lowering them is toggled on along the bottom done to
 * them - what it would cost over the tiles all the while, and confirmed with
 * the tick - as many times over as the player likes, until they leave with
 * cancel.
 */
import Core from "isometrica/core/main";
import Events from "events";
import AreaSelector from "isometrica/client/areaselector";
import ServiceMan from "isometrica/client/serviceman";
import Clearworks from "isometrica/client/clearworks";
import Buildman from "isometrica/client/buildman";
import ErrorCode from "isometrica/core/errorcode";
import Numeral from "numeral";

var Terrain = Core.Terrain;

/**
 * What the player is told when shaping the ground is turned down, keyed by
 * ErrorCode.
 */
var errorText = {};
errorText[ErrorCode.NOT_ENOUGH_RES] = "no money";
errorText[ErrorCode.TILE_TAKEN] = "building in the way";
errorText[ErrorCode.TERRAFORM_TOO_LARGE] = "too much land";
errorText[ErrorCode.NOTHING_TO_CLEAR] = "nothing to clear";
errorText[ErrorCode.BEING_CLEARED] = "being cleared";

//how far around the picked tiles the ground is outlined, so the shape of it is
//there to see even under water
var HALO_RADIUS = 3;

var SELECTED_BORDER = "rgba(255,255,255,1)";
//the rings around the picked tiles, fading outwards
var HALO_BORDERS = [
  "rgba(255,255,255,0.45)",
  "rgba(255,255,255,0.25)",
  "rgba(255,255,255,0.1)",
];
var HALO_DASH = [4, 4];

/**
 * The tiles of the buildings standing in the way of the ground moving, in
 * the red a building that cannot go up is marked with (see Buildman).
 */
function blockedHiliteData(tiles) {
  return tiles.map(function (tile) {
    return {
      x: Terrain.extractX(tile),
      y: Terrain.extractY(tile),
      fillColor: Buildman.HILITE_BLOCKED_FILL,
      borderColor: Buildman.HILITE_BLOCKED_BORDER,
      borderWidth: 2,
    };
  });
}

/**
 * One hilite per tile: the picked ones outlined in white and the rings around
 * them dashed and fading out, following their shape - all following the
 * ground, under water too, since that is where it gets shaped.
 */
function hiliteData(tiles) {
  var picked = Object.create(null),
    ring = Object.create(null),
    halo = [],
    selected = [],
    tile,
    near,
    r,
    x,
    y,
    dx,
    dy,
    i;

  for (i = 0; i < tiles.length; i++) picked[tiles[i]] = true;

  //how far each tile around them is from the nearest picked one
  for (i = 0; i < tiles.length; i++) {
    x = Terrain.extractX(tiles[i]);
    y = Terrain.extractY(tiles[i]);

    for (dx = -HALO_RADIUS; dx <= HALO_RADIUS; dx++) {
      for (dy = -HALO_RADIUS; dy <= HALO_RADIUS; dy++) {
        near = Terrain.convertToIndex(x + dx, y + dy);
        r = Math.max(Math.abs(dx), Math.abs(dy));

        if (
          picked[near] !== true &&
          (ring[near] === undefined || r < ring[near])
        )
          ring[near] = r;
      }
    }
  }

  function hilite(tile, border, width, dash) {
    return {
      x: Terrain.extractX(tile),
      y: Terrain.extractY(tile),
      borderColor: border,
      borderWidth: width,
      borderDash: dash,
      underwater: true,
    };
  }

  for (tile in ring)
    halo.push(hilite(+tile, HALO_BORDERS[ring[tile] - 1], 1, HALO_DASH));

  for (i = 0; i < tiles.length; i++)
    selected.push(hilite(tiles[i], SELECTED_BORDER, 2, null));

  //the picked tiles last, so their outline is drawn over the others
  return halo.concat(selected);
}

//the toggles, one to each thing to do to the ground (the city builder's
//icons, by name - ui/icons), the order they stand in between cancel and
//the tick
var TOOLS = [
  { mode: "clear", icon: "clear" },
  { mode: "raise", icon: "raise" },
  { mode: "lower", icon: "lower" },
];

function Terrainman(root) {
  this.root = root;

  //what was toggled on when the mode was last left, for it to start out the
  //same - till the page is left
  this.lastMode = "clear";
}

Terrainman.prototype.enter = function () {
  var self = this,
    root = this.root,
    buildman = root.buildman,
    gameScreen = root.ui.gameScreen(),
    worldScreen = gameScreen.worldScreen(),
    //a building looked at as the mode starts: its tiles are what is picked
    //to begin with, rather than the tile in the middle of the screen
    focused = root.serviceman.inspected(),
    //the handles follow the ground under water the way the rings do - and
    //a building tapped picks the ground it stands on
    ts = new AreaSelector(root, { underwater: true, buildings: true }),
    tokens = [],
    //what is toggled on, done to the picked tiles with the tick, the
    //controls, and the price tag over the selection - and the buildings in
    //its way, marked
    pending = null,
    controls = null,
    tag = null,
    blockedTokens = [];

  function city() {
    return root.core.cities.getCity(0);
  }

  //the picked tiles' bounding box, as an anchor tile and a size
  function area() {
    var bounds = ts.bounds();

    return {
      tile: Terrain.convertToIndex(bounds.x0, bounds.y0),
      sizeX: bounds.x1 - bounds.x0 + 1,
      sizeY: bounds.y1 - bounds.y0 + 1,
    };
  }

  function clearTag() {
    if (tag !== null) tag.destroy();
    tag = null;

    root.hiliteMan.disable(blockedTokens);
    blockedTokens = [];
  }

  //what the pending action would come to for the tiles picked right now,
  //over them - or why it cannot be done at all
  function updateQuote() {
    clearTag();

    if (pending === null) return;

    var quote = pending.quote(ts.tiles()),
      where = area(),
      price = "$" + Numeral(quote.cost).format("0,0"),
      reason = errorText[quote.error] || "can't do that";

    if (
      quote.error === ErrorCode.NONE ||
      quote.error === ErrorCode.NOT_ENOUGH_RES
    )
      tag = buildman.createPriceTag(
        where.tile,
        where.sizeX,
        where.sizeY,
        quote.cost,
        quote.error === ErrorCode.NONE,
      );
    else tag = buildman.createTag(where.tile, where.sizeX, where.sizeY, reason);

    if (quote.blocked !== undefined)
      blockedTokens = root.hiliteMan.hilite(blockedHiliteData(quote.blocked));

    worldScreen.showHint(
      quote.error === ErrorCode.NONE
        ? pending.question + " for " + price + "?"
        : quote.error === ErrorCode.NOT_ENOUGH_RES
          ? "You cannot afford " + price + " for this!"
          : "You cannot " +
            pending.question.toLowerCase() +
            " - " +
            reason +
            "!",
    );

    controls.canSubmit(quote.error === ErrorCode.NONE);
  }

  function updateHilite() {
    //so that a tower in front of the picked ground does not hide it
    buildman.fadeAround(ts.tiles());

    root.hiliteMan.disable(tokens);
    tokens = root.hiliteMan.hilite(hiliteData(ts.tiles()));

    //the selection can still be moved while it is being confirmed, and
    //the price goes with it
    updateQuote();
  }

  var sub = Events.on(ts, AreaSelector.events.change, updateHilite),
    //a tile the bulldozers are done with is free to clear, build on and
    //shape again: priced afresh
    reached = Events.on(
      root.clearworks,
      Clearworks.events.reached,
      updateQuote,
    );

  var clear = {
    question: "Clear these tiles",
    quote: function (tiles) {
      return city().quoteClear(tiles);
    },
    apply: function (tiles) {
      var c = city(),
        where = area(),
        total = 0;

      //what stood on them stays standing until a bulldozer gets to it, and
      //goes down in a cloud of dust - a building comes down a tile at a
      //time (client/clearworks, client/demolition)
      root.clearworks.clear(tiles, function (tile) {
        var cleared = c.clearTile(tile);

        //every tile is charged on its own - with the rest of a building on
        //it
        total += cleared.length * Core.Config.clearTileCost;

        return cleared;
      });

      //and what it all came to goes up once, over the whole of the picked
      //ground
      if (total > 0)
        buildman.showCost(where.tile, where.sizeX, where.sizeY, total);
    },
  };

  //everything standing on tiles, or next to them, drawn again on the ground
  //as it is now - and the roads joined up again
  function redraw(tiles) {
    var seen = Object.create(null);

    tiles.forEach(function (tile) {
      for (var dx = -1; dx <= 1; dx++)
        for (var dy = -1; dy <= 1; dy++) {
          var view = buildman.getBuilding(tile + dx + dy * Terrain.dy);

          if (view === null || seen[view.data.tile] === true) continue;

          seen[view.data.tile] = true;

          if (view.updateProfile !== undefined) view.updateProfile();
          view.view.update();
          view.view.render();
        }
    });
  }

  function level(direction, question) {
    return {
      question: question,
      quote: function (tiles) {
        return city().quoteTerraform(tiles, direction);
      },
      apply: function (tiles) {
        var result = city().terraform(tiles, direction),
          where = area();

        //what stays is drawn again on the ground as it is now
        if (result.error === ErrorCode.NONE) redraw(result.tiles);

        if (result.error !== ErrorCode.NONE)
          buildman.showText(
            result.tile,
            1,
            1,
            errorText[result.error] || "can't do that",
          );
        else if (result.cost > 0)
          buildman.showCost(where.tile, where.sizeX, where.sizeY, result.cost);
      },
    };
  }

  var actions = {
    clear: clear,
    raise: level(1, "Raise this land"),
    lower: level(-1, "Lower this land"),
  };

  function leave() {
    ts.dispose();
    buildman.unfade();
    clearTag();
    root.hiliteMan.disable(tokens);
    Events.off(ts, AreaSelector.events.change, sub);
    Events.off(root.clearworks, Clearworks.events.reached, reached);

    gameScreen.showWorld();
    worldScreen.hideHint();
  }

  //what is done to the ground, toggled on - the one before off - and priced
  //for the tiles picked, there and then
  function toggle(mode) {
    pending = actions[mode];
    self.lastMode = mode;

    controls.tools(
      TOOLS.map(function (tool) {
        return {
          icon: tool.icon,
          on: tool.mode === mode,
          action: function () {
            toggle(tool.mode);
          },
        };
      }),
    );

    updateQuote();
  }

  controls = gameScreen.showActionControls();
  controls.canRotate(false);

  //done, it leaves what is picked picked and asks the same again, priced
  //afresh - going up another step is one more tap away. The ground under
  //it may have moved, so it is drawn over again
  controls.onSubmit = function () {
    pending.apply(ts.tiles());
    ts.refresh();
  };
  controls.onDiscard = leave;

  toggle(this.lastMode);

  //the selection is up from the start, in the middle of the screen - or on
  //the building that was being looked at, which is looked at no more
  if (focused !== null) {
    root.serviceman.hideCoverage();
    root.serviceman.hideInfo();
    ts.selectTiles(ServiceMan.footprint(focused));
  }

  updateHilite();
};

export default Terrainman;
