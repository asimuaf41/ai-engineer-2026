import { ChevronDownIcon } from "lucide-react";

// Answers follow the "Trust & data" section of docs/product/prd.md. They are for people, not for Google.
const FAQ = [
  {
    question: "Is my code safe with you?",
    answer:
      "This is how we design for it. Our GitHub App asks only for the permissions each feature needs. Your tokens are stored encrypted and are never sent to the browser or the app. Any proof we show has keys and personal data masked. And we do not train models on your code.",
  },
  {
    question: "Do you store my code?",
    answer:
      "We keep your code only so we can scan it. You can ask us to delete your code, its index, your findings and your tokens at any time.",
  },
  {
    question: "What if a fix breaks something?",
    answer:
      "Every fix arrives as a pull request. We never merge it for you: you review it and approve it. Each one comes with proof of the problem. A Fix Pack includes a re-scan within 30 days, and Guardian re-scans every week, so you can check the fix worked.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes, any time. Guardian is billed monthly, and you keep access until the end of the month you paid for. A Fix Pack is a one-time price and Expert is quoted per project, so there is nothing to cancel.",
  },
  {
    question: "What does “Expert” mean?",
    answer:
      "A senior developer fixes the complex problem for you, instead of an automatic pull request. Each job is quoted per project, starting at the price shown above.",
  },
] as const;

export function Faq() {
  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card">
      {FAQ.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3 font-medium outline-none marker:content-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDownIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="px-5 pb-5 text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
