import type { ComponentProps } from "react";

/**
 * A multi-line field for free text. Pair with a label (sr-only if surrounding text names it). Mark errors with
 * aria-invalid and explain them in words.
 */
export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`field ${className}`.trim()} {...rest} />;
}
