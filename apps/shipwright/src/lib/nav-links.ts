// The marketing header's links. The desktop nav and the phone drawer both read this list,
// so a new page is added in ONE place.
export const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/demo", label: "Live demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ask", label: "Ask" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/design", label: "Design system" },
] as const;

// "/#how" is a spot on the home page, so it is never "the current page". Everything else matches its path.
export function isNavActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
