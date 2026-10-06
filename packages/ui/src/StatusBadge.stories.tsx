import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "./StatusBadge";

const meta = { title: "Components/StatusBadge", component: StatusBadge, args: { status: "nominal" } } satisfies Meta<
  typeof StatusBadge
>;
export default meta;
type Story = StoryObj<typeof meta>;

/** On track. Outlined circle plus the word, so it reads without color. */
export const Nominal: Story = {};
/** Below the attention line. Half-filled circle, semibold word. */
export const Attention: Story = { args: { status: "attention" } };
/** Below the critical line. Solid circle, bold word: the heaviest of the three. */
export const Critical: Story = { args: { status: "critical" } };
/** Status is never color alone: outlined, half filled, solid, plus the word. Switch to Night to see it hold. */
export const AllThree: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <StatusBadge status="nominal" />
      <StatusBadge status="attention" />
      <StatusBadge status="critical" />
    </div>
  ),
};
