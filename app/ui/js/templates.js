define(['handlebars'], function(Handlebars) {

this["Templates"] = this["Templates"] || {};

this["Templates"]["catalogue/building"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"building-view ui-window\">\n    <div class=\"row\">\n        <div class=\"cell flex\">\n            <div class=\"body ui-block\">\n                <div class=\"eye\">\n                    <div class=\"img\" style=\"background-image: url(ui/img/buildings/"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.building)),stack1 == null || stack1 === false ? stack1 : stack1.code)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ".png)\"></div>\n                </div>\n                <div class=\"params\">\n                    Name: <div>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.building)),stack1 == null || stack1 === false ? stack1 : stack1.displayName)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n                </div>\n                <div class=\"info\">\n                    "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.building)),stack1 == null || stack1 === false ? stack1 : stack1.description)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"buttons count-2\">\n                <a href=\"javascript:window.history.back();\" class=\"button ui-button\">\n                    <img class=\"icon back-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Return</div>\n                </a>\n                <a href=\"#build/"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.building)),stack1 == null || stack1 === false ? stack1 : stack1.code)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"button ui-button\">\n                    <img class=\"icon bulldozer-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Build</div>\n                </a>\n            </div>\n        </div>\n    </div>\n\n</div>";
  return buffer;
  });

this["Templates"]["catalogue/buildings"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n                    <div class=\"item\">\n                        <div class=\"name\">";
  if (helper = helpers.displayName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.displayName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</div>\n                        <div class=\"img-space\">\n                            <div class=\"space\">\n                                <div class=\"img\" style=\"background-image: url('ui/img/buildings/";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + ".png');\"></div>\n                            </div>\n                        </div>\n                        <div class=\"buttons\">\n                            <a href=\"#build/";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"build\">Build</a>\n                            <a data-building=\"";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"  class=\"info\">Info</a>\n                        </div>\n                    </div>\n                ";
  return buffer;
  }

  buffer += "<div class=\"building-list-view ui-list-window\">\n    <div class=\"row body\">\n        <div class=\"cell\">\n            <div class=\"body\">\n                ";
  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.buildings) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.buildings); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.buildings) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"buttons count-2\">\n                <a href=\"javascript:window.history.back();\" class=\"button ui-button\">\n                    <img class=\"icon back-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Return</div>\n                </a>\n                <a href=\"javascript:void(0);\" class=\"button ui-button\">\n                    <img class=\"icon coin-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Close</div>\n                </a>\n            </div>\n        </div>\n    </div>\n\n</div>";
  return buffer;
  });

this["Templates"]["catalogue/categories"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n                    <div class=\"item ui-block\">\n                        <a data-category=\"";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"body\">\n                            <div class=\"cat-image\">\n                                <div class=\"cat-img\" style=\"background-image: url(ui/img/categories/";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + ".png)\"></div>\n                            </div>\n                            <div class=\"cat-name\">\n                                ";
  if (helper = helpers.displayName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.displayName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n                            </div>\n                        </a>\n                    </div>\n                ";
  return buffer;
  }

  buffer += "<div class=\"building-cats ui-list-window\">\n    <div class=\"row body\">\n        <div class=\"cell\">\n            <div class=\"body items\">\n                ";
  stack1 = ((stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"buttons count-2\">\n                <a href=\"javascript:window.history.back();\" class=\"button ui-button\">\n                    <img class=\"icon back-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Return</div>\n                </a>\n                <a href=\"javascript:void(0)\" class=\"button ui-button\">\n                    <img class=\"icon coin-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Close</div>\n                </a>\n            </div>\n        </div>\n    </div>\n</div>";
  return buffer;
  });

this["Templates"]["city/city"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                        <div class=\"tab\" data-tab=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n                    ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n                    <div class=\"tab-content\" data-tab=\""
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n                    </div>\n                ";
  return buffer;
  }

  buffer += "<div class=\"city-view ui-window\">\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"tabs-section\">\n                <div class=\"tabs\">\n                    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.tabs), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell flex\">\n            <div class=\"body\">\n                ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.tabs), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"buttons count-2\">\n                <a href=\"javascript:window.history.back();\" class=\"button ui-button\">\n                    <img class=\"icon back-icon\" src='ui/img/onebyone.gif'/>\n                    <div class=\"text\">Action 1</div>\n                </a>\n                <a href=\"cat.html\" class=\"button ui-button success\">\n                    <img class=\"icon back-icon\" src='ui/img/onebyone.gif'/>\n                    <div class=\"text\">Action 2</div>\n                </a>\n            </div>\n        </div>\n    </div>\n</div>";
  return buffer;
  });

