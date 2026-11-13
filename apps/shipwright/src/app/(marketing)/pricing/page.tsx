import { Reveal } from "@repo/ui/motion/reveal";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { CompareStrip } from "@/components/pricing/compare-strip";
import { Faq } from "@/components/pricing/faq";
import { FeatureTable } from "@/components/pricing/feature-table";
import { PlanCards } from "@/components/pricing/plan-cards";
import { PRICING_DESCRIPTION } from "@/lib/pricing";

// "absolute" skips the "%s · Shipwright" template: this title already ends with the brand.
export const metadata: Metadata = {
  title: { absolute: "Pricing: Free Scan, Fix Pack, Guardian | Shipwright" },
  description: PRICING_DESCRIPTION,
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section aria-labelledby={id} className="flex flex-col gap-6 pt-20">
        <h2 id={id} className="text-h2 font-semibold">
          {title}
        </h2>
        {children}
      </section>
    </Reveal>
  );
}

export default function Page() {
  return (
    <PageTransition>
      <div className="container-page pb-24">
        {/* Server-rendered and visible on first paint (no Reveal on the headline: it would delay LCP). */}
        <header className="flex flex-col items-center gap-4 pt-16 pb-12 text-center sm:pt-24">
          <p className="font-mono text-sm tracking-wider text-brand uppercase">Pricing</p>
          <h1 className="max-w-3xl text-h1 font-semibold">Simple pricing to make your vibe-coded app safe to launch</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Start with a free scan. Pay only when you want us to fix what we find, or to keep watching every push.
          </p>
        </header>

        <section aria-label="Plans">
          <PlanCards />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Paid plans open at launch. Until then, see exactly what you would get in a sample report.
          </p>
        </section>

        <Section id="compare" title="What you do today, and what changes">
          <CompareStrip />
        </Section>

        <Section id="features" title="What each plan includes">
          <FeatureTable />
        </Section>

        <Section id="faq" title="Questions founders ask">
          <Faq />
        </Section>
      </div>
    </PageTransition>
  );
}
