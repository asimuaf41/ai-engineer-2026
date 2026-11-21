import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import type { ConnectError } from "@/lib/connect/errors";

// One friendly alert for an error code. It shows OUR wording for the code, never the text that was in the address.
// `retryHref` is where "Try again" goes, or null when trying again would not help yet. It is a plain link (full page load):
// it can point at a route that redirects to GitHub or Supabase, which a client-side link must not prefetch.
export function ConnectAlert({ error, retryHref }: { error: ConnectError; retryHref: string | null }) {
  // Choosing not to connect, or a feature that isn't switched on yet, is not a failure: a calmer look.
  const calm = error.code === "access_denied" || error.retry === "none";
  return (
    <Alert variant={calm ? "warning" : "destructive"}>
      {calm ? <InfoIcon aria-hidden /> : <TriangleAlertIcon aria-hidden />}
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.body}</p>
        {retryHref ? (
          <Button asChild variant="outline" size="lg" className="mt-3 h-11 bg-background">
            <a href={retryHref}>Try again</a>
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
