/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 15:09
 * To change this template use File | Settings | File Templates.
 */
import engine from "engine";
import RenderLayer from "client/renderlayer";
import SmokeSource from "./components/smokesource";
import Config from "./config";
import BuildingState from "core/buildingstate";
import Core from "core/main";
import CompoundBuilding from "./compoundbuilding";
import Rotation from "core/rotation";
import { stageOf, STAGES } from "shared/gen/stacking";
import SiteRenderer from "./siterenderer";
import View from "./view";
import BuildingClassCode from "data/classcode";
import Trees from "data/trees";

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
        frame = vkaria.sprites.frame(name),
        renderer = new engine.SpriteRenderer(),
        go = new engine.GameObject();

      if (!frame) continue;

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

BuildingView.prototype.gameObject = null;
BuildingView.prototype.building = null;
//1 for solid - less while something being placed nearby needs to be seen
//through it (see Buildman)
BuildingView.prototype.opacity = 1;
//the next redraw of a block going up, for when its site moves on a stage
BuildingView.prototype.stageTimer = null;

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

    clearTimeout(this.stageTimer);
    this.stageTimer = null;

    //as it is seen, the camera turned the way it is (see drawnAt)
    var at = drawnAt(staticData, b.data.tile, b.data.rotation, b.data.surface);

    //clear old GOs - each one lets go of the view as it is destroyed, so
    //off a copy of the list
    var children = this.gameObject.transform.children.slice();
    for (var i = 0; i < children.length; i++) children[i].gameObject.destroy();

    var lots =
      b.data.getState() === BuildingState.underConstruction && !look
        ? CompoundBuilding.lotPieces(
            vkaria.sprites,
            at.sizeX,
            at.sizeY,
            b.data.tile,
            CompoundBuilding.smallSite(staticData),
          )
        : null;

    if (b.data.getState() === BuildingState.underConstruction && look) {
      drawSite(this, staticData, look, at.rotation);
    } else if (lots !== null) {
      //any other building goes up on a building site like the blocks' -
      //the same all the while
      addPieces(this.gameObject, lots, this.opacity);
    } else if (b.data.getState() === BuildingState.underConstruction) {
      //the sites not described yet: a placeholder on each tile
      var sizeX = at.sizeX,
        sizeY = at.sizeY;

      for (var x = 0; x < sizeX; x++) {
        for (var y = 0; y < sizeY; y++) {
          var part = new engine.GameObject(),
            sprite = new engine.SpriteRenderer();

          sprite.layer = RenderLayer.buildingsLayer;
          sprite
            .setSprite(vkaria.sprites.getSprite("site.png"))
            .setPivot(32, 24);

          part.addComponent(sprite);
          //the renderer resets its opacity once it is attached
          sprite.opacity = this.opacity;
          this.gameObject.transform.addChild(part.transform);
          setSeenPosition(part, x * Config.tileSize, 0, y * Config.tileSize);
        }
      }
    } else if (b.data.getState() === BuildingState.ready) {
      //drawn the way it was painted, see addSprites
      var rotated = mirrored(staticData, at.rotation);

      addSprites(
        this.gameObject,
        staticData,
        at.rotation,
        this.opacity,
        undefined,
        look,
        b.data.tile,
      );

      //smoke out of the chimneys of a house put together out of parts
      if (look)
        CompoundBuilding.chimneys(
          vkaria.sprites,
          look,
          staticData.compound,
          at.rotation,
        ).forEach(function (top) {
          var source = new engine.GameObject();

          setSeenPosition(
            source,
            top[0] * tileSize,
            top[1] * tileZStep,
            top[2] * tileSize,
          );
          source.addComponent(new SmokeSource(b.data));
          this.gameObject.transform.addChild(source.transform);
        }, this);

      //add smoke
      if (staticData.smokeSource !== undefined) {
        var smoke = staticData.smokeSource,
          smokeSource = new engine.GameObject();

        //the chimney turns round with the rest of the house
        if (rotated)
          setSeenPosition(
            smokeSource,
            smoke[2] * tileSize,
            smoke[1] * tileZStep,
            smoke[0] * tileSize,
          );
        else
          setSeenPosition(
            smokeSource,
            smoke[0] * tileSize,
            smoke[1] * tileZStep,
            smoke[2] * tileSize,
          );

        smokeSource.addComponent(new SmokeSource(b.data));
        this.gameObject.transform.addChild(smokeSource.transform);
      }
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
  }
};

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

  if (stage < STAGES.length)
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
 */
function addSprites(parent, staticData, rotation, opacity, layer, look, seed) {
  if (staticData.compound) {
    addParts(
      parent,
      staticData.compound,
      Rotation.turns(rotation),
      opacity,
      layer,
      look,
      seed,
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
    var spriteData = spritesData[i];

    var spriteRenderer = new engine.SpriteRenderer();
    spriteRenderer.layer = layer !== undefined ? layer : spriteData.layer;
    spriteRenderer.pivotX = spriteData.pivotX;
    spriteRenderer.pivotY = spriteData.pivotY;
    //a tree from the side it is seen from (data/trees turned)
    spriteRenderer.setSprite(
      vkaria.sprites.getSprite(Trees.turned(spriteData.path, rotation)),
    );

    var spriteGO = new engine.GameObject();
    spriteGO.addComponent(spriteRenderer);
    //the renderer resets its opacity once it is attached
    spriteRenderer.opacity = opacity;
    parent.transform.addChild(spriteGO.transform);

    setSeenPosition(
      spriteGO,
      spriteData.x * tileSize,
      spriteData.y * tileZStep,
      spriteData.z * tileSize,
    );
  }
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
function addParts(parent, compound, turns, opacity, layer, look, seed) {
  var sprites = vkaria.sprites;

  look = look || CompoundBuilding.sampleLook(sprites, compound);

  //nothing to put it together out of
  if (look === null) return;

  addPieces(
    parent,
    CompoundBuilding.pieces(sprites, look, compound, turns, seed),
    opacity,
    layer,
  );
}

/**
 * Hangs the pieces of something put together out of parts under parent -
 * see client/compoundbuilding pieces - each tile at its own place.
 */
function addPieces(parent, pieces, opacity, layer) {
  pieces.forEach(function (piece) {
    //a tile of a site with something moving over it draws that too
    var renderer =
        piece.overlays.length > 0
          ? new SiteRenderer()
          : new engine.SpriteRenderer(),
      go = new engine.GameObject();

    if (piece.overlays.length > 0) renderer.overlays = piece.overlays;

    renderer.layer = layer !== undefined ? layer : RenderLayer.buildingsLayer;
    renderer.pivotX = piece.pivotX;
    renderer.pivotY = piece.pivotY;
    renderer.setSprite(piece.sprite);

    go.addComponent(renderer);
    //the renderer resets its opacity once it is attached
    renderer.opacity = opacity;
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
