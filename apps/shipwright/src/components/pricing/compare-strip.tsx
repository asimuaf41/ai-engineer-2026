import { cn } from "@repo/ui/lib/utils";
import { COMPARE } from "@/lib/pricing";

// What a founder does today, by category. No competitor names on purpose.
export function CompareStrip() {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {COMPARE.map((item) => (
        <li
          key={item.who}
          className={cn(
            "flex flex-col gap-1 rounded-xl border bg-card p-5",
            item.us && "border-brand bg-brand/5 ring-1 ring-brand",
          )}
        >
          <span className="text-sm text-muted-foreground">{item.who}</span>
          <span className="text-lg font-semibold">{item.result}</span>
        </li>
      ))}
    </ul>
  );
}
