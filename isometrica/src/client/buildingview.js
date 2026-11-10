/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine";
import RenderLayer from "./renderlayer";
import SmokeSource from "./components/smokesource";
import Config from "./config";
import BuildingState from "../core/buildingstate";
import Core from "../core/main";
import CompoundBuilding from "./compoundbuilding";
import Rotation from "../core/rotation";
import { stageOf, STAGES } from "../shared/gen/stacking";
import SiteRenderer from "./siterenderer";
import WorkLights from "./worklights";
import View from "./view";
import BuildingClassCode from "../data/classcode";
import Trees from "../data/trees";
import Rubble from "./rubble";
import Ruin from "./ruin";
import BuildingData from "../data/buildings";
import { changed } from "./looks";

var Terrain = Core.Terrain;

/**
 * How a building on tile, turned rotation, is drawn with the camera turned
 * the way it is (see client/view): from the tile of its footprint nearest
 * the camera's own corner as it is seen, its footprint as seen, turned as
 * many more times as the camera is, at the height of the grid point a
 * building drawn from that tile stands on.
 *
 * @param staticData {Object} what it is, data/buildings
 * @param tile {number}
 * @param rotation {number|boolean} see core/rotation
 * @returns {{x, y, sizeX, sizeY, rotation, z}} x, y the tile in the world
 */
function drawnAt(staticData, tile, rotation, surface) {
  var r = View.anchor(
    Terrain.extractX(tile),
    Terrain.extractY(tile),
    Rotation.sizeX(staticData, rotation),
    Rotation.sizeY(staticData, rotation),
  );

  r.rotation = (Rotation.turns(rotation) + View.turns()) & 3;
  //level, on its surface (core/surface) - at the highest corner under it
  //for one not put up yet: where the ground is lower it stands on a
  //concrete base (addFoundations)
  r.z = Array.isArray(surface)
    ? surface[0]
    : groundTop(
        vkaria.core.world.terrain,
        Terrain.extractX(tile),
        Terrain.extractY(tile),
        Rotation.sizeX(staticData, rotation),
        Rotation.sizeY(staticData, rotation),
      );

  return r;
}

/**
 * The highest grid point under sizeX by sizeY tiles from tile x, y.
 */
function groundTop(terrain, x0, y0, sizeX, sizeY) {
  var top = -Infinity;

  for (var x = x0; x <= x0 + sizeX; x++)
    for (var y = y0; y <= y0 + sizeY; y++)
      top = Math.max(top, terrain.getGridPointHeight(x, y));

  return top;
}

/**
 * Hangs under parent - drawn from tile at, top high - the concrete a building
 * on uneven ground stands on: a piece on every tile of it whose ground is
 * lower than the top anywhere, cut to the ground there as the tile is seen
 * (shared/gen/foundations). A tree or a road has none: it stands on the
 * slope as it is.
 *
 * @param at {{x, y, z}} see drawnAt
 */
