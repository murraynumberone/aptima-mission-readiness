import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewBadge } from "./ReviewBadge";

const meta = {
  title: "Components/ReviewBadge",
  component: ReviewBadge,
  args: { status: "unreviewed", children: "Unreviewed" },
} satisfies Meta<typeof ReviewBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The starting state of every event. Empty circle. */
export const Unreviewed: Story = {
  args: {
    className: "",
  },
};
/** Reviewed and agreed. Circle with a check. */
export const Confirmed: Story = { args: { status: "confirmed", children: "Confirmed" } };
/** Review status is process, not severity, so it stays neutral: shape and word only, no status color. */
export const AllFour: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ReviewBadge status="unreviewed">Unreviewed</ReviewBadge>
      <ReviewBadge status="confirmed">Confirmed</ReviewBadge>
      <ReviewBadge status="adjusted">Adjusted</ReviewBadge>
      <ReviewBadge status="dismissed">Dismissed</ReviewBadge>
    </div>
  ),
};
