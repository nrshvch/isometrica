define(function (require) {
    var lastId = 0;

    function Node() {
        this.nodeId = lastId++;
        this.connectedNodes = [];
    }

    Node.prototype.nodeId = null;
    Node.prototype.graph = null;
    Node.prototype.cost = 1;
    Node.prototype.connectedNodes = null;

    Node.prototype.getConnectableNodes = function () {
        throw "Not implemented";
    };

    Node.prototype.connect = function (node) {
        if (this.connectedNodes.indexOf(node) === -1) {
            this.connectedNodes.push(node);
            return this;
        }
        return false;
    };

    Node.prototype.disconnect = function (node) {

        var index = this.connectedNodes.indexOf(node);
        if (index !== -1) {
            this.connectedNodes.splice(index, 1);
        }
    };

    Node.prototype.addTo = function (graph) {
        this.graph = graph;

        var cNodes = this.getConnectableNodes();
        for (var i = 0; i < cNodes.length; i++) {
            var cNode = cNodes[i].connect(this);
            if (cNode !== false)
                this.connect(cNode);
        }
    };

    Node.prototype.remove = function () {
        var cnodes = this.connectedNodes.slice(0), //copy it because loop will modify it
            cnlen = cnodes.length,
            cnode;

        for (var i = 0; i < cnlen; i++) {
            cnode = cnodes[i];
            cnode.disconnect(this);
            this.disconnect(cnode);
        }
    };

    Node.prototype.toString = function(){
        return "Node #"+this.nodeId;
    };

    return Node;
});