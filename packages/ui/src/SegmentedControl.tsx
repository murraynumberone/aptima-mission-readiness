import { useRef, useState, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Drawn before the label. Decorative: the label always carries the meaning. */
  icon?: (selected: boolean) => ReactNode;
  /**
   * Tooltip on hover and keyboard focus (not a title attribute). Repeat it in `describedBy` text for screen
   * readers.
   */
  hint?: string;
}

interface Anchor<T> {
  value: T;
  el: HTMLElement;
}

interface Props<T extends string> {
  /** Names the group for screen readers. */
  legend: string;
  /** Show the legend as a caps label above the control. Leave off when the surroundings already name it. */
  showLegend?: boolean;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /**
   * "row" keeps one line (toolbar). "wrap" is two columns, then four once the control itself is wide enough.
   */
  layout?: "row" | "wrap";
  /** Id of text that explains the selected option; read out with it. */
  describedBy?: string;
}

/**
 * Pick one of a few options worth seeing together (theme, review status). Real radios: arrow keys move, the
 * choice applies immediately. For many options use a select.
 */
export function SegmentedControl<T extends string>({
  legend,
  showLegend = false,
  name,
  value,
  onChange,
  options,
  layout = "row",
  describedBy,
}: Props<T>) {
  // One tooltip for the group, for the hovered option or else the keyboard-focused one. Base UI's per-trigger
  // focus does not reopen when arrowing between triggers, so open state is driven here.
  const [hover, setHover] = useState<Anchor<T> | null>(null);
  const [focus, setFocus] = useState<Anchor<T> | null>(null);
  const pressed = useRef(false); // focus that follows a press is the pointer's, and the pointer is already showing it
  const active = hover ?? focus;
  const hint = options.find((o) => o.value === active?.value)?.hint;

  // @container only for "wrap" (it follows its own width); "row" is sized by its labels and must not have it.
  // gap-px over a line-colored background draws the dividers.
  return (
    <fieldset className={layout === "wrap" ? "@container" : undefined}>
      <legend className={showLegend ? "label mb-1" : "sr-only"}>{legend}</legend>
      <div
        className={`grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line ${
          layout === "wrap" ? "grid-cols-2 @[27rem]:grid-cols-4" : "grid-flow-col"
        }`}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className="relative bg-surface"
            onMouseEnter={(e) => setHover({ value: o.value, el: e.currentTarget })}
            onMouseLeave={() => setHover(null)}
            onPointerDown={() => (pressed.current = true)}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              aria-describedby={describedBy}
              onChange={() => onChange(o.value)}
              onFocus={(e) => {
                if (!pressed.current) setFocus({ value: o.value, el: e.currentTarget });
                pressed.current = false;
              }}
              onBlur={() => setFocus(null)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0"
            />
            <span className="flex min-h-8 items-center justify-center gap-1.5 px-2.5 font-mono text-xs font-medium text-muted-foreground peer-checked:bg-fill-subtle peer-checked:font-bold peer-checked:text-surface-foreground peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-focus-ring">
              {o.icon?.(value === o.value)}
              {o.label}
            </span>
          </label>
        ))}
      </div>
      <Tooltip.Root open={Boolean(hint)}>
        <Tooltip.Portal>
          <Tooltip.Positioner
            anchor={active?.el ?? null}
            side="top"
            sideOffset={6}
            collisionPadding={8}
            className="z-50"
          >
            <Tooltip.Popup
              aria-hidden
              className="pointer-events-none max-w-(--available-width) rounded-(--radius) border border-line bg-surface px-2 py-1 text-xs"
            >
              {hint}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </fieldset>
  );
}
