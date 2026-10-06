import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vitest/config";

// The two fonts the first screen needs. Built file names carry a hash, so the preload links are written at build time.
// Without them the browser only finds the fonts after it has downloaded and read the stylesheet.
const firstScreenFonts = /atkinson-hyperlegible-(next|mono)-latin-wght-normal/;
const preloadFonts: Plugin = {
  name: "preload-first-screen-fonts",
  transformIndexHtml: {
    order: "post",
    handler(_html, { bundle }) {
      return Object.keys(bundle ?? {})
        .filter((file) => firstScreenFonts.test(file))
        .map((file) => ({
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", href: `/${file}` },
          injectTo: "head-prepend" as const,
        }));
    },
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
  },
});
