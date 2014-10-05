define(function(require){
    var View = require("./views/topbarview");

    function TopBar(ui){
      this.ui = ui;
      this.view = new View({
        options: this
      });
    }

    TopBar.prototype.view = null;

    return TopBar;
});
