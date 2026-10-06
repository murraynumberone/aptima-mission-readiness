import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReviewIcon } from "./ReviewBadge";
import { SegmentedControl } from "./SegmentedControl";

const meta: Meta = { title: "Components/SegmentedControl", component: SegmentedControl as never };
export default meta;
type Story = StoryObj;

const dot = (selected: boolean) => (
  <span aria-hidden className={`size-2 rounded-full border border-current ${selected ? "bg-current" : ""}`} />
);

/** One line, content-sized: a toolbar choice such as the theme. The filled dot and bold weight mark the selection, not color. */
export const Row: Story = {
  render: function Render() {
    const [value, setValue] = useState("day");
    return (
      <SegmentedControl
        legend="Theme"
        name="theme"
        value={value}
        onChange={setValue}
        options={[
          { value: "system", label: "System", icon: dot },
          { value: "day", label: "Day", icon: dot },
          { value: "ops", label: "Ops", icon: dot },
          { value: "night", label: "Night", icon: dot },
        ]}
      />
    );
  },
};

/** Four options with shaped icons, in a column about 20rem wide: it wraps to 2x2 because it follows its own width. Hover or arrow to an option with a hint to see it. */
export const WrapsInANarrowColumn: Story = {
  render: function Render() {
    const [value, setValue] = useState("unreviewed");
    return (
      <div className="w-80">
        <SegmentedControl
          legend="Review status"
          showLegend
          layout="wrap"
          name="review"
          value={value}
          onChange={setValue}
          options={[
            {
              value: "unreviewed",
              label: "Unreviewed",
              hint: "Not looked at yet.",
              icon: () => <ReviewIcon status="unreviewed" />,
            },
            {
              value: "confirmed",
              label: "Confirmed",
              hint: "Agree with how the system recorded this.",
              icon: () => <ReviewIcon status="confirmed" />,
            },
            { value: "adjusted", label: "Adjusted", icon: () => <ReviewIcon status="adjusted" /> },
            { value: "dismissed", label: "Dismissed", icon: () => <ReviewIcon status="dismissed" /> },
          ]}
        />
      </div>
    );
  },
};

/** The same control with room to spare: all four on one row. */
export const WrapsToOneRowWhenWide: Story = {
  render: function Render() {
    const [value, setValue] = useState("confirmed");
    return (
      <div className="w-[36rem]">
        <SegmentedControl
          legend="Review status"
          showLegend
          layout="wrap"
          name="review-wide"
          value={value}
          onChange={setValue}
          options={[
            { value: "unreviewed", label: "Unreviewed", icon: () => <ReviewIcon status="unreviewed" /> },
            { value: "confirmed", label: "Confirmed", icon: () => <ReviewIcon status="confirmed" /> },
            { value: "adjusted", label: "Adjusted", icon: () => <ReviewIcon status="adjusted" /> },
            { value: "dismissed", label: "Dismissed", icon: () => <ReviewIcon status="dismissed" /> },
          ]}
        />
      </div>
    );
  },
};
