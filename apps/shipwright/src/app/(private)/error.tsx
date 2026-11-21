"use client";

import { Button } from "@repo/ui/components/button";

// Shown when a private page fails to load (for example the database is not reachable). The real error stays in the server log.
export default function PrivateError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center gap-4 px-4">
      <div role="alert" className="space-y-2">
        <h1 className="text-h2 font-semibold">We could not load this page</h1>
        <p className="text-muted-foreground">
          Something went wrong on our side. Your work is safe. Try again, and if it keeps happening, check that the database is running and set up.
        </p>
      </div>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
