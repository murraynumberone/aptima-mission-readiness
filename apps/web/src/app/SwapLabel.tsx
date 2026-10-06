/**
 * Shows one label while reserving room for the longest, so swapping labels never changes the width of the
 * container. Unused labels are hidden from the accessible name.
 */
export function SwapLabel({ show, options }: { show: string; options: readonly string[] }) {
  return (
    <span className="inline-grid justify-items-center">
      {options.map((option) => (
        <span
          key={option}
          className="col-start-1 row-start-1"
          style={option === show ? undefined : { visibility: "hidden" }}
        >
          {option}
        </span>
      ))}
    </span>
  );
}