function addFoundations(
  parent,
  staticData,
  tile,
  rotation,
  at,
  opacity,
  layer,
) {
  //from above, the base is under what stands on it
  if (View.top()) return;

  var classCode = staticData.classCode;

  if (
    classCode === BuildingClassCode.tree ||
    classCode === BuildingClassCode.road
  )
    return;

  var terrain = vkaria.core.world.terrain,
    x0 = Terrain.extractX(tile),
    y0 = Terrain.extractY(tile),
    sizeX = Rotation.sizeX(staticData, rotation),
    sizeY = Rotation.sizeY(staticData, rotation),
    x,
    y,
    k;

  for (x = x0; x < x0 + sizeX; x++) {
    for (y = y0; y < y0 + sizeY; y++) {
      var drops = [],
        any = false;

      for (k = 0; k < 4; k++) {
        var d = Math.max(
          0,
          Math.min(1, at.z - View.cornerHeight(terrain, x, y, k)),
        );

        drops.push(d);
        if (d > 0) any = true;
      }

      if (!any) continue;

      //on the shore, the base goes down into the water rather than to the
      //ground, the water looking higher there (shared/gen/foundations)
      var name =
          "gen/foundations/" +
          (terrain.getTerrainType(x, y) === Core.TerrainType.shore
            ? "shore/"
            : "") +
          drops.join(""),
        frame = vkaria.sprites.frame(name);

      if (!frame) continue;

      if (collecting !== null) {
        collect(vkaria.sprites.getSprite(name));
        continue;
      }

      var renderer = new engine.SpriteRenderer(),
        go = new engine.GameObject();

      renderer.layer = layer;
      renderer.setSprite(vkaria.sprites.getSprite(name));
      renderer.setPivot(frame.pivotX, frame.pivotY);
      go.addComponent(renderer);
      //the renderer resets its opacity once it is attached
      renderer.opacity = opacity;
      parent.transform.addChild(go.transform);
      //off the tile the parent is drawn from, in the world - the pieces
      //are picked as they are seen, not laid out that way
      go.transform.setLocalPosition(
        (x - at.x) * Config.tileSize,
        0,
        (y - at.y) * Config.tileSize,
      );
    }
  }
}

/**
 * Puts go x, y, z off its parent as it is seen - laid out the way a picture
 * of the building is, the camera unturned - which is that way round in the
 * world, the camera turned.
 */
function setSeenPosition(go, x, y, z) {
  var w = View.unvector(x, z);

  go.transform.setLocalPosition(w[0], y, w[1]);
}

function BuildingView() {
  this.gameObject = new engine.GameObject("building");
}

//while only the pictures a building would be drawn with are wanted - as it
//would be seen from another side, to have them ready (seenSprites) - where
//they go; null while it is drawn
var collecting = null;

function collect(sprite) {
  collecting.push(sprite);
}

/**
 * The pictures it would be drawn with as it is seen now - with View peek,
 * from another side - into out, without drawing anything (client/
 * preloader).
 */
BuildingView.prototype.seenSprites = function (out) {
  collecting = out;
  try {
    this.update();
  } finally {
    collecting = null;
  }
};

BuildingView.prototype.gameObject = null;
BuildingView.prototype.building = null;
//1 for solid - less while something being placed nearby needs to be seen
//through it (see Buildman)
BuildingView.prototype.opacity = 1;
//the next redraw of a block going up, for when its site moves on a stage
BuildingView.prototype.stageTimer = null;
//what it was last drawn as, {state, progress} - for whatever stands in for
//the building once the world has let go of it, and has it neither up nor
//going up any more (client/demolition)
BuildingView.prototype.drawnAs = null;

BuildingView.prototype.setBuilding = function (building) {
  this.building = building;
};

/**
 * Makes the whole building see-through, or solid again with 1 - and keeps it
 * that way when it is drawn over, say as it is finished.
 */
BuildingView.prototype.setOpacity = function (opacity) {
  var children = this.gameObject.transform.children,
    renderer,
    i;

  this.opacity = opacity;

  for (i = 0; i < children.length; i++) {
    renderer = children[i].gameObject.spriteRenderer;

    if (renderer) renderer.opacity = opacity;
  }
};

/**
 * What is drawn of it on tile as see-through as k says, 0 not to be seen,
 * 1 as it is - kept for whenever it is drawn anew: the heap of rubble a
 * part of it come down leaves, under the dust of it coming down
 * (client/collapse).
 */
BuildingView.prototype.setTileOpacity = function (tile, k) {
  var children = this.gameObject.transform.children;

  this.tileOpacity = this.tileOpacity || {};
  this.tileOpacity[tile] = k;

  for (var i = 0; i < children.length; i++) {
    var go = children[i].gameObject;

    if (go.tile === tile && go.spriteRenderer)
      go.spriteRenderer.opacity = this.opacity * k;
  }
};

