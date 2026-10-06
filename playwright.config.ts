import { defineConfig } from "@playwright/test";

// `E2E_TARGET=preview` runs the same tests against the production build instead of the dev server.
const preview = process.env.E2E_TARGET === "preview";
const url = preview ? "http://localhost:4173" : "http://localhost:5173";

export default defineConfig({
  testDir: "e2e",
  reporter: "list",
  use: { baseURL: url },
  webServer: {
    command: preview
      ? "pnpm --filter web build && pnpm --filter web exec vite preview --port 4173"
      : "pnpm --filter web dev",
    url,
    reuseExistingServer: true,
  },
});
