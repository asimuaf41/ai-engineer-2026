"use client";

// "Continue with GitHub". It asks Supabase to start the GitHub login. Supabase sends the browser to GitHub, and GitHub
// sends it back to /auth/callback on this site, which finishes the sign-in.
// This is the OAuth App used for LOGIN only. It asks for the profile and the email, never for access to repositories
// (repo access is the job of the GitHub App, later).
import { Button } from "@repo/ui/components/button";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

// The GitHub mark (Octicons, MIT). The installed icon set has no brand icons, so it is drawn here. Hidden from screen readers: the text says it.
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GitHubButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // Press Back on GitHub's page and the browser may restore this page from memory with the button still "busy". Reset it.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          // `next` is checked with safeNext() BEFORE it goes into the URL, so only a path on this site can ever be used.
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
          scopes: "read:user user:email",
        },
      });
      if (error) {
        console.warn(`[auth] GitHub sign-in could not start: code=${error.code ?? "unknown"}`);
        setFailed(true);
        setPending(false);
      }
      // No error: the browser is already on its way to GitHub, so the button stays busy until the page changes.
    } catch {
      console.warn("[auth] GitHub sign-in could not start");
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="lg" className="h-11 w-full" onClick={signIn} disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" />
            Opening GitHub…
          </>
        ) : (
          <>
            <GitHubMark className="size-4" />
            Continue with GitHub
          </>
        )}
      </Button>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t reach GitHub. Please try again, or use the email link above.
        </p>
      ) : null}
    </div>
  );
}