//how a yard is run down (shared/gen/isobox setWorn): wrecked by a blast,
//or burnt
var WORN_BLAST = 1,
  WORN_BURNT = 2;

//how charred the rubble of a building burnt out before it came down is
//(client/burnt c)
var CHARRED = 80;

//a part of it open where one in front of it is down, not painted yet when
//it was drawn: drawn again a while after (damaged)
var RETRY_MS = 400;

BuildingView.prototype.update = function () {
  var b = this.building;
  if (b !== null && b.staticData !== null) {
    var staticData = b.staticData,
      tileSize = Config.tileSize,
      tileZStep = Config.tileZStep;

    //a block put together out of parts is given its look the first time it
    //is seen - going up or standing - and keeps it, in the save as well
    var look = staticData.compound
      ? CompoundBuilding.lookOf(vkaria.sprites, b.data, staticData.compound)
      : null;

    if (collecting === null) {
      clearTimeout(this.stageTimer);
      this.stageTimer = null;
      changed();
      this.drawnAs = {
        state: b.data.getState(),
        progress: b.data.getProgress(),
      };
    }

    //as it is seen, the camera turned the way it is (see drawnAt)
    var at = drawnAt(staticData, b.data.tile, b.data.rotation, b.data.surface);

    //clear old GOs - each one lets go of the view as it is destroyed, so
    //off a copy of the list
    if (collecting === null) {
      var children = this.gameObject.transform.children.slice();
      for (var i = 0; i < children.length; i++)
        children[i].gameObject.destroy();
    }

    //being demolished: nothing of its own - the demolition stands in for
    //it, fenced off, as far down as it has come (client/demolition)
    if (b.data.demolishing) return;

    //its ground still being cleared before it goes up (core/construction
    //awaitClearing): nothing of it there yet, but the bulldozers at it
    //(client/clearworks)
    var waiting = b.data.clearing !== undefined && b.data.clearing();

    //a site laid out on the ground the building takes up in the world, and
    //turned as it is seen - the crane on the same tile from every side
    var lots =
      b.data.getState() === BuildingState.underConstruction && !look && !waiting
        ? CompoundBuilding.lotPieces(
            vkaria.sprites,
            Rotation.sizeX(staticData, b.data.rotation),
            Rotation.sizeY(staticData, b.data.rotation),
            b.data.tile,
            CompoundBuilding.smallSite(staticData),
            View.turns(),
          )
        : null;

    if (waiting) {
      //nothing to draw - but drawn again once it goes up (cleared)
    } else if (b.data.getState() === BuildingState.underConstruction && look) {
      drawSite(this, staticData, look, at.rotation);
    } else if (lots !== null) {
      //any other building goes up on a building site like the blocks' -
      //the same all the while
      addPieces(this.gameObject, lots, this.opacity, undefined, b.data.tile);
    } else if (b.data.getState() === BuildingState.ruin) {
      //burnt down: what is left of it (client/ruin) - of one painted whole,
      //its picture burnt down as it is
      if (!look) {
        addSprites(
          this.gameObject,
          staticData,
          at.rotation,
          this.opacity,
          undefined,
          undefined,
          b.data.tile,
        );
        this.gameObject.transform.children.forEach(function (child, k) {
          var r = child.gameObject.spriteRenderer;

          if (r && r.sprite && r.layer === RenderLayer.buildingsLayer)
            r.setSprite(Ruin.whole(vkaria.sprites, r.sprite, b.data.tile + k));
        });
      } else
        addPieces(
          this.gameObject,
          Ruin.pieces(
            vkaria.sprites,
            CompoundBuilding.pieces(
              vkaria.sprites,
              look,
              staticData.compound,
              at.rotation,
              b.data.tile,
            ),
            //gutted to its frame, its walls standing, or fallen in - by
            //what it was built of (core/burning)
            Ruin.kindOf(b.data),
          ),
          this.opacity,
          undefined,
          b.data.tile,
        );
    } else if (b.data.look && b.data.look.wreck) {
      //the yard of a building blown up, wrecked (core/city explode)
      drawWreck(this, b.data.look.wreck, b.data.tile);
    } else if (b.data.look && b.data.look.of && ofCompound(b.data.look.of)) {
      //the rubble of a building come down, of what it was built of
      //(client/ruin "c")
      drawRubbleOf(this, b.data.look.of, b.data.tile);
    } else if (b.data.look && b.data.look.fallen) {
      //a tree knocked down by a blast, lying (core/city explode)
      drawFallen(this, b.data.look.fallen, b.data.tile);
    } else if (
      b.data.getState() === BuildingState.ready ||
      b.data.getState() === BuildingState.burning
    ) {
      var burning = b.data.getState() === BuildingState.burning;

      //drawn the way it was painted, see addSprites - on fire, its lights
      //on still till it is burnt out (client/fires)
      addSprites(
        this.gameObject,
        staticData,
        at.rotation,
        this.opacity,
        undefined,
        //an old town with its wall round it, and round the old town next
        //to it too
        look && staticData.compound.gen === "oldtown"
          ? CompoundBuilding.walled(
              look,
              staticData.compound,
              b.data,
              vkaria.core.buildingService,
            )
          : look,
        b.data.tile,
        lightsOf(staticData),
        b.data,
        this,
      );

      //smoke out of the chimneys of a house put together out of parts
      if (look && collecting === null && !burning)
        CompoundBuilding.chimneys(
          vkaria.sprites,
          look,
          staticData.compound,
          at.rotation,
        ).forEach(function (top, k) {
          var source = new engine.GameObject();

          setSeenPosition(
            source,
            top[0] * tileSize,
            top[1] * tileZStep,
            top[2] * tileSize,
          );
          source.addComponent(new SmokeSource(b.data, k));
          this.gameObject.transform.addChild(source.transform);
        }, this);
    }

    if (collecting !== null) {
      addFoundations(
        null,
        staticData,
        b.data.tile,
        b.data.rotation,
        at,
        this.opacity,
        RenderLayer.roadLayer,
      );
      return;
    }

    //level on a concrete base where the ground under it is not
    addFoundations(
      this.gameObject,
      staticData,
      b.data.tile,
      b.data.rotation,
      at,
      this.opacity,
      RenderLayer.roadLayer,
    );

    //drawn from the tile it is seen from (see drawnAt)
    this.gameObject.transform.setPosition(
      at.x * tileSize,
      at.z * tileZStep,
      at.y * tileSize,
    );

    //a part of it to be open, not painted yet: drawn again soon
    if (this.retry === true && collecting === null) {
      var self = this;

      this.retry = false;
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(function () {
        if (self.building !== null && self.gameObject.world !== null)
          self.update();
      }, RETRY_MS);
    }
  }
};

