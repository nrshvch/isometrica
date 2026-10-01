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

var Terrain = Core.Terrain;

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

    //clear old GOs - each one lets go of the view as it is destroyed, so
    //off a copy of the list
    var children = this.gameObject.transform.children.slice();
    for (var i = 0; i < children.length; i++) children[i].gameObject.destroy();

    var lots =
      b.data.getState() === BuildingState.underConstruction && !look
        ? CompoundBuilding.lotPieces(
            vkaria.sprites,
            Rotation.sizeX(staticData, b.data.rotation),
            Rotation.sizeY(staticData, b.data.rotation),
            b.data.tile,
          )
        : null;

    if (b.data.getState() === BuildingState.underConstruction && look) {
      drawSite(this, staticData, look);
    } else if (lots !== null) {
      //any other building goes up on a building site like the blocks' -
      //the same all the while
      addPieces(this.gameObject, lots, this.opacity);
    } else if (b.data.getState() === BuildingState.underConstruction) {
      //the sites not described yet: a placeholder on each tile
      var sizeX = Rotation.sizeX(staticData, b.data.rotation),
        sizeY = Rotation.sizeY(staticData, b.data.rotation);

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
          part.transform.translate(x * Config.tileSize, 0, y * Config.tileSize);
        }
      }
    } else if (b.data.getState() === BuildingState.ready) {
      //drawn the way it was painted, see addSprites
      var rotated = mirrored(staticData, b.data.rotation);

      addSprites(
        this.gameObject,
        staticData,
        b.data.rotation,
        this.opacity,
        undefined,
        look,
        b.data.tile,
      );

      //add smoke
      if (staticData.smokeSource !== undefined) {
        var smoke = staticData.smokeSource,
          smokeSource = new engine.GameObject();

        //the chimney turns round with the rest of the house
        if (rotated)
          smokeSource.transform.setLocalPosition(
            smoke[2] * tileSize,
            smoke[1] * tileZStep,
            smoke[0] * tileSize,
          );
        else
          smokeSource.transform.setLocalPosition(
            smoke[0] * tileSize,
            smoke[1] * tileZStep,
            smoke[2] * tileSize,
          );

        smokeSource.addComponent(new SmokeSource(b.data));
        this.gameObject.transform.addChild(smokeSource.transform);
      }
    }

    //position gameObject
    var data = this.building.data,
      //this.building.tile.gameObject.transform.getPosition()[1] + this.building.tile.subpositionZ(data.subPosX, data.subPosY),
      x = Terrain.extractX(data.tile), // + data.subPosX,
      y = Terrain.extractY(data.tile), // + data.subPosY,
      z = vkaria.core.world.terrain.getGridPointHeight(x + 1, y);

    this.gameObject.transform.setPosition(
      x * tileSize,
      z * tileZStep,
      y * tileSize,
    );
  }
};

/**
 * A block going up, as the building site it is at the moment - and the
 * redraw for when it moves on to the next stage.
 */
function drawSite(self, staticData, look) {
  var data = self.building.data,
    progress = data.getProgress(),
    stage = stageOf(progress);

  addParts(
    self.gameObject,
    staticData.compound,
    Rotation.turns(data.rotation),
    self.opacity,
    undefined,
    CompoundBuilding.siteLook(look, stage, data.tile),
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
    spriteRenderer.setSprite(vkaria.sprites.getSprite(spriteData.path));

    var spriteGO = new engine.GameObject();
    spriteGO.addComponent(spriteRenderer);
    //the renderer resets its opacity once it is attached
    spriteRenderer.opacity = opacity;
    parent.transform.addChild(spriteGO.transform);

    spriteGO.transform.setLocalPosition(
      spriteData.x * tileSize,
      spriteData.y * tileZStep,
      spriteData.z * tileSize,
    );
  }
}

BuildingView.addSprites = addSprites;

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
    go.transform.setLocalPosition(
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
