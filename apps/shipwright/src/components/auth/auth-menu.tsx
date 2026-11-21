"use client";

// The right side of the site header: "Sign in" when signed out, an avatar menu (email + Sign out) when signed in.
// It asks the BROWSER who is signed in, so the public pages stay static (a server check would make every page dynamic).
// Until it knows, it shows an empty circle of the same size, so the header doesn't jump.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured } from "@/lib/env.client";
import { signOut } from "@/lib/auth-actions";
import { createClient } from "@/lib/supabase/client";

type State =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; email: string | null };

// variant "drawer": full-width rows for the phone menu. onNavigate lets the drawer close itself after a click.
export function AuthMenu({
  variant = "menu",
  onNavigate,
}: {
  variant?: "menu" | "drawer";
  onNavigate?: () => void;
}) {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<State>({ status: "loading" });
  const signOutForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    let active = true;

    // getClaims() checks the token's signature. (getSession() would only read the cookie.)
    const refresh = async () => {
      const { data } = await supabase.auth.getClaims();
      if (!active) return;
      const claims = data?.claims;
      setState(
        claims
          ? {
              status: "in",
              email: typeof claims.email === "string" ? claims.email : null,
            }
          : { status: "out" },
      );
    };

    void refresh();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return; // already handled by the first refresh()
      // Don't call Supabase from inside this callback (it can deadlock); do it on the next tick.
      setTimeout(() => void refresh(), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  // Sign-in isn't set up on this server: show nothing rather than a button that can't work.
  if (!configured) return null;

  const drawer = variant === "drawer";

  if (state.status === "loading")
    return <div aria-hidden className={drawer ? "h-11" : "size-8"} />;

  if (state.status === "out") {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className={
          drawer
            ? "flex h-11 items-center justify-center rounded-lg border text-base font-medium text-foreground hover:bg-accent"
            : "rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
        }
      >
        Sign in
      </Link>
    );
  }

  if (drawer) {
    return (
      <form
        action={signOut}
        onSubmit={() => setState({ status: "out" })}
        className="flex flex-col gap-2"
      >
        <p className="truncate text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {state.email ?? "your account"}
          </span>
        </p>
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-lg border text-base font-medium text-foreground hover:bg-accent"
        >
          Sign out
        </button>
      </form>
    );
  }

  const initial = (state.email ?? "?").charAt(0).toUpperCase();
  return (
    <>
      {/* The real sign-out is a Server Action. The menu item below submits this form. */}
      <form
        ref={signOutForm}
        action={signOut}
        onSubmit={() => setState({ status: "out" })}
        hidden
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {initial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
            <span className="text-xs text-muted-foreground">Signed in as</span>
            <span className="truncate text-sm font-medium text-foreground">
              {state.email ?? "your account"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              signOutForm.current?.requestSubmit();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