/**
 * A tile of a yard wrecked by a blast (core/city/citybuildings leaveWreck):
 * the tile of what it was a yard of, as it would be drawn there (client/
 * compoundbuilding pieces), run down - painted so, its asphalt cracked, its
 * trees dead, what stood on it broken (WORN_BLAST). Nothing, for what
 * was not put together out of parts.
 *
 * @param wreck {{code: number, tile: number, rotation: number, look:
 *        Object}} what it was a yard of
 */
function drawWreck(self, wreck, tile) {
  drawPieceOf(self, wreck, tile, function (p) {
    return vkaria.sprites.worn(p.sprite, WORN_BLAST);
  });
}

//whether what a heap of rubble is of was put together out of parts, a tile
//of it to be drawn as rubble of itself (drawRubbleOf)
function ofCompound(of) {
  var data = BuildingData[of.code];

  return !!data && !!data.compound && !!of.look && !!of.look.tiles;
}

/**
 * A heap of rubble a building left come down (core/city/citybuildings
 * leaveRubble): the tile of it as it would be drawn there, come down - the
 * rubble of what it was built of, as high as there were storeys of it on
 * that tile (client/ruin model "c") - charred, if it burnt out first.
 *
 * @param of {{code: number, tile: number, rotation: number, look: Object,
 *        burnt: boolean}}
 */
