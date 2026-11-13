# Shipwright: pricing (v1 hypothesis)

The plans live in code at `apps/shipwright/src/lib/pricing.ts`. Change them there first, then update this page.
Until launch every plan button goes to the sample report (/demo). The mobile app never sells (store rules); it only
links to the web.

## How we price

We price by value and by the alternatives, not by our hours or our AI costs. Costs set the floor, not the price.
A founder compares Shipwright with a $29 scanner (cheap, but leaves the work to them), a $799 manual audit (slow, no
fixes) and a $15K rescue.

## The table

| Plan | Id | Price | What they get | Why this number |
|------|----|-------|---------------|-----------------|
| Free scan | `free` | $0 | 1 app, production score, all finding titles, full detail and proof for the top 3 | Lead magnet. It costs us cents in AI. The SEO pages (Days 23–24) point here. |
| Fix Pack | `fix_pack` | $149 one-time per app | Full report with proof, up to 10 fix PRs, a re-scan within 30 days | Under the cheapest serious audit ($199–$799), and it includes fixes they don't get there. |
| Guardian (highlighted) | `guardian` | $39/month per app (annual: 2 months free) | Audit on every push, weekly re-scan, alerts, fix PRs (fair use), 3 seats | Above a $29 report-only scanner, because it fixes and watches. |
| Expert | `expert` | From $499, quoted | A senior developer (Asim) fixes the complex issue | Our escalation income. The SaaS sells our services. |

## What each plan costs us to serve

Filled on Day 22, when we have real numbers. Rule: the price must stay well above this.

| Plan | AI cost per scan | Other costs (servers, email, support) | Margin |
|------|------------------|----------------------------------------|--------|
| Free scan | TODO (Day 22). We expect cents. | TODO | TODO |
| Fix Pack | TODO (Day 22): one scan, up to 10 fix PRs and a re-scan | TODO | TODO |
| Guardian | TODO (Day 22): a scan on every push plus a weekly re-scan; set the fair-use limit from this | TODO | TODO |
| Expert | TODO (Day 22): hours of a senior developer | TODO | TODO |

## Questions the interviews must answer

1. What did you pay (money or time) the last time you fixed a security problem? Do $149 and $39 feel low, fair or high next to that?
2. Do you want to pay once to fix a problem, or monthly to stay safe? Ask what they did before, not what they would do.
3. Who pays for it, and do they need to approve it? This decides if 3 seats, per-app pricing and the annual deal fit.

## Open items

- Day 21: add the Stripe price ids to `pricing.ts` (Guardian also needs a yearly price).
- Day 22: fill the cost table above.
- After the interviews: keep or change each number.
