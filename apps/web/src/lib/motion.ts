/** True when the user has asked for less motion. Every animation in the app checks this, or a CSS media query. */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
