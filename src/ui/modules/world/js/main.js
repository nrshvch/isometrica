import WorldScreenView from "./views/worldscreenview";
import Controls from "./worldaction";
import ReactiveProperty from "reactive-property";

function WorldScreen(ui, client) {
    this.ui = ui;

    //true while an action (build, destroy, buy land...) holds the buttons,
    //so world decorations know to stay out of the way
    this.busy = ReactiveProperty(false);

    this.view = new WorldScreenView({
        controller: this
    });
    this.client = client;
    this.init(client);

    window.worldScreen = this;
}

WorldScreen.prototype.view = null;

WorldScreen.prototype.init = function (client) {
    var cnv = this.view.getCanvas();
    var cam = client.camera;
    var viewport = client.game.graphics.createViewport(cnv);
    viewport.setCamera(cam);
    this.viewport = viewport;
};

WorldScreen.prototype.updateSize = function () {
    var cnv = this.view.getCanvas();
    this.viewport.setSize(cnv.offsetWidth, cnv.offsetHeight);
};

WorldScreen.prototype.show = function (name) {
    this.busy(false);

    switch (name) {
        case "build":
            this.view.showBuildButtons();
            break;
        default:
            if (this.client.core.cities.getCity(0))
                this.view.showBuildButtons();
            else
                this.view.showInitialButtons();
    }
};

WorldScreen.prototype.showControls = function (controls) {
    if (controls === undefined)
        controls = new Controls();

    this.view.showActionButtons(controls);
    this.busy(true);

    return controls;
};



/**
 * Asks whether the player really means to leave this city behind, and starts
 * a new blank one under a new id if they do. The city they are on is kept -
 * it stays in storage under its own address.
 */
WorldScreen.prototype.startFresh = function () {
    var self = this;

    this.showHint("Do you really want to start fresh?");

    var controls = this.showControls();
    controls.canRotate(false);

    controls.onSubmit = function () {
        self.hideHint();
        self.ui.startFreshCity();
    };

    controls.onDiscard = function () {
        self.hideHint();
        self.show();
    };

    return controls;
};

WorldScreen.prototype.showHint = function(text){
    this.view.hint(text);
};

WorldScreen.prototype.hideHint = function(){
    this.view.hint("");
};

export default WorldScreen;
