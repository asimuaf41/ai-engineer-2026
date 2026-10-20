export type Experiment = {
  id: string;
  title: string;
  href: string;
  summary: string;
};

export const EXPERIMENTS = [
  {
    id: "01",
    title: "Security audit agent",
    href: "/",
    summary: "Claude reads a file with a tool and lists production problems.",
  },
  {
    id: "02",
    title: "Secret leak scanner",
    href: "/experiments/02-secret-scan",
    summary: "Paste code or an env file and find leaked keys — all in your browser.",
  },
] as const satisfies readonly Experiment[];
