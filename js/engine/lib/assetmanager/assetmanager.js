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
define(function (require) {
        var namespace = require("namespace");
        var Resource = require("./resource");

        namespace("Isometrica.Engine").AssetManager = AssetManager;

        function AssetManager() {
            this.assets = {};
        }

        AssetManager.prototype.assets = null;

        AssetManager.prototype.getAsset = function (path, type) {
            if (this.assets[path] !== undefined)
                return this.assets[path];
            else if(type === Resource.ResourceTypeEnum.audio)
                return new AssetManager.Resource(path, type);
            else
                return this.assets[path] = new AssetManager.Resource(path, type);

        };

        AssetManager.prototype.releaseAsset = function (path) {
            if (this.assets[path] !== undefined)
                delete this.assets[path];
        };

        AssetManager.Resource = Resource;

        return AssetManager;
    }
);

