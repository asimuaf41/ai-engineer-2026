import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { ArrowRightIcon, GitPullRequestIcon, RadarIcon, SearchCheckIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

const steps = [
  { title: "Find", body: "Scan the app and surface every real security and reliability problem.", icon: SearchCheckIcon },
  { title: "Prove", body: "Reproduce each problem with evidence, not guesses.", icon: ShieldCheckIcon },
  { title: "Fix", body: "Ship a pull request that fixes it, reviewed before it lands.", icon: GitPullRequestIcon },
  { title: "Guard", body: "Watch every future push so the same problem can't come back.", icon: RadarIcon },
];

export default function Page() {
  return (
    <main className="container-page">
      <section className="flex flex-col items-center gap-8 py-24 text-center sm:py-32">
        <Badge variant="outline" className="h-auto px-3 py-1">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          For founders shipping with Lovable, Bolt, v0 and Cursor
        </Badge>
        <h1 className="max-w-4xl text-display font-semibold">
          Your AI-built app works in the demo. Let&apos;s make it survive production.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Vibe-coded apps ship fast and break quietly. Shipwright finds the security and
          reliability problems hiding under the surface, proves they&apos;re real, and fixes them
          before customers do.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <a href="http://localhost:3001">
              Try the audit lab
              <ArrowRightIcon />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/design">See the design system</Link>
          </Button>
        </div>
      </section>

      <section id="how" className="grid scroll-mt-20 grid-cols-1 gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card key={step.title} className="transition-colors hover:border-foreground/20 hover:ring-foreground/20">
            <CardHeader className="gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
                <step.icon aria-hidden className="size-5 text-brand" />
              </div>
              <CardTitle className="text-h3 font-semibold">{step.title}</CardTitle>
              <CardDescription>{step.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
