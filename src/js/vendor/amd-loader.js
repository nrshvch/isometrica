/**
 * The packages under vendor/ (engine, events, reactive-property) are frozen
 * build artifacts: each is a single file of old-style AMD `define()` calls
 * produced by r.js, kept exactly as committed (see vendor/build.js). This
 * module is the only place that understands that format - it is a tiny
 * synchronous AMD registry that evaluates those artifacts and lets the rest
 * of the src pull named modules out of them as plain values, without pulling
 * in a real AMD loader.
 *
 * Everything is synchronous: the artifacts are inlined as strings via Vite's
 * `?raw` import, so "loading" them is just running already-available source,
 * and `define()` only registers a module - it doesn't evaluate the factory
 * until something actually requires that id. So evaluation order between
 * `evalBundle()` calls below does not matter, only that it happens before
 * `amd()` is called for an id that lives in that bundle.
 */
import engineSrc from "../../../vendor/engine/dist/engine.js?raw";
import eventsSrc from "../../../vendor/events/dist/events.js?raw";
import reactivePropertySrc from "../../../vendor/reactive-property/dist/reactive-property.js?raw";

import * as glMatrix from "gl-matrix";
import SimplexNoise from "simplex-noise";
import namespace from "../../shared/namespace.js";

var registry = new Map();
var cache = new Map();

function amdDefine(id, deps, factory) {
    if (typeof deps === "function") {
        factory = deps;
        deps = [];
    }
    registry.set(id, {deps: deps, factory: factory});
}

function resolveId(id, baseId) {
    if (id.charAt(0) !== ".") return id;

    var baseParts = baseId.split("/");
    baseParts.pop();

    id.split("/").forEach(function (part) {
        if (part === ".") return;
        if (part === "..") baseParts.pop();
        else baseParts.push(part);
    });

    return baseParts.join("/");
}

function amdRequire(id, baseId) {
    var resolved = resolveId(id, baseId || "");

    if (cache.has(resolved)) return cache.get(resolved);

    var entry = registry.get(resolved);
    if (!entry) throw new Error('AMD module "' + resolved + '" not found (required from "' + baseId + '")');

    var mod = {exports: {}};
    cache.set(resolved, mod.exports); // supports circular requires, same as CommonJS

    var localRequire = function (depId) {
        return amdRequire(depId, resolved);
    };

    var args = entry.deps.map(function (dep) {
        if (dep === "require") return localRequire;
        if (dep === "exports") return mod.exports;
        if (dep === "module") return mod;
        return amdRequire(dep, resolved);
    });

    var result = entry.factory.apply(null, args);
    var value = result === undefined ? mod.exports : result;
    cache.set(resolved, value);
    return value;
}

function evalBundle(src) {
    new Function("define", src)(amdDefine);
}

// npm packages and the src's own shared modules the artifacts reach for as
// externals (see vendor/build.js) - predefining them lets the artifacts' own
// `require("gl-matrix")` / `require("namespace")` etc. resolve without us
// re-implementing module resolution for real ES modules.
cache.set("gl-matrix", glMatrix);
cache.set("simplex-noise", SimplexNoise);
cache.set("namespace", namespace);

evalBundle(eventsSrc);
evalBundle(reactivePropertySrc);
evalBundle(engineSrc);

// The old RequireJS src config mapped the bare id "events" (used internally
// by engine/*, not just src code) to src/js/events-wrapper.js rather than the
// raw vendor package, because different eras of this codebase used different
// event APIs. Registering the same wrapper here, under "events", keeps that
// resolution working for the vendor artifacts without a circular import
// between this file and events-wrapper.js.
var RawEvents = amdRequire("events/main");

function EventEmmiter() {
}

EventEmmiter.event = RawEvents.event;
EventEmmiter.EventEmmiter = EventEmmiter;
EventEmmiter.addListener = EventEmmiter.on = RawEvents.on;
EventEmmiter.once = RawEvents.once;
EventEmmiter.removeListener = EventEmmiter.off = RawEvents.off;
EventEmmiter.emit = EventEmmiter.fire = RawEvents.fire;
/** @deprecated */
EventEmmiter.subscribe = RawEvents.on;
/** @deprecated */
EventEmmiter.unsubscribe = RawEvents.off;

EventEmmiter.prototype.addEventListener = EventEmmiter.prototype.addListener = function (event, listener, meta) {
    return RawEvents.on(this, event, listener, meta);
};

EventEmmiter.prototype.removeEventListener = EventEmmiter.prototype.removeListener = function (event, listenerOrId) {
    return RawEvents.off(this, event, listenerOrId);
};

EventEmmiter.prototype.dispatchEvent = EventEmmiter.prototype.emit = function (event, args) {
    return RawEvents.fire(this, event, args);
};

EventEmmiter.prototype.once = function (event, listener, meta) {
    return RawEvents.on(this, event, listener, meta, true);
};

window.Events = EventEmmiter;
cache.set("events", EventEmmiter);

export function amd(id) {
    return amdRequire(id);
}
