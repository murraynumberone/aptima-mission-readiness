// The only place the logo is drawn: a neutral placeholder until the real artwork is cleared for use. Inline so each
// theme can tint it through tokens (--logo-mark, --logo-word); swap the paths and the aria-label, keep the two fills.
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg role="img" aria-label="Logo placeholder" viewBox="0 0 160 40" className={className}>
      <path fill="var(--logo-mark)" d="M8,0h24a8,8,0,0,1,8,8v24a8,8,0,0,1-8,8H8a8,8,0,0,1-8-8V8A8,8,0,0,1,8,0Z" />
      <path fill="var(--logo-word)" d="M52,12h108v6H52ZM52,24h72v6H52Z" />
    </svg>
  );
}
