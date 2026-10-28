/**
 * Created by denis on 8/27/14.
 */
import Config from "./config";
import Engine from "engine";
import Events from "events";
import Terrain from "./terrain";
import Core from "../core/main";
import Chunkman from "./chunkman";
import Pool from "../shared/object-pool";
import Rocks from "../data/rocks";
//a rock is drawn the way a tree is: one sprite among the buildings
import Tree from "./gameObjects/tree";
import View from "./view";
import Trees from "../data/trees";
import Felling from "./felling";
import { changed } from "./looks";

//which way round a tree on a tile is, of its four: the same every time, and
//any of them as likely as the others, with nothing to tell from the next
//tile's
function tileTurns(tile) {
  var h =
    Math.imul(CoreTerrain.extractX(tile), 0x27d4eb2d) ^
    Math.imul(CoreTerrain.extractY(tile), 0x165667b1) ^
    0x2545f491;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return (h ^ (h >>> 16)) >>> 30;
}

var BuildingData = Core.BuildingData;
var TileIterator = Core.TileIterator;
var CoreTerrain = Core.Terrain;

/**
 * What the world put on the tile, as the sprite it is drawn with - a tree or
 * stones - or null where there is nothing.
 */
function sceneryOf(self, tile) {
  var service = self.root.core.envService,
    code = service.getTree(tile);

  if (code !== null) return BuildingData[code].sprites[0];

  code = service.getRock(tile);

  return code !== null ? Rocks[code] : null;
}

/**
 * A tree stands on a corner of its tile - the one on the right as it is
 * seen, the camera turned (see client/view). Stones lie flat all over it, the
 * way the tile does, so they go at the height of its middle - halfway up it,
 * on a slope.
 */
function place(self, go, tile, spriteData) {
  var terrain = self.root.core.terrain,
    x = CoreTerrain.extractX(tile),
    y = CoreTerrain.extractY(tile),
    z = spriteData.flat
      ? terrain.getHeight(x + 0.5, y + 0.5)
      : View.cornerHeight(terrain, x, y, 2);

  go.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );
}

/**
 * Gives go the picture of what is on tile - a tree from the side it is seen
 * from: its own way round, which it has from where it stands, and as many
 * more as the camera is turned (client/view).
 */
function dress(self, go, spriteData, tile) {
  var renderer = go.renderer,
    turns = (tileTurns(tile) + View.turns()) & 3,
    name = Trees.turned(spriteData.path, turns);

  //what it is, for as long as it stands after the world has let go of it
  //(hold)
  go.scenery = spriteData;

  //from straight above, its foot in the middle of it
  if (View.top()) {
    var top = self.root.sprites.topOf(name);

    renderer.setSprite(top);
    renderer.pivotX = top.pivotX;
    renderer.pivotY = top.pivotY;
    return;
  }

  renderer.setSprite(self.root.sprites.getSprite(name));
  renderer.pivotX = spriteData.pivotX;
  renderer.pivotY = spriteData.pivotY;
}

/**
 * The pictures of the trees and stones there are for which near(x, z)
 * holds - as they are seen now, with View peek from another side - into
 * out, without drawing anything (client/preloader).
 */
EnvMan.prototype.seenSprites = function (out, near, keys) {
  keys = keys || this.sceneryKeys();

  for (var k = 0; k < keys.length; k++) {
    if (this._scenery[keys[k]] === undefined) continue;

    var tile = +keys[k],
      x = CoreTerrain.extractX(tile),
      y = CoreTerrain.extractY(tile),
      spriteData;

    if (!near(x * Config.tileSize, y * Config.tileSize)) continue;
    if ((spriteData = sceneryOf(this, tile)) === null) continue;

    var name = Trees.turned(
      spriteData.path,
      (tileTurns(tile) + View.turns()) & 3,
    );

    out.push(
      View.top()
        ? this.root.sprites.topOf(name)
        : this.root.sprites.getSprite(name),
    );
  }
};

//the tiles with a tree or stones on, for going through a few at a time
EnvMan.prototype.sceneryKeys = function () {
  return Object.keys(this._scenery);
};

function plant(self, tile, spriteData) {
  var go = Pool.borrowObject(self.pool);

  dress(self, go, spriteData, tile);
  place(self, go, tile, spriteData);

  self.root.game.scene.addGameObject(go);

  self._scenery[tile] = go;
  changed();
}

function remove(self, tile) {
  var go = self._scenery[tile];
  if (go !== undefined) {
    delete self._scenery[tile];
    Pool.returnObject(self.pool, go);
    changed();
    self.root.game.scene.removeGameObject(go);
  }
}

