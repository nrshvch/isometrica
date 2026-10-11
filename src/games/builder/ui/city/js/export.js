/**
 * The city as data/initialcity.js - the city every new player of either game
 * starts on, the delivery game's streets among it: written out from the city
 * being built, to be saved over src/data/initialcity.js.
 */

//what the file says about itself - kept in step with data/initialcity
var HEADER = [
  "/**",
  " * The city a brand new player starts on - in the city builder, and in the",
  " * delivery game, whose streets it is.",
  " *",
  " * It is a save like any other, and it is opened the way a save is: under a",
  " * fresh id of its own, so the moment the player changes anything it becomes",
  " * their own city in their own storage row, leaving this one untouched.",
  " *",
  " * To fill it in, build the city in the city builder and download it from",
  ' * the city screen ("Download as the initial city"), then save the file over',
  ' * this one. The "id" and "savedAt" fields are ignored.',
  " *",
  " * null means there is nothing to start from: the game opens on a blank world",
  " * and the player founds their city themselves.",
  " *",
  " * @type {Object|null}",
  " */",
].join("\n");

/**
 * The text of data/initialcity.js for a city, as the save of it reads
 * (core/persistence CityPersistence#snapshot).
 */
export function initialCityFile(save) {
  return (
    HEADER +
    "\nvar InitialCity = " +
    JSON.stringify(save, null, 2) +
    ";\nexport default InitialCity;\n"
  );
}

/**
 * Hands the player a file to keep, as a download.
 */
export function download(name, text) {
  var blob = new Blob([text], { type: "text/javascript" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");

  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}