function drawRubbleOf(self, of, tile) {
  drawPieceOf(self, of, tile, function (p) {
    var heap = Ruin.model(vkaria.sprites, p.sprite, "c");

    //burnt out before it came down: charred black
    return of.burnt
      ? vkaria.sprites.burnt(heap, "c:" + (of.tile % 100000) + ":" + CHARRED)
      : heap;
  });
}

/**
 * The piece of a building that stood on tile - as of says it was - drawn on
 * that tile on its own, its picture as as says.
 */
function drawPieceOf(self, of, tile, as) {
  var data = BuildingData[of.code];

  if (!data || !data.compound || !of.look || !of.look.tiles) return;

  var wreck = of,
    at = drawnAt(data, wreck.tile, wreck.rotation),
    pieces = CompoundBuilding.pieces(
      vkaria.sprites,
      wreck.look,
      data.compound,
      at.rotation,
      wreck.tile,
    ),
    mine = pieces.filter(function (p) {
      var off = View.unvector(p.x, p.z);

      return (
        Terrain.convertToIndex(
          Math.round(at.x + off[0]),
          Math.round(at.y + off[1]),
        ) === tile
      );
    });

  if (mine.length === 0) return;

  addPieces(
    self.gameObject,
    mine.map(function (p) {
      return {
        x: 0,
        z: 0,
        pivotX: p.pivotX,
        pivotY: p.pivotY,
        overlays: [],
        sprite: as(p),
      };
    }),
    self.opacity,
    undefined,
    tile,
  );
}

/**
 * A tree knocked down by a blast (core/city/citybuildings leaveFallen),
 * lying on the ground the way it went over: the picture of it painted
 * lying (shared/gen/trees FALLS, the last of them, client/felling), from
 * the side it is seen - nothing, for one that has none.
 *
 * @param fallen {{code: number, rotation: number, world: boolean, way:
 *        string}}
 */
function drawFallen(self, fallen, tile) {
  var data = BuildingData[fallen.code],
    spriteData = data && data.sprites ? data.sprites[0] : null;

  if (!spriteData || View.top()) return;

  var turns =
      ((fallen.world
        ? Trees.tileTurns(tile)
        : Rotation.turns(fallen.rotation)) +
        View.turns()) &
      3,
    seen = View.heading(fallen.way),
    name = Trees.turned(spriteData.path, turns) + "/" + seen + "/3";

  if (seen === undefined || !vkaria.sprites.has(name)) return;

  //only the picture wanted, as it would be seen from another side
  if (collecting !== null) {
    collect(vkaria.sprites.getSprite(name));
    return;
  }

  var renderer = new engine.SpriteRenderer(),
    go = new engine.GameObject();

  renderer.layer = spriteData.layer;
  renderer.pivotX = spriteData.pivotX;
  renderer.pivotY = spriteData.pivotY;
  renderer.setSprite(vkaria.sprites.getSprite(name));
  go.addComponent(renderer);
  renderer.opacity = self.opacity;
  self.gameObject.transform.addChild(go.transform);
  setSeenPosition(
    go,
    spriteData.x * Config.tileSize,
    spriteData.y * Config.tileZStep,
    spriteData.z * Config.tileSize,
  );
}

/**
 * The tiles of a building put together out of parts as it stands, knocked
 * about by a blast (core/building down): a part of it come down a heap of
 * rubble, as the heaps of the parts of it round it are (client/rubble),
 * flat on its level; a yard wrecked, run down (WORN_BLAST); a part still
 * standing in front of which one has come down open on that side, its
 * rooms showing (SpriteCache opened) - once that is painted, shut till
 * then (retry). Each piece told which tile it is on, and whether it is what
 * is left of a part come down.
 *
 * @param model {Building} the core's
 * @param at {Object} where it is drawn from (drawnAt)
 */