this["Templates"]["city/info"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"info-tab-content active\">\n    <div class=\"bird-eye-container\"></div>\n    <div class=\"info-container\">\n        Name: ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n        <br>Tile: ";
  if (helper = helpers.tile) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.tile); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n        <br>Mayor: -\n        <br>Population: <span class=\"pop\"></span>\n        <br>Max pop.: <span class=\"maxPop\"></span>\n        <br>\n    </div>\n    <div class=\"ui-hr hr\"></div>\n    <div class=\"res-cnt\">\n        Resources\n        <div class=\"ui-list res-list\">\n            <div class=\"item\">\n                <div class=\"key\">\n                    Available resources\n                </div>\n                <div class=\"val available-resources\">\n\n                </div>\n            </div>\n            <div class=\"item\">\n                <div class=\"key\">\n                    Required resources\n                </div>\n                <div class=\"val required-resources\">\n\n                </div>\n            </div>\n        </div>\n    </div>\n</div>";
  return buffer;
  });

this["Templates"]["city/map"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"map-tab-content\">\n    <div class=\"map-tab-content-container\">\n        <div class=\"map-container\"></div>\n        <div class=\"map-buttons\">\n            <div class=\"map-button\">Crime</div>\n            <div class=\"map-button active\">Ecology</div>\n            <div class=\"map-button\">Wealth</div>\n            <div class=\"map-button\">Terrain</div>\n            <div class=\"map-button\">Names</div>\n            <script>\n                var btns = document.querySelectorAll(\".map-button\");\n                for (var i = 0; i < btns.length; i++)\n                    btns[i].addEventListener(\"click\", function () {\n                        this.classList.toggle(\"active\");\n                    });\n            </script>\n        </div>\n    </div>\n</div>";
  });

this["Templates"]["gamescreen/gamelayout"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"game-view\">\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"head-slot\">\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell flex\">\n            <div class=\"body-slot\">\n            </div>\n        </div>\n    </div>\n</div>\n";
  });

this["Templates"]["prompt/prompt"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"prompt-view ui-window\">\n    <div class=\"row\">\n        <div class=\"cell flex\">\n            <div class=\"body ui-block\">\n                <div class=\"centerer\">\n                    <label>\n                        ";
  if (helper = helpers.message) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.message); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n                        <input placeholder=\"";
  if (helper = helpers.placeholder) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.placeholder); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" value=\"";
  if (helper = helpers.placeholder) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.placeholder); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" type=\"text\"/>\n                    </label>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class=\"row\">\n        <div class=\"cell\">\n            <div class=\"buttons count-2\">\n                <a class=\"button ui-button discard\">\n                    <img class=\"icon cross-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Cancel</div>\n                </a>\n                <a class=\"button ui-button submit\">\n                    <img class=\"icon tick-icon\" src='ui/img/onebyone.gif'/>\n\n                    <div class=\"text\">Build</div>\n                </a>\n            </div>\n        </div>\n    </div>\n</div>";
  return buffer;
  });

this["Templates"]["splash/splash"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div id=\"splash\">\n    <div>\n        <h1>Isometrica</h1>\n        indev version\n        <br>by Denis Narushevich, 2012-2014\n    </div>\n</div>";
  });

this["Templates"]["topbar/topbar"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"top-bar\">\n    <div class=\"city-name\">\n        ";
  if (helper = helpers.cityName) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.cityName); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n    </div>\n    <div class=\"left\">\n        <div class=\"section\">\n            <div class=\"icon-val\">\n                <div class=\"icon citizen-icon\">\n                    <img src='ui/img/onebyone.gif'/>\n                </div>\n                <div class=\"text population\"></div>\n            </div>\n        </div>\n        <div class=\"section\">\n            <div class=\"icon-val \">\n                <div class=\"icon coin-icon\">\n                    <img src='ui/img/onebyone.gif'/>\n                </div>\n                <div class=\"text money\"></div>\n            </div>\n        </div>\n    </div>\n    <div class=\"right\">\n        <div class=\"section\">\n            <div class=\"icon-val\">\n                <div class=\"icon clock-icon\">\n                    <img src='ui/img/onebyone.gif'/>\n                </div>\n                <div class=\"text date\"></div>\n            </div>\n        </div>\n    </div>\n</div>\n";
  return buffer;
  });

this["Templates"]["valbar/valbar"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <div class=\"item\">\n            <img class=\"";
  if (helper = helpers.icon) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.icon); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "-icon\" title=\"";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " ";
  if (helper = helpers.title) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.title); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" src='ui/img/onebyone.gif'/>";
  if (helper = helpers.value) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.value); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n        </div>\n        ";
  return buffer;
  }

  buffer += "<div class=\"icon-bar\">\n    <div class=\"items\">\n        ";
  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.items) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.items); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.items) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n</div>";
  return buffer;
  });

this["Templates"]["world/worldscreen"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"world-view ui-window\">\r\n  <div class=\"row\">\r\n    <div class=\"cell\">\r\n        <div class=\"body\">\r\n            <div class=\"hint-pos\">\r\n                <div class=\"hint\"></div>\r\n            </div>\r\n            <div class=\"btns\">\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n";
  });

return this["Templates"];

});