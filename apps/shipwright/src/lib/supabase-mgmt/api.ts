// Reading from the Supabase Management API with an access token: which organizations the person can see, and their projects.
// Pure code with a swappable `fetch`, so tests use a pretend Supabase.
import { z } from "zod";
import { MgmtApiError } from "./errors.ts";
import { REQUEST_TIMEOUT_MS, SUPABASE_API } from "./oauth-core.ts";

// Only paths of the form /v1/... can ever be requested, so nothing a user types can choose where the token is sent.
const ALLOWED_PATH = /^\/v1\/[a-z0-9/_-]*$/;

export async function mgmtGet<T>(path: string, accessToken: string, schema: z.ZodType<T>, send: typeof fetch = fetch): Promise<T> {
  if (!ALLOWED_PATH.test(path)) throw new Error("Management API paths must look like /v1/...");

  let response: Response;
  try {
    response = await send(`${SUPABASE_API}${path}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      cache: "no-store",
      // A hung Supabase must not hang our page.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // No connection, or it timed out. 504 = "the other side did not answer". (The thrown error is dropped on purpose.)
    throw new MgmtApiError(504);
  }
  if (!response.ok) throw new MgmtApiError(response.status);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new MgmtApiError(502);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new MgmtApiError(502);
  return parsed.data;
}

export type SupabaseOrg = { slug: string; name: string };

// `slug` is the stable name of the organization. (`id` is deprecated in the API.)
export async function listOrganizations(accessToken: string, send?: typeof fetch): Promise<SupabaseOrg[]> {
  return mgmtGet("/v1/organizations", accessToken, z.array(z.object({ slug: z.string().min(1), name: z.string() })), send);
}

export type SupabaseProject = {
  ref: string;
  name: string;
  region: string;
  status: string;
  organizationSlug: string;
};

// `ref` is the project's 20-letter reference. (`id` is deprecated in the API.)
export async function listProjects(accessToken: string, send?: typeof fetch): Promise<SupabaseProject[]> {
  const projects = await mgmtGet(
    "/v1/projects",
    accessToken,
    z.array(
      z.object({
        ref: z.string().regex(/^[a-z]{20}$/),
        name: z.string(),
        region: z.string(),
        status: z.string(),
        organization_slug: z.string(),
      }),
    ),
    send,
  );
  return projects.map((project) => ({
    ref: project.ref,
    name: project.name,
    region: project.region,
    status: project.status,
    organizationSlug: project.organization_slug,
  }));
}
