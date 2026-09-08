// events - Subscription
// Extracted verbatim from the pre-existing browserify bundle; AMD simplified
// CommonJS wrapper added so r.js can build it. Do not reformat the body.
define(function (require, exports, module) {

function Subscription(token, handler, data, once){
    this.handler = handler;
    this.data = data;
    this.once = once || false;
    this.token = token;
}

Subscription.prototype.token = -1;
Subscription.prototype.handler = null;
Subscription.prototype.data = null;
Subscription.prototype.once = null;

module.exports = Subscription;

});
