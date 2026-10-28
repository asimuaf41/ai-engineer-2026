import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardHeader } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { Skeleton } from "@repo/ui/components/skeleton";
import { duration, spring } from "@repo/ui/lib/motion";
import { Loader2Icon } from "lucide-react";
import * as motion from "motion/react-client";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IssueCard } from "@/components/issue-card";
import { MotionShowcase } from "@/components/motion-showcase";
import { PageTransition } from "@/components/page-transition";
import { SAMPLE_ISSUES } from "@/lib/sample-issues";

export const metadata: Metadata = {
  title: "Design system — Shipwright",
};

// Each swatch pairs a token with the token used for text on top of it.
// "destructive" has no foreground token of its own, so it reuses primary-foreground.
const SWATCHES = [
  { name: "background", text: "foreground" },
  { name: "card", text: "card-foreground" },
  { name: "primary", text: "primary-foreground" },
  { name: "secondary", text: "secondary-foreground" },
  { name: "muted", text: "muted-foreground" },
  { name: "accent", text: "accent-foreground" },
  { name: "brand", text: "brand-foreground" },
  { name: "destructive", text: "primary-foreground" },
];

const BUTTON_VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;

// Values are read from the motion tokens, never typed here, so this table can't drift from the code.
const MOTION_TOKENS = [
  { name: "duration.fast", value: `${Math.round(duration.fast * 1000)} ms`, use: "Leaving the screen, hover and press feedback" },
  { name: "duration.base", value: `${Math.round(duration.base * 1000)} ms`, use: "Small state changes: fades, colors, toggles" },
  { name: "duration.slow", value: `${Math.round(duration.slow * 1000)} ms`, use: "Entering the screen: reveals and lists" },
  {
    name: "spring.snappy",
    value: `${spring.snappy.visualDuration}s · bounce ${spring.snappy.bounce}`,
    use: "Small, direct movement: pills, buttons",
  },
  {
    name: "spring.smooth",
    value: `${spring.smooth.visualDuration}s · bounce ${spring.smooth.bounce}`,
    use: "Default for layout changes and larger movement",
  },
];

// One critical, one high and one already-fixed issue, so the card styles and the "Fixed" badge all show.
const DESIGN_ISSUE_IDS = ["svc-key", "orders-rls", "ai-keystroke"];

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-6 py-12 md:grid-cols-[14rem_1fr] md:gap-10">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-h2 font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function Page() {
  return (
    <PageTransition>
      <main className="container-page py-16">
        <header className="flex flex-col gap-3 pb-12">
          <p className="font-mono text-sm tracking-wider text-brand uppercase">Shipwright UI · v1</p>
          <h1 className="text-h1 font-semibold">Design system</h1>
          <p className="max-w-prose text-muted-foreground">
            The colors, type, and components every Shipwright screen is built from, all driven by tokens in one file.
          </p>
        </header>

        <Separator />

        <Section id="colors" title="Color tokens" intro="Change a token once and the whole product follows, in light and dark.">
          {/* Inline CSS variables are fine here: this page exists to document the tokens themselves. */}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SWATCHES.map((swatch) => (
              <li key={swatch.name}>
                <div
                  className="flex h-20 items-end rounded-lg border p-3"
                  style={{ background: `var(--${swatch.name})`, color: `var(--${swatch.text})` }}
                >
                  <span className="text-sm font-medium">{swatch.name}</span>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">--{swatch.name}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="critical">Critical</Badge>
            <Badge variant="high">High</Badge>
            <Badge variant="medium">Medium</Badge>
            <Badge variant="low">Low</Badge>
            <Badge variant="success">Success</Badge>
          </div>
        </Section>

        <Separator />

        <Section id="type" title="Typography" intro="Geist Sans for text, Geist Mono for code and numbers.">
          <div className="flex flex-col gap-4">
            <p className="text-display font-semibold">Ship it safely.</p>
            <p className="text-h1 font-semibold">Heading one</p>
            <p className="text-h2 font-semibold">Heading two</p>
            <p className="text-h3 font-semibold">Heading three</p>
            <p className="max-w-prose">
              Body text is for explanations. Keep lines short enough to read comfortably, and let the headings do the
              heavy lifting.
            </p>
            <p className="text-muted-foreground">Muted text is for secondary details.</p>
            <p className="font-mono tabular-nums">score 87/100 · 3 issues · 1,204 files</p>
          </div>
        </Section>

        <Separator />

        <Section id="motion" title="Motion" intro="Few durations, two springs. Everything respects reduced motion.">
          <div className="flex flex-col gap-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Motion tokens</caption>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Token
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Value
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Use for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MOTION_TOKENS.map((token) => (
                    <tr key={token.name} className="border-b">
                      <th scope="row" className="py-2 pr-4 font-mono font-normal">
                        {token.name}
                      </th>
                      <td className="py-2 pr-4 font-mono tabular-nums">{token.value}</td>
                      <td className="py-2 text-muted-foreground">{token.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MotionShowcase />

            <div className="flex flex-col gap-2">
              {/* react-client lets a Server Component render a motion element; asChild means one <button>.
                  Button's own transition-all and active:translate-y-px would fight motion's transform,
                  so this demo keeps only the color transition and turns the CSS press-nudge off. */}
              <Button asChild className="w-fit transition-colors active:not-aria-[haspopup]:translate-y-0">
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}>
                  Run free scan
                </motion.button>
              </Button>
              <p className="text-sm text-muted-foreground">Press and hold: the button gives way under your finger.</p>
            </div>
          </div>
        </Section>

        <Separator />

        <Section id="buttons" title="Buttons" intro="Six variants, two extra sizes, and a loading state.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>
                <Loader2Icon className="animate-spin" />
                Scanning…
              </Button>
            </div>
          </div>
        </Section>

        <Separator />

        <Section id="forms" title="Forms" intro="Every input has a label. Errors say what to do next.">
          <div className="flex max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input id="repo-url" placeholder="https://github.com/you/your-app" aria-describedby="repo-url-help" />
              <p id="repo-url-help" className="text-sm text-muted-foreground">
                We only read the code. Nothing is changed until you approve a fix.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="supabase-url">Supabase project URL</Label>
              <Input id="supabase-url" defaultValue="abcd.supabase.co" aria-invalid="true" aria-describedby="supabase-url-error" />
              <p id="supabase-url-error" className="text-sm text-destructive">
                Use the full URL, like https://abcd.supabase.co
              </p>
            </div>
          </div>
        </Section>

        <Separator />

        <Section id="issues" title="Issue cards" intro="One finding per card. Severity is shown by color and by word.">
          <div className="grid gap-4 lg:grid-cols-2">
            {SAMPLE_ISSUES.filter((issue) => DESIGN_ISSUE_IDS.includes(issue.id)).map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
            {/* Loading state: purely visual, so it is hidden from screen readers. */}
            <Card aria-hidden="true">
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <div className="flex flex-col gap-2 px-(--card-spacing)">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Card>
          </div>
        </Section>
      </main>
    </PageTransition>
  );
}