function damaged(self, pieces, model, at) {
  var sprites = vkaria.sprites;

  function tileOf(p) {
    var off = View.unvector(p.x, p.z);

    return Terrain.convertToIndex(
      Math.round(at.x + off[0]),
      Math.round(at.y + off[1]),
    );
  }

  function rubble(t) {
    return model.isDown(t) && !model.isYard(t);
  }

  return pieces.map(function (p) {
    var tile = tileOf(p),
      out = Object.assign({}, p, { tile: tile, down: false });

    if (model.down === null) return out;

    if (model.isDown(tile)) {
      if (model.isYard(tile)) {
        out.sprite = sprites.worn(p.sprite, WORN_BLAST);
        out.overlays = [];
        return out;
      }

      //the rubble of what it was built of (client/ruin "c")
      out.sprite = Ruin.model(sprites, p.sprite, "c");
      out.overlays = [];
      out.down = true;
      return out;
    }

    if (model.isYard(tile)) return out;

    //open where a part of it in front has come down
    var sides = 0,
      x = Terrain.extractX(tile),
      y = Terrain.extractY(tile);

    [
      [-1, 0, 1],
      [0, -1, 2],
    ].forEach(function (d) {
      var w = View.unvector(d[0], d[1]),
        n = Terrain.convertToIndex(x + w[0], y + w[1]);

      if (rubble(n)) sides |= d[2];
    });

    if (sides > 0 && !View.top()) {
      var open = sprites.opened(p.sprite, sides);

      if (painted(open)) out.sprite = open;
      else self.retry = true;
    }

    return out;
  });
}

//whether a picture is painted, as it is drawn - asked for, if not
function painted(sprite) {
  var gl = engine.Config.gl,
    ready = sprite.ready ? sprite.ready() : true;

  if (sprite.entries)
    sprite.entries(!!gl, true).forEach(function (e) {
      if (e !== sprite && e.ready && !e.ready()) ready = false;
    });

  return ready;
}

/**
 * A block going up, as the building site it is at the moment - and the
 * redraw for when it moves on to the next stage.
 */
function drawSite(self, staticData, look, turns) {
  var data = self.building.data,
    progress = data.getProgress(),
    stage = stageOf(progress);

  addParts(
    self.gameObject,
    staticData.compound,
    turns,
    self.opacity,
    undefined,
    CompoundBuilding.siteLook(
      look,
      stage,
      data.tile,
      CompoundBuilding.smallSite(staticData),
    ),
    data.tile,
  );

  if (stage < STAGES.length && collecting === null)
    self.stageTimer = setTimeout(
      function () {
        self.stageTimer = null;
        self.update();
      },
      //a moment past it, so that it is there by then
      (STAGES[stage] - progress) * staticData.constructionTime + 50,
    );
}

/**
 * Lets go of what it was waiting to do, for a building that is gone.
 */
BuildingView.prototype.dispose = function () {
  clearTimeout(this.stageTimer);
  this.stageTimer = null;
};

/**
 * Hangs the finished building's sprites under parent, laid out relative to the
 * tile it stands on - shared with the see-through preview shown while placing.
 *
 * A building put together out of parts is drawn from whichever of its four
 * sides faces the camera. One drawn by hand has two pictures at most, as it
 * is and turned round (flipped over, for most): its back is drawn as its
 * front, and the side turned the other way as the side.
 *
 * @param rotation {number} quarter turns, 0..3 - see core/rotation
 * @param opacity {number} 1 for the real thing
 * @param [layer] {number} every piece goes on this one rather than its own
 * @param [look] {Object} for a building put together out of parts, what it
 *        looks like - see client/compoundbuilding; the look of the kind of
 *        building it is, for one that is not a building yet
 * @param [seed] {number} for one put together out of parts, the same for the
 *        same building every time - where it stands: the cars in its car park
 * @param [lights] {string} the lights it has on at night, a finished building
 *        - see lightsOf; none for a building site, nor for a preview
 */
