"use client";

// The sign-in card. States: the form, sending (button busy), sent ("Check your inbox"), an error in plain words, and
// "sign-in isn't set up here". The card slides up once on arrival (the Day 5 fadeUp preset); reduced motion is handled by MotionProvider.
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { enterTransition, fadeUp } from "@repo/ui/lib/motion";
import { LoaderCircleIcon, MailCheckIcon, TriangleAlertIcon } from "lucide-react";
import { motion } from "motion/react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signInWithEmail, type SignInState } from "@/app/(marketing)/login/actions";
import { GitHubButton } from "@/components/auth/github-button";

const IDLE: SignInState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" />
          Sending your link…
        </>
      ) : (
        "Email me a sign-in link"
      )}
    </Button>
  );
}

function EmailForm({ next, onReset }: { next: string; onReset: () => void }) {
  const [state, action] = useActionState(signInWithEmail, IDLE);

  if (state.status === "sent") {
    return (
      // aria-live: a screen reader hears the result without having to hunt for it.
      <div aria-live="polite" className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/12 text-success">
          <MailCheckIcon aria-hidden className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent a sign-in link to <strong className="font-medium break-all text-foreground">{state.email}</strong>.
            Open it on this device to finish. It works once and expires soon.
          </p>
          <p className="text-sm text-muted-foreground">Nothing there? Look in your spam folder.</p>
        </div>
        <Button type="button" variant="ghost" className="h-11" onClick={onReset}>
          Use a different email
        </Button>
      </div>
    );
  }

  const failed = state.status === "error";
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            autoFocus
            defaultValue={failed ? state.email : ""}
            aria-invalid={failed}
            aria-describedby={failed ? "email-error" : undefined}
            className="h-11 text-base"
          />
          {failed ? (
            <p id="email-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.message}
            </p>
          ) : null}
        </div>
        <SubmitButton />
      </form>

      {/* Not shown once the email link was sent: that screen is about the inbox. */}
      <div aria-hidden className="flex items-center gap-3 text-xs text-muted-foreground">
        <span aria-hidden className="h-px flex-1 bg-border" />
        or
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <GitHubButton next={next} />
    </div>
  );
}

// Why the person was sent back to /login (the ?error= value). Plain words, no codes.
export type LoginError = "link_invalid" | "oauth_failed";

const ERROR_MESSAGES: Record<LoginError, string> = {
  link_invalid: "That link has expired or was already used. Enter your email to get a new one.",
  oauth_failed: "We couldn't sign you in with GitHub. If you cancelled, you can try again. You can also use the email link.",
};

export function LoginForm({ next, error, configured }: { next: string; error: LoginError | null; configured: boolean }) {
  // Bumping this key starts the form over (a fresh state), for "Use a different email".
  const [attempt, setAttempt] = useState(0);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={enterTransition} className="w-full max-w-md">
      <Card className="gap-6 py-6">
        <CardHeader className="gap-2 px-6 text-center">
          <CardTitle className="text-h2 font-semibold">Sign in to Shipwright</CardTitle>
          <CardDescription>No password. We email you a link, or you can use GitHub.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6">
          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {ERROR_MESSAGES[error]}
            </p>
          ) : null}
          {configured ? (
            <EmailForm key={attempt} next={next} onReset={() => setAttempt((count) => count + 1)} />
          ) : (
            <p role="status" className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Sign-in isn&apos;t set up on this server yet. Come back soon.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
