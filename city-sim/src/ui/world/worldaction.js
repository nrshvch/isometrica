import ReactiveProperty from "reactive-property";

function WorldAction() {
  this.rotation = ReactiveProperty(false);
  this.canRotate = ReactiveProperty(true);
  //whether what goes up can be picked again, at random - another building
  //of the same kind on the same selection (the dice)
  this.canShuffle = ReactiveProperty(false);
  //the action's own buttons, between leaving it and confirming it - which
  //goes to the far end for them: {icon, on, action} each, on for one that is
  //switched on (WorldScreenView#showActionButtons) - or null for none
  this.tools = ReactiveProperty(null);
  this.canSubmit = ReactiveProperty(true);
  this.canDiscard = ReactiveProperty(true);
}

WorldAction.prototype.onSubmit = function () {};
WorldAction.prototype.onDiscard = function () {};
WorldAction.prototype.onRotate = function () {};
WorldAction.prototype.onShuffle = function () {};

WorldAction.prototype.submit = function () {
  this.onSubmit();
};

WorldAction.prototype.discard = function () {
  this.onDiscard();
};

WorldAction.prototype.rotate = function () {
  this.onRotate();
};

WorldAction.prototype.shuffle = function () {
  this.onShuffle();
};

export default WorldAction;
