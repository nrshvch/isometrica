/**
 * A word asked of the player - the name of the city being founded - on a
 * card over the world, with leaving it and taking it.
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
        className="card pointer-events-auto w-full max-w-md p-4 sm:p-5"
        onSubmit={function (e) {
          e.preventDefault();
          submit();
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="tile tile-gold">
            <Icon name="found" size={24} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="label">A new city</span>
            <label htmlFor="prompt" className="text-lg leading-snug font-black">
              {prompt.message}
            </label>
          </div>
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
          className="w-full rounded-[3px] bg-inset px-4 py-3 text-lg font-extrabold outline-none placeholder:text-muted focus:ring-2 focus:ring-gold"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn" onClick={prompt.discard}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Icon name="check" size={20} strokeWidth={2} />
            Found it
          </button>
        </div>
      </form>
    </Container>
  );
}
