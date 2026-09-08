/**
 * This class is a wrapper for Image, Audio, Blob objects.
 * It allows to download blob,image,audio,json or text files using xhr, and use progress events of xhr requests.
 */
define(function (require) {
    var EventManager = require("events");

    function Resource(path, type) {
        EventManager.call(this);

        this.state = ResourceStateEnum.none;
        this.type = type || ResourceTypeEnum.blob;
        this.path = path;
        this.data = null;

        var self = this;
        this.onProgress = function (e) {
            self.dispatchEvent(self.events.progress, e);
        };

        //this will be called once ajax/xhr loading will be finished
        this.onLoad = function (xhr) {
            var data,
                xhr = xhr.target;

            if (xhr.status === 200) {
                if (self.type === ResourceTypeEnum.image) {
                    data = new Image();
                    data.addEventListener("load", function () {
                        self.data = data;
                        self.state = ResourceStateEnum.ready;
                        self.dispatchEvent(self.events.done, self);
                    });
                    data.src = self.path;
                    return;
                } else if (self.type === ResourceTypeEnum.audio) {
                    data = new Audio();
                    data.addEventListener("canplaythrough", function () {
                        self.data = data;
                        self.state = ResourceStateEnum.ready;
                        self.dispatchEvent(self.events.done, self);
                    });
                    data.setAttribute('src', self.path);
                    return;
                } else if (self.type === ResourceTypeEnum.blob) {
                    data = xhr.response;
                } else if (self.type === ResourceTypeEnum.json) {
                    data = JSON.parse(xhr.response);
                } else if (self.type === ResourceTypeEnum.text) {
                    data = xhr.response
                }

                self.data = data;
                self.state = ResourceStateEnum.ready;
                self.dispatchEvent(self.events.done, self);

            }else{
                self.data = data;
                self.state = ResourceStateEnum.failed;
                self.dispatchEvent(self.events.done, self);
            }
        };

        this.load();
    }

    var ResourceTypeEnum = {
        blob: 0,
        image: 1,
        audio: 2,
        json: 3,
        text: 4
    };

    var ResourceStateEnum = {
        none: 0,
        loading: 1,
        ready: 2,
        failed: 3
    };

    Resource.prototype = Object.create(EventManager.prototype);

    Resource.prototype.constructor = Resource;

    Resource.prototype.events = {
        "done": 0,
        "progress": 1
    };

    Resource.prototype.done = function (callback) {
        if (this.state === ResourceStateEnum.ready)
            callback(this);
        else if (this.state === ResourceStateEnum.loading || this.state === ResourceStateEnum.none)
            this.addEventListener(this.events.done, callback);

        return this;
    };

    Resource.prototype.progress = function (callback) {
        if (this.state === ResourceStateEnum.loading || this.state === ResourceStateEnum.none)
            this.addEventListener(this.events.progress, callback);

        return this;
    };


    Resource.prototype.load = function () {
        //Don't load if it is already loaded
        if (this.state === ResourceStateEnum.loading ||
            this.state === ResourceStateEnum.ready) return;

        this.state = ResourceStateEnum.loading;

        var xhr = new XMLHttpRequest();

        xhr.open("GET", this.path, true);

        //we'll parse json by ourself, so return text please.
        xhr.responseType = this.type === ResourceTypeEnum.json || this.type === ResourceTypeEnum.text ? "text" : "blob";

        //if progress callback was provided, then register it to XHR progress event
        xhr.addEventListener('progress', this.onProgress);
        xhr.addEventListener('load', this.onLoad);

        xhr.send();

        return xhr;
    };

    Resource.ResourceTypeEnum = ResourceTypeEnum;
    Resource.ResourceStateEnum = ResourceStateEnum;

    return Resource;
});