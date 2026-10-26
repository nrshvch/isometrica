/**
 * How long the parts of a frame take, and how many of things there are in
 * it - for a debug panel to show (city-sim DebugPanel). Off until it is asked
 * for (enable): while it is off, begin, end and the rest return straight
 * away, and nothing else is done.
 *
 * Everything is kept in typed arrays made once: what each section took this
 * frame and how often it ran, and the same for each of the last RING frames,
 * so that the average and the worst of them can be shown without anything
 * being allocated a frame. Sections, counters and tickers are registered by
 * name once and used by the number they are given.
 *
 * Only the script is timed - performance.now() round what runs on the page.
 * What the GPU does with what it is handed happens later and elsewhere, and
 * is not in any of it; where the browser can time the GPU, whoever draws
 * keeps that as counters (isometrica client/glview).
 */
define(function (require) {
    var namespace = require("namespace");

    //sections, counters and tickers there can be, each; and the frames kept
    var MAX = 128,
        RING = 60;

    //what a counter is: counted up over a frame and back to nothing for the
    //next, or a gauge, set now and then and the same until it is set again
    var COUNT = 0,
        GAUGE = 1;

    var on = false,
        //whether the world's tickers are timed one by one, by name (World tick)
        perTicker = false,

        sectionNames = [],
        sectionIds = new Map(),
        started = new Float64Array(MAX).fill(-1),
        ms = new Float64Array(MAX),
        calls = new Int32Array(MAX),
        ringMs = new Float64Array(MAX * RING),
        ringCalls = new Int32Array(MAX * RING),
        //the last time a section ran at all, and what it took that frame - for
        //what runs now and then, not every frame (a pick, the city's tick)
        lastMs = new Float64Array(MAX),

        counterNames = [],
        counterIds = new Map(),
        counterKinds = new Uint8Array(MAX),
        counts = new Float64Array(MAX),
        ringCounts = new Float64Array(MAX * RING),

        tickerNames = [],
        tickerIds = new Map(),
        tickerMs = new Float64Array(MAX),
        tickerCalls = new Int32Array(MAX),
        ringTickerMs = new Float64Array(MAX * RING),
        ringTickerCalls = new Int32Array(MAX * RING),

        //how long between one frame and the next, ms, and how much was
        //allocated in it, bytes - where the browser says (performance.memory)
        ringInterval = new Float64Array(RING),
        ringAlloc = new Float64Array(RING),
        ringDrops = new Uint8Array(RING),
        lastFrame = -1,
        lastHeap = -1,
        heapNow = -1,

        //the slot of the frame going on, and how many of them are kept so far
        slot = 0,
        filled = 0;

    function register(name, names, ids) {
        var id = ids.get(name);

        if (id !== undefined)
            return id;

        id = names.length;
        if (id >= MAX)
            return MAX - 1;

        names.push(name);
        ids.set(name, id);

        return id;
    }

    /**
     * The number a section goes by, registered as it is first asked for.
     * @param {string} name
     * @returns {number}
     */
    function section(name) {
        return register(name, sectionNames, sectionIds);
    }

    /**
     * The number a counter goes by - a gauge, if gauge.
     * @param {string} name
     * @param {boolean} [gauge] set now and then, and kept until set again,
     *        rather than counted up a frame
     * @returns {number}
     */
    function counter(name, gauge) {
        var id = register(name, counterNames, counterIds);

        counterKinds[id] = gauge === true ? GAUGE : COUNT;

        return id;
    }

    function begin(id) {
        if (on)
            started[id] = performance.now();
    }

    function end(id) {
        if (!on || started[id] < 0)
            return;

        ms[id] += performance.now() - started[id];
        calls[id]++;
        started[id] = -1;
    }

    //a section timed some other way, so many ms of it
    function add(id, took) {
        if (!on)
            return;

        ms[id] += took;
        calls[id]++;
    }

    function count(id, n) {
        if (on)
            counts[id] += n;
    }

    //set whether it is on or not: a gauge set before it was turned on is
    //still what it is
    function gauge(id, value) {
        counts[id] = value;
    }

    /**
     * A ticker of the world that took so long this frame, by name (World
     * tick, while perTicker).
     */
    function ticked(name, took) {
        var id = tickerIds.get(name);

        if (id === undefined)
            id = register(name, tickerNames, tickerIds);

        tickerMs[id] += took;
        tickerCalls[id]++;
    }

    /**
     * The frame is over: what it took goes into its slot, and the next one
     * starts from nothing. Called once a frame, after it is drawn (engine
     * Game tick).
     */
    function frame() {
        var now, o, i, heap;

        if (!on)
            return;

        now = performance.now();
        o = slot * MAX;

        for (i = 0; i < sectionNames.length; i++) {
            ringMs[o + i] = ms[i];
            ringCalls[o + i] = calls[i];
            if (calls[i] > 0)
                lastMs[i] = ms[i];
            ms[i] = 0;
            calls[i] = 0;
        }

        for (i = 0; i < counterNames.length; i++) {
            ringCounts[o + i] = counts[i];
            if (counterKinds[i] === COUNT)
                counts[i] = 0;
        }

        for (i = 0; i < tickerNames.length; i++) {
            ringTickerMs[o + i] = tickerMs[i];
            ringTickerCalls[o + i] = tickerCalls[i];
            tickerMs[i] = 0;
            tickerCalls[i] = 0;
        }

        ringInterval[slot] = lastFrame < 0 ? 0 : now - lastFrame;
        lastFrame = now;

        //what was allocated: what the heap grew by - a drop is the garbage
        //collected, what was allocated meanwhile not known
        heap = performance.memory ? performance.memory.usedJSHeapSize : -1;
        ringAlloc[slot] = lastHeap >= 0 && heap > lastHeap ? heap - lastHeap : 0;
        ringDrops[slot] = lastHeap >= 0 && heap < lastHeap ? 1 : 0;
        lastHeap = heap;
        heapNow = heap;

        slot = (slot + 1) % RING;
        if (filled < RING)
            filled++;
    }

    //everything kept forgotten, from the next frame on
    function reset() {
        ms.fill(0);
        calls.fill(0);
        started.fill(-1);
        ringMs.fill(0);
        ringCalls.fill(0);
        lastMs.fill(0);
        ringCounts.fill(0);
        tickerMs.fill(0);
        tickerCalls.fill(0);
        ringTickerMs.fill(0);
        ringTickerCalls.fill(0);
        ringInterval.fill(0);
        ringAlloc.fill(0);
        ringDrops.fill(0);
        lastFrame = -1;
        lastHeap = -1;
        slot = 0;
        filled = 0;

        for (var i = 0; i < counterNames.length; i++)
            if (counterKinds[i] === COUNT)
                counts[i] = 0;
    }

    /**
     * Starts or stops keeping it all - and the tickers one by one, if
     * tickers. Started again, it starts from nothing.
     */
    function enable(yes, tickers) {
        yes = yes === true;

        if (yes && !on)
            reset();

        on = yes;
        perTicker = yes && tickers === true;
    }

    function enabled() {
        return on;
    }

    //whether the world's tickers are to be timed one by one (World tick)
    function timingTickers() {
        return perTicker;
    }

    //the average, the most and the latest of n values from ring at id, MAX
    //apart, the frames kept
    function over(ring, id, stride) {
        var sum = 0,
            most = 0,
            i, v;

        for (i = 0; i < filled; i++) {
            v = ring[i * stride + id];
            sum += v;
            if (v > most)
                most = v;
        }

        return {avg: filled > 0 ? sum / filled : 0, max: most};
    }

    /**
     * Everything kept, as it is over the frames kept: for the panel, which
     * asks a few times a second - this allocates, frame() does not.
     *
     * @returns {Object} {on, frames, fps, interval: {avg, max}, sections:
     *          [{name, avg, max, last, calls}], counters: [{name, avg, max,
     *          last}], tickers: [{name, avg, max, calls}], heap: {used,
     *          alloc, drops} or null} - ms a frame, but for alloc: bytes a
     *          second
     */
    function snapshot() {
        var out = {
                on: on,
                frames: filled,
                fps: 0,
                interval: over(ringInterval, 0, 1),
                sections: [],
                counters: [],
                tickers: [],
                heap: null
            },
            seconds = 0,
            last = (slot + RING - 1) % RING,
            alloc = 0,
            drops = 0,
            i, s;

        for (i = 0; i < filled; i++) {
            seconds += ringInterval[i];
            alloc += ringAlloc[i];
            drops += ringDrops[i];
        }

        seconds /= 1000;
        out.fps = seconds > 0 ? filled / seconds : 0;

        for (i = 0; i < sectionNames.length; i++) {
            s = over(ringMs, i, MAX);
            s.name = sectionNames[i];
            s.last = lastMs[i];
            s.calls = over(ringCalls, i, MAX).avg;
            out.sections.push(s);
        }

        for (i = 0; i < counterNames.length; i++) {
            s = over(ringCounts, i, MAX);
            s.name = counterNames[i];
            s.last = filled > 0 ? ringCounts[last * MAX + i] : 0;
            out.counters.push(s);
        }

        for (i = 0; i < tickerNames.length; i++) {
            s = over(ringTickerMs, i, MAX);
            s.name = tickerNames[i];
            s.calls = over(ringTickerCalls, i, MAX).avg;
            out.tickers.push(s);
        }

        if (heapNow >= 0)
            out.heap = {
                used: heapNow,
                alloc: seconds > 0 ? alloc / seconds : 0,
                drops: drops
            };

        return out;
    }

    var Stats = {
        RING: RING,
        section: section,
        counter: counter,
        begin: begin,
        end: end,
        add: add,
        count: count,
        gauge: gauge,
        ticked: ticked,
        frame: frame,
        enable: enable,
        enabled: enabled,
        timingTickers: timingTickers,
        snapshot: snapshot
    };

    namespace("Isometrica.Engine").Stats = Stats;

    return Stats;
});
