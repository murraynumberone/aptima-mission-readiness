import { useLayoutEffect, useRef, type ReactNode } from "react";
import { animate } from "motion";
import { prefersReducedMotion } from "../lib/motion";
import { IconSave } from "./icons";

/**
 * Scale-and-fade when the icon is swapped, so a state change is noticed. Skipped on first render and for
 * reduced motion; a swap mid-animation finishes the old one first.
 */
export function IconSwap({ swapKey, children }: { swapKey: string; children: ReactNode }) {
  const box = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = box.current;
    if (!el || prefersReducedMotion()) return;
    const controls = animate(el, { opacity: [0, 1], scale: [0.6, 1] }, { duration: 0.16, ease: "easeOut" });
    return () => controls.complete();
  }, [swapKey]);

  return (
    <span ref={box} className="inline-flex">
      {children}
    </span>
  );
}

/** A check mark that draws itself, for confirmations. Fully drawn from the start when motion is reduced. */
export function IconCheckDraw() {
  const svg = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const path = svg.current?.querySelector("path");
    if (!path || prefersReducedMotion()) return;
    path.setAttribute("pathLength", "1");
    path.style.strokeDasharray = "1";
    const controls = animate(path, { strokeDashoffset: [1, 0] }, { duration: 0.22, ease: "easeOut" });
    return () => {
      controls.complete();
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, []);

  return <IconSave ref={svg} />;
}
