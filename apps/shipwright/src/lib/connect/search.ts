// Searching and sorting the lists on the connect page. Pure code.

// A list can have up to 2,000 repositories. Showing them all would make the page slow, so we show the first 50 matches
// and tell the person to type to narrow it down.
export const MAX_VISIBLE = 50;

// Case-insensitive match anywhere in the text. An empty search keeps everything.
export function filterBy<T>(items: readonly T[], query: string, text: (item: T) => string): T[] {
  const needle = query.trim().toLowerCase();
  return needle ? items.filter((item) => text(item).toLowerCase().includes(needle)) : [...items];
}

// Newest first. Anything that was never pushed (null) goes last. Ties keep their order.
export function newestFirst<T>(items: readonly T[], pushedAt: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => (pushedAt(b) ?? "").localeCompare(pushedAt(a) ?? ""));
}
