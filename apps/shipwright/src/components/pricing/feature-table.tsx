import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, MinusIcon } from "lucide-react";
import type { FeatureCell } from "@/lib/pricing";
import { FEATURE_MATRIX, PLANS } from "@/lib/pricing";

// A check or dash always comes with words for screen readers, so meaning never depends on the icon or color.
function Cell({ value }: { value: FeatureCell }) {
  if (typeof value === "string") return <span>{value}</span>;
  return value ? (
    <>
      <CheckIcon aria-hidden className="size-4 text-success" />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <MinusIcon aria-hidden className="size-4 text-muted-foreground" />
      <span className="sr-only">Not included</span>
    </>
  );
}

// From md up: one real table. Below md: one stacked card per plan (a wide table is hard to use on a phone).
// Both read the same FEATURE_MATRIX; the one that is not shown is display:none, so a screen reader hears it once.
export function FeatureTable() {
  return (
    <>
      <div className="hidden md:block">
        <Table className="border-separate border-spacing-0">
          <TableCaption className="sr-only">What each Shipwright plan includes</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-1/3">
                <span className="sr-only">Feature</span>
              </TableHead>
              {PLANS.map((plan) => (
                <TableHead
                  key={plan.id}
                  scope="col"
                  className={cn("text-foreground", "highlight" in plan && plan.highlight && "text-brand")}
                >
                  {plan.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURE_MATRIX.map((row) => (
              <TableRow key={row.label}>
                <TableHead scope="row" className="font-normal text-muted-foreground">
                  {row.label}
                </TableHead>
                {PLANS.map((plan) => (
                  <TableCell key={plan.id} className={cn("highlight" in plan && plan.highlight && "bg-brand/5")}>
                    <span className="inline-flex items-center">
                      <Cell value={row.plans[plan.id]} />
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {PLANS.map((plan) => (
          <section
            key={plan.id}
            aria-labelledby={`compare-${plan.id}`}
            className={cn(
              "rounded-xl border bg-card p-4",
              "highlight" in plan && plan.highlight && "border-brand ring-1 ring-brand",
            )}
          >
            <h3 id={`compare-${plan.id}`} className="mb-3 text-h3 font-semibold">
              {plan.name}
            </h3>
            <dl className="flex flex-col divide-y">
              {FEATURE_MATRIX.map((row) => (
                <div key={row.label} className="flex min-h-10 items-center justify-between gap-4 py-2 text-sm">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="inline-flex items-center text-right">
                    <Cell value={row.plans[plan.id]} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
