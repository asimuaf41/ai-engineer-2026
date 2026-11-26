// URL state of the Code page: which kind chip is open (?kind=page). Parsers come from "nuqs/server", so the page (a Server
// Component) reads them and the view builds links from the same definition. A value that is not one of our kinds is ignored.
import { createSerializer, parseAsStringLiteral } from "nuqs/server";
import { KIND_ORDER, type FileKind } from "./code-map-view.ts";

export const codeSearchParams = {
  kind: parseAsStringLiteral(KIND_ORDER),
};

const serialize = createSerializer(codeSearchParams);

// The address of the Code page, with a kind open (or none). The "#code-map" keeps the person at the map after a click.
export function codeHref(slug: string, appId: string, kind: FileKind | null): string {
  const base = `/o/${slug}/apps/${appId}/code`;
  return kind ? `${serialize(base, { kind })}#code-map` : `${base}#code-map`;
}
