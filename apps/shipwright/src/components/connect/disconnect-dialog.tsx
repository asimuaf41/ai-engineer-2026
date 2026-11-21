"use client";

// "Disconnect" with a confirmation that says EXACTLY what will happen, so nobody has to guess.
// GitHub: we never stored a GitHub token (only which installation is linked), so we say that, and point to GitHub for the rest.
// Supabase: we did store tokens, in our secret vault, and we delete them.
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/components/dialog";
import { ExternalLinkIcon, LoaderCircleIcon } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { FormAction } from "./types";

const COPY = {
  github: {
    trigger: "Disconnect GitHub",
    title: "Disconnect GitHub?",
    what: "We remove the link between Shipwright and your GitHub installation. We didn't store a GitHub token, so there is nothing else to delete.",
    more: "To remove Shipwright's access fully, also uninstall the Shipwright app on GitHub.",
    linkLabel: "Open your GitHub installations",
    href: "https://github.com/settings/installations",
  },
  supabase: {
    trigger: "Disconnect Supabase",
    title: "Disconnect Supabase?",
    what: "We delete the access tokens we stored for your Supabase account. Shipwright can no longer reach your Supabase projects.",
    more: "You can also remove Shipwright's access any time from your Supabase account.",
    linkLabel: "Open Supabase",
    href: "https://supabase.com/dashboard",
  },
} as const;

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="lg" className="h-11" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" />
          Disconnecting…
        </>
      ) : (
        "Disconnect"
      )}
    </Button>
  );
}

export function DisconnectDialog({ slug, kind, action }: { slug: string; kind: "github" | "supabase"; action: FormAction }) {
  const copy = COPY[kind];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg" className="h-11">
          {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.what}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{copy.more}</p>
        <a
          href={copy.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          {copy.linkLabel}
          <ExternalLinkIcon aria-hidden className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="lg" className="h-11">
              Cancel
            </Button>
          </DialogClose>
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="kind" value={kind} />
            <ConfirmButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
