import type { Decorator, Preview } from "@storybook/react-vite";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import "./preview.css";

// The same three themes as the app. The toolbar switches data-theme on <html>, exactly as the app does.
const withTheme: Decorator = (Story, { globals }) => {
  document.documentElement.dataset.theme = globals.theme;
  return (
    <div className="bg-bg p-6 text-surface-foreground">
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: "day" },
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "day", title: "Day" },
          { value: "ops", title: "Ops" },
          { value: "night", title: "Night" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "fullscreen",
    // Contrast and name checks run on every story. Page-level rules (main landmark, h1) do not apply to a lone
    // component.
    a11y: {
      test: "error",
      config: {
        rules: [
          { id: "landmark-one-main", enabled: false },
          { id: "page-has-heading-one", enabled: false },
          { id: "region", enabled: false },
        ],
      },
    },
  },
};
export default preview;
