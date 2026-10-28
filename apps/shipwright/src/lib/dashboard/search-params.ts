// URL state for the issues table. Parsers come from "nuqs/server" so the same definitions work
// in Server Components (reading searchParams) and Client Components (useQueryStates).
import { createSerializer, parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { SEVERITIES } from "./types";

export const STATUS_FILTERS = ["open", "fixed", "all"] as const;

export const issuesSearchParams = {
  q: parseAsString.withDefault(""),
  severity: parseAsArrayOf(parseAsStringLiteral(SEVERITIES)).withDefault([]),
  status: parseAsStringLiteral(STATUS_FILTERS).withDefault("open"),
  sort: parseAsString.withDefault("severity.desc"),
  page: parseAsInteger.withDefault(1),
};

const serialize = createSerializer(issuesSearchParams, { clearOnDefault: true });

// Builds "/dashboard/issues?…". Values that equal their default are left out of the URL.
export function issuesUrl(values: Parameters<typeof serialize>[1]) {
  return serialize("/dashboard/issues", values);
}
