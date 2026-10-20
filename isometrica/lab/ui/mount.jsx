/**
 * Puts a page's React UI into its HTML file's #root, with the lab's look.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./lab.css";

export function mount(Page) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
}
