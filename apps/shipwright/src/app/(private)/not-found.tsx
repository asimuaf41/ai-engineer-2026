import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { PrivateHeader } from "@/components/org/private-header";

// One page for both "there is no such workspace" and "you are not a member". It must not reveal which one it is.
export default function NotFound() {
  return (
    <>
      <PrivateHeader />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-mono text-sm tracking-wider text-brand uppercase">404</p>
          <h1 className="text-h1 font-semibold">We couldn&apos;t find that page</h1>
          <p className="max-w-md text-muted-foreground">This workspace doesn&apos;t exist, or you don&apos;t have access to it.</p>
          <Button asChild size="lg" className="h-11">
            <Link href="/onboarding">Go to your workspace</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
