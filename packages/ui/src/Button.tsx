import type { ComponentProps } from "react";

interface Props extends ComponentProps<"button"> {
  /** Primary marks the one action that finishes the task (Save, Play). Use it once per group of buttons. */
  variant?: "default" | "primary";
}

/** An action on the page. Use a link, not a Button, to navigate. Always give it a text label. */
export function Button({ variant = "default", type = "button", className = "", ...rest }: Props) {
  return (
    <button type={type} className={`btn ${variant === "primary" ? "btn-primary" : ""} ${className}`.trim()} {...rest} />
  );
}