function plantAll(self, chunk) {
  var tiles = chunk.tiles();
  var tile, spriteData;
  while (!tiles.done) {
    tile = TileIterator.next(tiles);
    if (
      self._scenery[tile] === undefined &&
      (spriteData = sceneryOf(self, tile)) !== null
    )
      plant(self, tile, spriteData);
  }
}

function removeAll(self, chunk) {
  var tiles = chunk.tiles();
  var tile;

  while (!tiles.done) {
    tile = TileIterator.next(tiles);
    remove(self, tile);
  }
}

function onChunkLoad(sender, chunk, meta) {
  //console.log("EnvMan::onTileLoad", sender, args, meta);
  plantAll(meta, chunk);
}

function onChunkRemove(sender, chunk, meta) {
  //console.log("EnvMan::onTileRemove", sender, args, meta);
  removeAll(meta, chunk);
}

function onSceneryRemove(sender, tile, self) {
  if (!hold(self, tile)) remove(self, tile);
}

/**
 * Keeps what stands on a tile being cleared standing where it is until the
 * bulldozer clearing it gets to it (client/clearworks) - whether it is.
 */
function hold(self, tile) {
  var go = self._scenery[tile],
    works = self.root.clearworks;

  if (go === undefined || !works) return false;

  if (
    !works.hold(
      tile,
      function (push) {
        if (self._held[tile] !== go) return;

        delete self._held[tile];
        //a tree pushed over is drawn going over from here on (client/felling)
        Felling.fell(self.root, go.renderer, push, tile);
        Pool.returnObject(self.pool, go);
        changed();
        self.root.game.scene.removeGameObject(go);
      },
      function (push) {
        //the bulldozer coming up to it: the pictures of it going over ready
        Felling.expect(self.root, go.renderer, push, tile);

        return 0;
      },
    )
  )
    return false;

  delete self._scenery[tile];
  self._held[tile] = go;

  return true;
}

/**
 * The ground under these tiles moved, so their trees and stones are put at
 * its new height - or taken away, where the tile is under water now, or put
 * where they were not.
 *
 * One that stays is moved rather than taken out and put there again: taking
 * one out only happens at the end of the tick, and the pool would hand the
 * same one straight back to be lost with it.
 */
function onGridUpdate(sender, args, self) {
  var tiles = args.tiles,
    tile,
    spriteData,
    go,
    i;

  for (i = 0; i < tiles.length; i++) {
    tile = tiles[i];

    //still standing till the bulldozer gets to it, on the ground as it is
    if (self._held[tile] !== undefined) {
      go = self._held[tile];
      place(self, go, tile, go.scenery);
      continue;
    }

    go = self._scenery[tile];
    spriteData = sceneryOf(self, tile);

    if (go !== undefined) {
      if (spriteData === null) remove(self, tile);
      else {
        dress(self, go, spriteData, tile);
        place(self, go, tile, spriteData);
      }
      //only ever put on a tile that is on screen
    } else if (
      spriteData !== null &&
      self.root.terrain.getTile(tile) !== null
    ) {
      plant(self, tile, spriteData);
    }
  }
}

/**
 * Draws what the world puts on the land by itself, wherever it is on screen:
 * the trees, and the stones.
 */
function EnvMan(root) {
  this.root = root;
  this._scenery = {};
  //what was cleared off a tile, still standing till the bulldozer gets to
  //it (hold), by the tile
  this._held = {};
  this.pool = new Pool(Tree);
}

EnvMan.prototype.init = function () {
  this.core = this.root.core;

  var chunks = this.root.chunkman.getChunks();

  for (var i in chunks) {
    plantAll(this, chunks[i]);
  }

  Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
  Events.on(
    this.root.chunkman,
    Chunkman.events.chunkUnload,
    onChunkRemove,
    this,
  );

  Events.on(
    this.core.envService,
    Core.EnvService.events.sceneryRemove,
    onSceneryRemove,
    this,
  );
  Events.on(
    this.core.terrain,
    Core.Terrain.events.gridUpdate,
    onGridUpdate,
    this,
  );

  //the camera turned: every tree on its corner as seen from the new side
  Events.on(
    View,
    View.events.change,
    function (sender, args, self) {
      for (var tile in self._scenery) {
        var spriteData = sceneryOf(self, +tile);

        dress(self, self._scenery[tile], spriteData, +tile);
        place(self, self._scenery[tile], +tile, spriteData);
      }

      for (tile in self._held) {
        var go = self._held[tile];

        dress(self, go, go.scenery, +tile);
        place(self, go, +tile, go.scenery);
      }
    },
    this,
  );
};

export default EnvMan;
