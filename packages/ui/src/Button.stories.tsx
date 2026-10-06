import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Next event" },
  argTypes: {
    // Storybook can't read the options from React's inherited button props and would show "Set object".
    type: {
      control: "inline-radio",
      options: ["button", "submit", "reset"],
      description: "Defaults to button, so a Button inside a form never submits it by accident. Pass submit to submit.",
      table: { defaultValue: { summary: "button" }, type: { summary: '"button" | "submit" | "reset"' } },
    },
    children: { control: "text", description: "The visible label. Always give a button a text label." },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The ordinary action. Most buttons on a page are this. */
export const Default: Story = {};
/** The single action that completes the task. Strong fill so it is found first; use once per group. */
export const Primary: Story = { args: { variant: "primary", children: "Save note" } };
/** Shown when the action is unavailable, such as Previous event at the first event. Muted text, not just a faded look, so it stays readable. */
export const Disabled: Story = { args: { disabled: true, children: "Previous event" } };
/** The three button states side by side, for comparing weight. Hover and pressed are CSS only; tab to a button to see the focus ring. */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Default</Button>
      <Button variant="primary">Primary</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};
