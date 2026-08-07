"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Studio",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/artworks", label: "Artworks" },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/customers", label: "Customers" },
      { href: "/commissions", label: "Commissions" },
      { href: "/exhibitions", label: "Exhibitions" },
    ],
  },
  {
    label: "Money",
    items: [{ href: "/finance", label: "Finance" }],
  },
  {
    label: "Inventory",
    items: [{ href: "/inventory", label: "Inventory" }],
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-steel-gray px-3 mb-1">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium ${
                    active
                      ? "bg-cobalt-wash text-electric-cobalt"
                      : "text-ink-charcoal hover:bg-canvas-cream"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-electric-cobalt" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
