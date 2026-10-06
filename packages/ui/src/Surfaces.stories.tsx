import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Foundations/Surfaces and labels", parameters: { a11y: { test: "off" } } } satisfies Meta;
export default meta;

/**
 * Panel and label are CSS classes, not components: they go on headings, cells, lists and popups. Use
 * class="panel" on a bordered surface and class="label" on short caps text.
 */
export const PanelAndLabel: StoryObj = {
  render: () => (
    <div className="grid max-w-md gap-4">
      <div className="panel p-4">
        <p className="label">Readiness</p>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">82%</p>
      </div>
      <ol className="panel overflow-hidden">
        <li className="border-b border-line px-4 py-3">First row</li>
        <li className="px-4 py-3">Second row</li>
      </ol>
    </div>
  ),
};

/** A dark band that remaps the color tokens inside it, so ordinary buttons and controls restyle themselves. */
export const Bar: StoryObj = {
  render: () => (
    <div className="bar flex items-center justify-between px-4 py-3">
      <span className="font-medium">Mission Readiness</span>
      <button type="button" className="btn">
        Display
      </button>
    </div>
  ),
};
