import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Reveal } from "@repo/ui/motion/reveal";
import { ScrollProgress } from "@repo/ui/motion/scroll-progress";
import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroShot } from "@/components/hero-shot";
import { HowItWorks } from "@/components/how-it-works";
import { PageTransition } from "@/components/page-transition";
import { DEFAULT_TITLE, SITE } from "@/lib/site";

// "absolute" skips the "%s · Shipwright" template: the home title already says Shipwright.
export const metadata: Metadata = {
  title: { absolute: DEFAULT_TITLE },
  description: SITE.description,
};

export default function Page() {
  return (
    <>
      {/* Outside PageTransition: a fixed bar shouldn't be part of the page snapshot that fades and slides. */}
      <ScrollProgress />
      <PageTransition>
        <div className="container-page">
          {/* Server-rendered and visible on first paint: only the product shot below animates. */}
          <section className="flex flex-col items-center gap-6 pt-20 pb-16 text-center sm:pt-28">
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
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/demo" transitionTypes={["nav-forward"]}>
                  See a live report
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how">How it works</Link>
              </Button>
            </div>
          </section>

          <HeroShot />

          <HowItWorks />

          <Reveal className="mb-24 flex flex-col items-center gap-6 rounded-2xl border bg-card px-6 py-16 text-center">
            <h2 className="max-w-2xl text-h1 font-semibold">Find out what breaks before your users do.</h2>
            <p className="text-lg text-muted-foreground">The first scan is free and takes about five minutes.</p>
            <Button asChild size="lg">
              <Link href="/demo" transitionTypes={["nav-forward"]}>
                See a live report
                <ArrowRightIcon />
              </Link>
            </Button>
          </Reveal>
        </div>
      </PageTransition>
    </>
  );
}
