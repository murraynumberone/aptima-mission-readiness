import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./Textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { rows: 3, "aria-label": "Note", placeholder: "Operator was on the radio; discuss alert priority…" },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The note field before anything is typed, with a placeholder that shows what a useful note looks like. */
export const Empty: Story = {};
/** Typed text. Wraps and grows only by the user resizing, so the surrounding layout does not shift. */
export const Filled: Story = { args: { defaultValue: "After the hand-off at 14:00, ask what changed." } };
/** A heavier border marks the problem; the reason must also be written next to the field. */
export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "" } };
