import { CheckIcon, XIcon } from "lucide-react";

// "What Shipwright can see": two short lists, what it CAN do and what it CANNOT. Every line has the words "can" or "cannot" for
// screen readers, so the meaning never rests on the tick and cross alone.
export function TrustBox({ id, title, can, cannot }: { id: string; title: string; can: string[]; cannot: string[] }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border bg-muted/40 p-4">
      <h3 id={id} className="mb-3 text-sm font-semibold">
        {title}
      </h3>
      <ul className="flex flex-col gap-2 text-sm">
        {can.map((text) => (
          <li key={text} className="flex items-start gap-2">
            <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            <span>
              <span className="sr-only">Can: </span>
              {text}
            </span>
          </li>
        ))}
        {cannot.map((text) => (
          <li key={text} className="flex items-start gap-2">
            <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="sr-only">Cannot: </span>
              {text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