function addSprites(
  parent,
  staticData,
  rotation,
  opacity,
  layer,
  look,
  seed,
  lights,
  model,
  view,
) {
  if (staticData.compound) {
    addParts(
      parent,
      staticData.compound,
      Rotation.turns(rotation),
      opacity,
      layer,
      look,
      seed,
      lights,
      model,
      view,
    );
    return;
  }

  var rotated = mirrored(staticData, rotation),
    spritesData =
      rotated && staticData.spritesRotate
        ? staticData.spritesRotate
        : staticData.sprites,
    tileSize = Config.tileSize,
    tileZStep = Config.tileZStep,
    len = spritesData.length;

  for (var i = 0; i < len; i++) {
    var spriteData = spritesData[i],
      //a heap of rubble as the heaps round it are (client/rubble) - a
      //tree, a stone from the side it is seen from (data/trees turned)
      name =
        spriteData.pile !== undefined && seed !== undefined
          ? Rubble.pictureOf(vkaria, seed, spriteData.pile, rotation)
          : Trees.turned(spriteData.path, rotation);

    if (collecting !== null) {
      collect(
        View.top()
          ? vkaria.sprites.topOf(name)
          : vkaria.sprites.getSprite(name),
      );
      continue;
    }

    var spriteRenderer = new engine.SpriteRenderer();
    spriteRenderer.layer = layer !== undefined ? layer : spriteData.layer;
    //a tree from the side it is seen from (data/trees turned) - or from
    //straight above
    if (View.top()) {
      var top = vkaria.sprites.topOf(name);

      spriteRenderer.pivotX = top.pivotX;
      spriteRenderer.pivotY = top.pivotY;
      spriteRenderer.setSprite(top);
    } else {
      spriteRenderer.pivotX = spriteData.pivotX;
      spriteRenderer.pivotY = spriteData.pivotY;
      spriteRenderer.setSprite(vkaria.sprites.getSprite(name));
    }

    var spriteGO = new engine.GameObject();
    spriteGO.addComponent(spriteRenderer);
    //the renderer resets its opacity once it is attached
    spriteRenderer.opacity = opacity;
    parent.transform.addChild(spriteGO.transform);

    setSeenPosition(
      spriteGO,
      spriteData.x * tileSize,
      //a heap of rubble lies on the ground, drawn from the lowest corner of
      //its tile - not from the highest, as what stands on it is
      (spriteData.y -
        (spriteData.pile !== undefined && seed !== undefined
          ? Rubble.dropOf(vkaria, seed)
          : 0)) *
        tileZStep,
      spriteData.z * tileSize,
    );
  }
}

//a building's own number 0..1 out of what it stands on, for its lights
function windowsSeed(seed) {
  var h = Math.imul(seed | 0, 0x9e3779b1) ^ 0x5bd1e995;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);

  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

BuildingView.addSprites = addSprites;
BuildingView.drawnAt = drawnAt;
BuildingView.addFoundations = addFoundations;

/**
 * Whether a building drawn by hand shows its turned-round picture, turned
 * the way it is - one painted for the footprint turned round does so when
 * not turned, so that it covers the footprint it actually has.
 */
function mirrored(staticData, rotation) {
  return ((Rotation.turns(rotation) & 1) === 1) !== !!staticData.turned;
}

/**
 * Hangs a building put together out of parts under parent: a sprite for each
 * of its tiles, each the parts of that tile put together.
 */
function addParts(
  parent,
  compound,
  turns,
  opacity,
  layer,
  look,
  seed,
  lights,
  model,
  view,
) {
  var sprites = vkaria.sprites;

  look = look || CompoundBuilding.sampleLook(sprites, compound);

  //nothing to put it together out of
  if (look === null) return;

  var pieces = CompoundBuilding.pieces(sprites, look, compound, turns, seed);

  //knocked about: parts of it down, open where they are
  if (model && model.down !== null && model.down !== undefined)
    pieces = damaged(
      view || {},
      pieces,
      model,
      drawnAt(model.data, model.tile, model.rotation, model.surface),
    );

  addPieces(parent, pieces, opacity, layer, seed, lights, view);
}

