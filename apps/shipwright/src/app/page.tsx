import { buttonClass } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/ui/card";

const steps = [
  { title: "Find", body: "Scan the app and surface every real security and reliability problem." },
  { title: "Prove", body: "Reproduce each problem with evidence, not guesses." },
  { title: "Fix", body: "Ship a pull request that fixes it, reviewed before it lands." },
  { title: "Guard", body: "Watch every future push so the same problem can't come back." },
];

export default function Page() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-6 py-24 text-center">
      <span className="rounded-full border border-white/15 px-4 py-1 text-sm text-white/70">
        Shipwright · building from Day 10
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Your AI-built app works in the demo. Let&apos;s make it survive production.
      </h1>
      <p className="max-w-2xl text-lg text-white/70">
        Vibe-coded apps ship fast and break quietly. Shipwright finds the security and
        reliability problems hiding under the surface, proves they&apos;re real, and fixes them
        before customers do.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a className={buttonClass("primary")} href="http://localhost:3001">
          Try the audit lab
        </a>
        <a className={buttonClass("ghost")} href="#how">
          How it works
        </a>
      </div>
      <div id="how" className="grid w-full grid-cols-1 gap-6 pt-12 text-left sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card key={step.title}>
            <CardTitle>{step.title}</CardTitle>
            <p className="mt-2 text-sm text-white/70">{step.body}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
