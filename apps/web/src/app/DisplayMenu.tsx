import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { DIM_MAX, DIM_MIN } from "../lib/theme";
import { IconDisplay } from "./icons";
import { useTheme } from "./ThemeProvider";

/** Display settings that don't need to be on screen all the time. Night brightness lives here. */
export function DisplayMenu() {
  const { theme, dim, setDim } = useTheme();
  const night = theme === "night";

  return (
    <Popover.Root>
      <Popover.Trigger className="btn">
        <IconDisplay />
        Display
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Popover.Popup className="panel w-80 max-w-[calc(100vw-2rem)] p-4 shadow-lg">
            <Popover.Title className="label">Display</Popover.Title>

            <Slider.Root
              value={dim}
              min={DIM_MIN}
              max={DIM_MAX}
              step={5}
              largeStep={10}
              disabled={!night}
              onValueChange={(v) => setDim(v)}
              className="mt-3"
            >
              <div className="flex items-center gap-3 text-xs">
                <Slider.Label className="font-mono">Night brightness</Slider.Label>
                <Slider.Control className="flex h-6 flex-1 touch-none items-center select-none data-[disabled]:opacity-50">
                  <Slider.Track className="relative h-px w-full bg-line">
                    <Slider.Indicator className="h-px bg-surface-foreground" />
                    <Slider.Thumb
                      aria-label="Night brightness"
                      className="size-3.5 rounded-(--radius) border-2 border-surface-foreground bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring"
                    />
                  </Slider.Track>
                </Slider.Control>
                <Slider.Value className="w-9 text-right font-mono tabular-nums">{(_, [v]) => `${v}%`}</Slider.Value>
              </div>
            </Slider.Root>

            <Popover.Description className="mt-2 text-xs text-muted-foreground">
              Night theme only. Below 100% trades contrast for darkness.
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
