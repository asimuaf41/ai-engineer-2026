import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#lib/utils"

// The colour sits on the border, the background tint and the icon. The words stay in the normal text colour,
// so they are easy to read in light and dark mode and the message never depends on colour alone.
const alertVariants = cva(
  "relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm text-foreground has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:text-(--alert-accent)",
  {
    variants: {
      variant: {
        default: "border-border bg-card [--alert-accent:var(--muted-foreground)]",
        destructive: "border-destructive/30 bg-destructive/10 [--alert-accent:var(--destructive)]",
        warning: "border-medium/30 bg-medium/10 [--alert-accent:var(--medium)]",
        success: "border-success/30 bg-success/10 [--alert-accent:var(--success)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Problems (destructive, warning) use role="alert" so a screen reader announces them. Calm information uses role="status".
function Alert({
  className,
  variant = "default",
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const defaultRole = variant === "destructive" || variant === "warning" ? "alert" : "status"
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={role ?? defaultRole}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium tracking-tight [svg~&]:col-start-2", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground [svg~&]:col-start-2 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
