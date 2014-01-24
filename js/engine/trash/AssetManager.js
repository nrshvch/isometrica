/**
 * This class represents interface for managing binary resources like images and audio, or any other type as blob.
 * Main goal of asset manager is to avoid binary data duplication in memory by caching and returning requested resources.
 * If resource is not cached, then is should be loaded, put in cache and reference of resource should be passed into callback function.
 * If resource is cached, onsuccess callback should be called immediately and passed a cached resource.
 * Each resource is identified by its path relatively to web application root.
 *
 * Because memory amount is limited asset manager should provide interface to load only currently needed resources
 * and release unneeded. It is upon programmer to decide whenever to release resources and which resources to load.
 */

//TODO make callbacks for 404 cases.
//TODO add text type.
//TODO Basically this class should provide API for loading files from server, with usage similar to Unity3D Resource class.
define(function () {
        function AssetManager() {
            this.assets = {};
            this.callbacks = {};
        }

        AssetManager.returnTypeEnum = {
            blob: 0,
            image: 1,
            audio: 2,
            json: 3
        };

        AssetManager.prototype.assets = {};

        /**
         * If assets is loaded then function will immediatelly call onsuccess callback
         * If assets is not loaded it will start loading it
         * If assets is not loaded but is already loading, then given callback will be called once loading finishes.
         * @public
         * @param {string} name resource identifier
         * @param {function} onsuccess callback
         * @param {function} onprogress callback
         */
        AssetManager.prototype.getAsset = function (name, onsuccess, onprogress, returnType) {
            if (this.assets[name] !== undefined) { //if resource is cached or is loading
                if (this.assets[name] !== "loading") { //if is cached
                    onsuccess(this.assets[name]);
                } else { //if is loading
                    this.callbacks[name].push({ //put it in queue, and once loading finished, callback will be called.
                        onsuccess: onsuccess,
                        onprogress: onprogress
                    });
                }
            } else {
                this.assets[name] = "loading"; //put flag to let other know that resource is already loading, so they don't initiate duplicate loading process.
                this.callbacks[name] = [
                    {
                        onsuccess: onsuccess,
                        onprogress: onprogress
                    }
                ];
                var assetManager = this;
                this.loadAsset(name, function (obj) {
                    for (var i = 0; i < assetManager.callbacks[name].length; i++) {
                        if (assetManager.callbacks[name][i].onsuccess)
                            assetManager.callbacks[name][i].onsuccess(obj);
                    }
                }, function (e) {
                    for (var i = 0; i < assetManager.callbacks[name].length; i++) {
                        if (assetManager.callbacks[name][i].onprogress)
                            assetManager.callbacks[name][i].onprogress(e);
                    }
                }, returnType);
            }
        };

        /**
         * @public
         * @param name
         */
        AssetManager.prototype.releaseAsset = function (name) {
            if (this.assets[name] !== undefined)
                delete this.assets[name];
        }

        /**
         * Handles the actual loading of the resource.
         * Loading is done using ajax/XHR.
         * XHR2 features are used, to detect loading progress and type of binary resource.
         * For image & audio type, Image or Audio objects, should be passed to onsuccess callback,
         * otherwise pass bare Blob object.
         *
         * @private
         * @param {string} name resource identifier
         * @param {function} onsuccess callback
         * @param {function} [onprogress] optional progress callback
         * @returns {XMLHttpRequest}
         */
        AssetManager.prototype.loadAsset = function (name, onsuccess, onprogress, returnType) {
            var assetManager = this,
                xhr = new XMLHttpRequest();

            xhr.open("GET", name, true);
            xhr.responseType = returnType === AssetManager.returnTypeEnum.json ? "text" : "blob";

            //if progress callback was provided, then register it to XHR progress event
            if (onprogress) xhr.addEventListener('progress', onprogress);

            //this will be called once ajax/xhr loading will be finished

            xhr.addEventListener('load', function (e) {
                if (returnType === AssetManager.returnTypeEnum.image) {
                    var img = assetManager.assets[name] = new Image();
                    img.addEventListener('load', function () {
                        onsuccess(img);
                    });
                    img.src = name;
                } else if (returnType === AssetManager.returnTypeEnum.audio) {
                    var audio = assetManager.assets[name] = new Audio();
                    audio.addEventListener('load', function () {
                        onsuccess(audio);
                    });
                    audio.src = name;
                } else if (returnType === AssetManager.returnTypeEnum.blob || returnType === undefined) {
                    onsuccess(assetManager.assets[name] = xhr.response);
                } else if (returnType === AssetManager.returnTypeEnum.json) {
                    onsuccess(assetManager.assets[name] = JSON.parse(xhr.response));
                }
            });

            xhr.send();

            return xhr;
        };

        /**
         * All this does is loading multiple resources at once and firing onprogress event with overall progress info
         * @public
         * @param {[]} batch array of resource identifiers
         * @param onsuccess
         * @param onprogress
         */
        AssetManager.prototype.loadBatch = function (batch, onsuccess, onprogress, returnType) {
            var overallProgress = 0,
                loadedAssets = [],
                batchLength = batch.length,
                i, name;

            for (var i = 0; i < batchLength; i++) {
                name = batch[i];
                this.loadAsset(
                    name,
                    function (asset) {
                        loadedAssets.push(asset);
                        if (loadedAssets.length === batchLength) {
                            onsuccess(loadedAssets);
                        }
                    },
                    function (progress) {
                        var xhr = progress.target,
                            np = progress.loaded / progress.total;

                        overallProgress += (np - (xhr.progress || 0)) / batchLength;
                        xhr.progress = np;

                        onprogress(overallProgress);
                    },
                    returnType);
            }
        }

        var mgr = new AssetManager();                    //to lazy to convert methods to static
        mgr.returnTypeEnum = AssetManager.returnTypeEnum;

        return mgr;
    }
)
;
