import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Stagger, StaggerItem } from "@repo/ui/motion/stagger";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { formatPrice, PLANS } from "@/lib/pricing";

// Server Component: Stagger / StaggerItem are the only client parts, and they already follow the user's
// "reduce motion" setting (MotionProvider), so the cards just fade in without moving.
export function PlanCards() {
  return (
    <Stagger role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PLANS.map((plan) => {
        const highlighted = "highlight" in plan && plan.highlight;
        const { amount, unit } = formatPrice(plan.price);
        return (
          <StaggerItem key={plan.id} role="listitem" className="flex">
            <Card
              size="default"
              className={cn("w-full gap-5 py-5", highlighted && "bg-brand/5 ring-2 ring-brand")}
              data-highlighted={highlighted ? "" : undefined}
            >
              <CardHeader className="gap-2 px-5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-h3 font-semibold">{plan.name}</CardTitle>
                  {highlighted ? (
                    <Badge className="bg-brand text-brand-foreground">Most popular</Badge>
                  ) : null}
                </div>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-semibold tracking-tight">{amount}</span>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </p>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-5">
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="px-5">
                <Button
                  asChild
                  size="lg"
                  variant={highlighted ? "default" : "outline"}
                  className="h-11 w-full"
                >
                  <Link href={plan.cta.href} transitionTypes={["nav-forward"]}>
                    {plan.cta.label}
                    <span className="sr-only"> for {plan.name}</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
