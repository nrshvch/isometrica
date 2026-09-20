/**
 * The city a brand new player starts on.
 *
 * It is a save like any other, and it is opened the way a save is: under a
 * fresh id of its own, so the moment the player changes anything it becomes
 * their own city in their own storage row, leaving this one untouched.
 *
 * To fill it in, take one of your own saves out of localStorage - the row
 * named "isometrica.city.<id>", see Core.CityStore - and paste its contents
 * here. The "id" and "savedAt" fields of the pasted save are ignored.
 *
 * null means there is nothing to start from: the game opens on a blank world
 * and the player founds their city themselves.
 *
 * @type {Object|null}
 */
var InitialCity = {"version":1,"id":"apX3ya","savedAt":1789902371417,"time":14256000000,"city":{"name":"Miniville","tile":1448171087,"resources":{"money":1390,"stone":218,"wood":292,"food":353,"water":558,"iron":117,"electricity":-20},"population":37.39782893447683,"area":[[0,0],[-1,0]],"research":{"0":0,"1":0,"2":0,"3":0},"clearedTiles":[],"buildings":[{"code":3,"tile":1448171087,"rotation":0},{"code":"10","tile":1448171088,"rotation":0},{"code":4,"tile":1448105546,"rotation":0},{"code":4,"tile":1448105547,"rotation":0},{"code":4,"tile":1448105548,"rotation":0},{"code":4,"tile":1448105549,"rotation":0},{"code":4,"tile":1448105550,"rotation":0},{"code":4,"tile":1448105551,"rotation":0},{"code":4,"tile":1448105552,"rotation":0},{"code":4,"tile":1448105553,"rotation":0},{"code":4,"tile":1448105554,"rotation":0},{"code":4,"tile":1448105555,"rotation":0},{"code":4,"tile":1447908942,"rotation":0},{"code":4,"tile":1447974478,"rotation":0},{"code":4,"tile":1448040014,"rotation":0},{"code":4,"tile":1448171086,"rotation":0},{"code":4,"tile":1448236622,"rotation":0},{"code":4,"tile":1448302158,"rotation":0},{"code":"16","tile":1448040013,"rotation":0},{"code":"19","tile":1448171085,"rotation":0},{"code":"19","tile":1448171089,"rotation":0},{"code":"17","tile":1448040015,"rotation":true},{"code":"17","tile":1448171083,"rotation":true},{"code":"17","tile":1448236623,"rotation":0},{"code":"15","tile":1448040012,"rotation":0},{"code":"16","tile":1448040011,"rotation":0},{"code":"15","tile":1448040010,"rotation":true},{"code":"16","tile":1448171081,"rotation":0},{"code":"16","tile":1448171082,"rotation":0},{"code":4,"tile":1448105542,"rotation":0},{"code":4,"tile":1448105543,"rotation":0},{"code":4,"tile":1448105544,"rotation":0},{"code":4,"tile":1448105545,"rotation":0},{"code":"19","tile":1448171080,"rotation":0},{"code":"18","tile":1448040008,"rotation":0},{"code":4,"tile":1447974471,"rotation":0},{"code":4,"tile":1448040007,"rotation":0},{"code":4,"tile":1448171079,"rotation":0},{"code":4,"tile":1448236615,"rotation":0}]}};

export default InitialCity;
