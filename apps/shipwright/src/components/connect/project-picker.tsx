"use client";

// The Supabase projects the person can pick from. Same idea as the repository picker: real forms, a search box only when the
// list is long enough to need one, and read-only for people who may not choose.
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { LoaderCircleIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { projectStatusLabel } from "@/lib/connect/format";
import { filterBy, MAX_VISIBLE } from "@/lib/connect/search";
import type { ProjectOption } from "@/lib/connect/state";

const ROW = "flex min-h-14 w-full items-center gap-3 rounded-xl border bg-background px-4 py-2 text-left";
// A short list needs no search box.
const SEARCH_FROM = 8;

function ProjectDetails({ project }: { project: ProjectOption }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-medium [overflow-wrap:anywhere]">{project.name}</span>
        <span className="block text-xs text-muted-foreground">Region {project.region}</span>
      </span>
      <Badge variant="outline" className="shrink-0">
        {projectStatusLabel(project.status)}
      </Badge>
    </>
  );
}

function ChooseButton({ project }: { project: ProjectOption }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(ROW, "outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70")}
    >
      <ProjectDetails project={project} />
      {pending ? <LoaderCircleIcon aria-hidden className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : null}
      {pending ? <span className="sr-only">Choosing this project</span> : null}
    </button>
  );
}

export function ProjectPicker({
  slug,
  projects,
  canChoose,
  action,
}: {
  slug: string;
  projects: ProjectOption[];
  canChoose: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => filterBy(projects, query, (project) => project.name), [projects, query]);
  const shown = matches.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col gap-3">
      {projects.length >= SEARCH_FROM ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={searchId}>Find a project</Label>
          <Input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type to search" autoComplete="off" className="h-11 text-base" />
        </div>
      ) : null}
      {matches.length > MAX_VISIBLE ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Showing the first {MAX_VISIBLE} of {matches.length} projects. Type to narrow it down.
        </p>
      ) : null}
      {shown.length > 0 ? (
        <ul aria-label="Supabase projects" tabIndex={canChoose ? undefined : 0} className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {shown.map((project) => (
            <li key={project.ref}>
              {canChoose ? (
                <form action={action}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="ref" value={project.ref} />
                  <ChooseButton project={project} />
                </form>
              ) : (
                <div className={ROW}>
                  <ProjectDetails project={project} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          {query.trim() ? "No project matches your search." : "No projects to show."}
        </p>
      )}
    </div>
  );
}
