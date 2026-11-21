// Small text helpers for the connect page. Pure code.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

// "12 Nov 2026". Always in UTC and always built by hand, so the server and the browser print the SAME text
// (a "3 days ago" or a local time zone would differ between them and cause a hydration mismatch).
export function formatPushed(iso: string | null): string {
  if (!iso) return "No pushes yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Supabase project statuses are shouted codes. Show people a word they know. Unknown ones are shown calmly, not raw.
const PROJECT_STATUS: Record<string, string> = {
  ACTIVE_HEALTHY: "Running",
  ACTIVE_UNHEALTHY: "Running (needs attention)",
  COMING_UP: "Starting",
  UPGRADING: "Upgrading",
  RESTORING: "Restoring",
  RESTARTING: "Restarting",
  RESIZING: "Resizing",
  INACTIVE: "Paused",
  PAUSING: "Pausing",
  GOING_DOWN: "Stopping",
  PAUSE_FAILED: "Pause failed",
  RESTORE_FAILED: "Restore failed",
  INIT_FAILED: "Setup failed",
  REMOVED: "Removed",
};

export function projectStatusLabel(status: string): string {
  return Object.hasOwn(PROJECT_STATUS, status) ? (PROJECT_STATUS[status] as string) : "Status unknown";
}
