import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  core: { disableTelemetry: true },
  viteFinal: (config) => ({ ...config, plugins: [...(config.plugins ?? []), tailwindcss()] }),
};
export default config;
