import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "**/dist",
    "**/storybook-static",
    "**/node_modules",
    "**/.turbo",
    "test-results",
    "playwright-report",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["*.{js,cjs,mjs}", "packages/tokens/*.mjs", "e2e/**", "**/vite.config.ts", "**/.storybook/main.ts"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
