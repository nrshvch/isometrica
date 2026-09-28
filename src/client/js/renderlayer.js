/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 09.02.14
 * Time: 13:23
 * To change this template use File | Settings | File Templates.
 */
export default {
  groundLayer: 0,
  groundDrawLayer: 1,
  roadLayer: 2,
  vehiclesLayer: 3,
  buildingsLayer: 4,
  //a water tower's reach, over the buildings so a packed block does not
  //bury it - and a clicked building once more over that (see serviceman)
  coverageLayer: 5,
  //the line round the clicked building's tiles, over the reach
  footprintLayer: 6,
  inspectedLayer: 7,
  overlayLayer: 8,
  //what is about to be built - drawn over everything so that nothing
  //already standing, the tile's own trees included, hides it
  previewLayer: 9,
};
