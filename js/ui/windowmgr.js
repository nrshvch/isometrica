define(function (require) {
    var WindowView = require("ui/windowview");

    function WindowMgr(ui, rootElement){
        this.ui = ui;
        this.rootElement = rootElement;
    }

    WindowMgr.prototype.createWindow = function(view, width, height){
        var win = new WindowView();
        win.mgr = this;
        win.show(view);
        this.rootElement.appendChild(win.el);
        win.setPosition(
            (this.rootElement.getBoundingClientRect().width - win.el.getBoundingClientRect().width) * Math.random(),
            (this.rootElement.getBoundingClientRect().height - win.el.getBoundingClientRect().height) * Math.random()
        );
        win.setSize(width, height);
        this.focus(win);
        return win;
    };

    WindowMgr.prototype.focus = function(windowView){
        $(".windowView", this.rootElement).attr("active", false);
        windowView.$el.attr("active", true);
    };

    WindowMgr.prototype.close = function(windowView){
        windowView.el.style.display = "none";
    };

    return WindowMgr;
});