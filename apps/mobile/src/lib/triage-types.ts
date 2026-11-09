export const TRIAGE_STATUSES = ["open", "fixed", "snoozed", "dismissed", "escalated"] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
