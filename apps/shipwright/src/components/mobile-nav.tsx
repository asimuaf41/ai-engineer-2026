"use client";

// The phone menu: a drawer that slides in from the right. The Sheet (Radix Dialog) already gives us a focus trap,
// Escape to close, locked page scroll and the right ARIA roles. We add the animated hamburger and the staggered links.
import { Button } from "@repo/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { ThemeToggle } from "@repo/ui/components/theme-toggle";
import { duration, ease, enterTransition, fadeUp } from "@repo/ui/lib/motion";
import { cn } from "@repo/ui/lib/utils";
import { motion, stagger } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthMenu } from "@/components/auth/auth-menu";
import { Logo } from "@/components/logo";
import { isNavActive, NAV_LINKS } from "@/lib/nav-links";

// Two bars that rotate into an X. Only transform changes, so it stays smooth.
function MenuIcon({ open }: { open: boolean }) {
  const bar = "absolute left-0 h-0.5 w-full rounded-full bg-current";
  const transition = { duration: duration.base, ease: ease.inOut };
  return (
    <span aria-hidden className="relative block h-3 w-5">
      <motion.span
        initial={false}
        className={cn(bar, "top-0")}
        animate={open ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={transition}
      />
      <motion.span
        initial={false}
        className={cn(bar, "bottom-0")}
        animate={open ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={transition}
      />
    </span>
  );
}

export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the drawer when the page changes (e.g. back button), without an effect: React lets us adjust state while rendering.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Open menu"
          className={cn("size-11", className)}
        >
          <MenuIcon open={open} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(85vw,20rem)] gap-0 p-0 data-[side=right]:sm:max-w-80"
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <SheetTitle asChild>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Logo />
            </Link>
          </SheetTitle>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close menu"
              className="size-11"
            >
              <MenuIcon open />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>

        <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
          {/* Links wait 0.1s for the panel to slide in, then appear one after another. */}
          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  delayChildren: stagger(0.05, { startDelay: 0.1 }),
                },
              },
            }}
            className="flex flex-col gap-1"
          >
            {NAV_LINKS.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <motion.li
                  key={link.href}
                  variants={fadeUp}
                  transition={enterTransition}
                >
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center rounded-lg px-3 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "bg-accent text-foreground ring-1 ring-border"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        </nav>

        <div className="flex flex-col gap-3 border-t p-4">
          <AuthMenu variant="drawer" onNavigate={() => setOpen(false)} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            Theme
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
