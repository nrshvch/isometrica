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

function program1(depth0,data,depth1) {
  
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
    + "\" class=\"build\">Build</a>\n                            <a href=\"#catalogue/"
    + escapeExpression(((stack1 = (depth1 && depth1.code)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "/";
  if (helper = helpers.code) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.code); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"info\">Info</a>\n                        </div>\n                    </div>\n                ";
  return buffer;
  }

  buffer += "<div class=\"building-list-view ui-list-window\">\n    <div class=\"row body\">\n        <div class=\"cell\">\n            <div class=\"body\">\n                ";
  options={hash:{},inverse:self.noop,fn:self.programWithDepth(1, program1, data, depth0),data:data}
  if (helper = helpers.buildings) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.buildings); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.buildings) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.programWithDepth(1, program1, data, depth0),data:data}); }
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
  buffer += "\n                    <div class=\"item ui-block\">\n                        <a href=\"#catalogue/";
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
  


  return "<div class=\"top-bar\">\n  <div class=\"city-name\">\n    My City\n  </div>\n  <div class=\"left\">\n    <div class=\"section population\">\n      <div class=\"icon citizen-icon\">\n        <img src='ui/img/onebyone.gif' />\n      </div>\n      <div class=\"text\">123/223</div>\n    </div>\n    <div class=\"section resources\">\n      <div class=\"icon coin-icon\">\n        <img src='ui/img/onebyone.gif' />\n      </div>\n      <div class=\"text\">12k</div>\n    </div>\n  </div>\n  <div class=\"right\">\n    <div class=\"section resources\">\n      <div class=\"icon clock-icon\">\n        <img src='ui/img/onebyone.gif' />\n      </div>\n      <div class=\"text\">27/11/3</div>\n    </div>\n  </div>\n</div>\n";
  });

this["Templates"]["world/worldscreen"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"world-view ui-window\">\r\n  <div class=\"row\">\r\n    <div class=\"cell\">\r\n        <div class=\"body\">\r\n            <div class=\"hint-pos\">\r\n                <div class=\"hint\"></div>\r\n            </div>\r\n            <div class=\"btns\">\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n                <div class=\"slot\">\r\n                    <img class=\"btn\" src='ui/img/onebyone.gif'/>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n";
  });

return this["Templates"];

});