"use client";

// "Name your workspace": the one field a new person fills in. Plain words, a pending button, and friendly errors.
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { enterTransition, fadeUp } from "@repo/ui/lib/motion";
import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { motion } from "motion/react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrg, type CreateOrgState } from "@/app/(private)/onboarding/actions";

const IDLE: CreateOrgState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <LoaderCircleIcon aria-hidden className="animate-spin motion-reduce:animate-none" />
          Creating your workspace…
        </>
      ) : (
        "Create workspace"
      )}
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, action] = useActionState(createOrg, IDLE);
  const failed = state.status === "error";

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={enterTransition} className="w-full max-w-md">
      <Card className="gap-6 py-6">
        <CardHeader className="gap-2 px-6 text-center">
          <CardTitle className="text-h2 font-semibold">Name your workspace</CardTitle>
          <CardDescription>It&apos;s where your team connects its app to Shipwright. One field, then you&apos;re in.</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <form action={action} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                name="name"
                autoComplete="organization"
                placeholder="Acme Labs"
                maxLength={80}
                required
                autoFocus
                defaultValue={failed ? state.name : ""}
                aria-invalid={failed}
                aria-describedby={failed ? "workspace-name-error" : "workspace-name-hint"}
                className="h-11 text-base"
              />
              {failed ? (
                <p id="workspace-name-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {state.message}
                </p>
              ) : (
                <p id="workspace-name-hint" className="text-sm text-muted-foreground">
                  Your company or product name works well.
                </p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
