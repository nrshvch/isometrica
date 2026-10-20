/**
 * A word asked of the player - the name of the city being founded - in the
 * place of the world, with leaving it and taking it along the bottom.
 */
import { useState } from "react";
import { Screen } from "../kit";

export default function Prompt({ prompt }) {
  var [value, setValue] = useState(prompt.placeholder || "");

  function submit() {
    prompt.submit(value);
  }

  return (
    <Screen
      className="flex items-center justify-center p-4"
      buttons={[
        { icon: "back-icon", text: "Cancel", onClick: prompt.discard },
        { icon: "tick-icon", text: "Build", onClick: submit },
      ]}
    >
      <form
        className="w-4/5 max-w-xl"
        onSubmit={function (e) {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block text-[14pt]">
          {prompt.message}
          <input
            autoFocus
            type="text"
            placeholder={prompt.placeholder}
            value={value}
            onChange={function (e) {
              setValue(e.target.value);
            }}
            className="ui-block-inset mt-2 block w-full bg-white px-3 py-3 text-[14pt] text-[#333] outline-none"
          />
        </label>
      </form>
    </Screen>
  );
}
