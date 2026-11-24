import engine from "engine";

function Component() {
  engine.Component.call(this);
}

Component.prototype = Object.create(engine.Component.prototype);

export default Component;
