/**
 * A word asked of the player - the name of the city being founded - on
 * glass over the world, with leaving it and taking it.
 */
import { useState } from "react";
import { Container, Icon } from "../kit";

export default function Prompt({ prompt }) {
  var [value, setValue] = useState(prompt.placeholder || "");

  function submit() {
    prompt.submit(value);
  }

  return (
    <Container className="flex flex-1 items-center justify-center pb-24">
      <form
        className="glass pointer-events-auto w-full max-w-md p-6"
        onSubmit={function (e) {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <Icon name="house" className="size-10 text-gold" />
          <label htmlFor="prompt" className="text-xl font-semibold">
            {prompt.message}
          </label>
        </div>
        <input
          id="prompt"
          autoFocus
          type="text"
          placeholder={prompt.placeholder}
          value={value}
          onChange={function (e) {
            setValue(e.target.value);
          }}
          className="w-full rounded-lg bg-white/8 px-4 py-3 text-lg ring-1 ring-line outline-none placeholder:text-white/35 focus:ring-2 focus:ring-gold"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={prompt.discard}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" className="size-5" />
            Found it
          </button>
        </div>
      </form>
    </Container>
  );
}
