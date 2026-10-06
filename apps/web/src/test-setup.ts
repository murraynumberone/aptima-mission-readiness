import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { installMatchMedia, resetMedia } from "./test-media";

beforeEach(() => {
  installMatchMedia();
  resetMedia();
  localStorage.clear();
  window.history.replaceState(null, "", "/"); // the address is state too: start every test from a clean one
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
});
afterEach(cleanup);

// jsdom has no pointer capture; Base UI's slider calls it when a pointer goes down on the track.
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

// jsdom has no layout, so scrolling is a no-op.
Element.prototype.scrollIntoView ??= () => {};
