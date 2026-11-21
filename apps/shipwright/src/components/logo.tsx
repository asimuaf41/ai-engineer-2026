import { cn } from "@repo/ui/lib/utils";

// The Shipwright mark: a sail, a smaller jib and a hull on a brand-coloured tile. The shapes match app/icon.svg
// (the browser-tab icon). Colours are tokens (text-brand, fill-brand-foreground), so light and dark just work.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0 text-brand", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g className="fill-brand-foreground">
        {/* The sails lean forward a little on hover. motion-reduce keeps them still. */}
        <g className="origin-bottom transition-transform duration-300 ease-out group-hover/logo:-translate-y-px group-hover/logo:scale-105 motion-reduce:transition-none motion-reduce:group-hover/logo:translate-y-0 motion-reduce:group-hover/logo:scale-100">
          <path d="M16.5 6 L25 21 H16.5 Z" />
          <path d="M14.5 10.5 L8 21 H14.5 Z" opacity="0.7" />
        </g>
        <path d="M6.5 23.5 H25.5 L22.5 27 H9.5 Z" />
      </g>
    </svg>
  );
}

// Mark + wordmark. Put it inside a <Link>; the hover effect reacts to the "group/logo" on that wrapper.
export function Logo({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("group/logo inline-flex items-center gap-2", className)}
    >
      <LogoMark />
      {showWordmark ? (
        <span className="text-[1.05rem] font-semibold tracking-tight text-foreground">
          Shipwright
        </span>
      ) : (
        <span className="sr-only">Shipwright</span>
      )}
    </span>
  );
}