/**
 * The lights a finished building has on at night (client/lighting
 * windowsOn): a shop's, an office's, a home's - or none, for what has no
 * windows to light (a park, the waterworks).
 */
function lightsOf(staticData) {
  var gen = staticData.compound ? staticData.compound.gen : null;

  if (gen === "shops") return "shop";
  if (gen === "offices") return "office";
  if (gen === "houses" || gen === "flats" || gen === "oldtown") return "home";
  //its lamps, with the street lights
  if (gen === "parks") return "park";
  //the town's own: a square's lamps, a town hall's offices, a church as a
  //house is
  if (gen === "civic")
    return staticData.compound.footprint === "square"
      ? "park"
      : /^townhall/.test(staticData.compound.footprint)
        ? "office"
        : "home";

  return undefined;
}

/**
 * Hangs the pieces of something put together out of parts under parent -
 * see client/compoundbuilding pieces - each tile at its own place - every
 * piece of a finished building with the lights it has (lights, see
 * lightsOf) and the hours they are on by at night, the same for the whole
 * building (client/lighting windowsOn), and which of its two ways it is lit
 * at night, a toss of its own (client/cachedsprite nightSection). A building
 * site, or a building being placed, has no lights on at all.
 */
function addPieces(parent, pieces, opacity, layer, seed, lights, view) {
  //only the pictures wanted: each tile's, and what goes over it
  if (collecting !== null) {
    pieces.forEach(function (piece) {
      collect(piece.sprite);
      piece.overlays.forEach(function (o) {
        (o.looks || o.frames || []).forEach(function (look) {
          collect(look.sprite);
        });
      });
    });
    return;
  }

  var windows =
    seed === undefined || lights === undefined ? undefined : windowsSeed(seed);

  pieces.forEach(function (piece, i) {
    //a tile of a site with something moving over it draws that too
    var renderer =
        piece.overlays.length > 0
          ? new SiteRenderer()
          : new engine.SpriteRenderer(),
      go = new engine.GameObject();

    if (piece.overlays.length > 0) {
      renderer.overlays = piece.overlays;
      //its jib, its digger as far round as they were, drawn anew when the
      //camera turns
      if (seed !== undefined)
        renderer.phase = WorkLights.phaseOf(seed, i, SiteRenderer.ROUND);
    }

    renderer.layer = layer !== undefined ? layer : RenderLayer.buildingsLayer;
    renderer.pivotX = piece.pivotX;
    renderer.pivotY = piece.pivotY;
    renderer.setSprite(piece.sprite);
    renderer.windows = windows;
    renderer.lights = lights;
    renderer.variant =
      seed === undefined || windowsSeed((seed | 0) * 131 + i * 7 + 3) < 0.5
        ? 0
        : 1;

    go.addComponent(renderer);
    //which tile it is on, and whether it is what is left of a part of the
    //building come down (damaged) - and as see-through as that tile is
    //wanted (setTileOpacity)
    go.tile = piece.tile;
    go.down = piece.down === true;
    //the renderer resets its opacity once it is attached
    renderer.opacity =
      view && view.tileOpacity && view.tileOpacity[piece.tile] !== undefined
        ? opacity * view.tileOpacity[piece.tile]
        : opacity;
    parent.transform.addChild(go.transform);
    setSeenPosition(
      go,
      piece.x * Config.tileSize,
      0,
      piece.z * Config.tileSize,
    );
  });
}

BuildingView.prototype.render = function () {
  if (this.gameObject.world === null)
    vkaria.game.logic.world.addGameObject(this.gameObject);
};

export default BuildingView;
