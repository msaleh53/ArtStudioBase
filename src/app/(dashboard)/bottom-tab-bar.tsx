"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Image as ImageIcon, Users, Wallet, Package, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, type NavItem } from "./nav-links";

const TAB_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/artworks": ImageIcon,
  "/finance": Wallet,
  "/inventory": Package,
};

const STANDALONE_HREFS = ["/dashboard", "/artworks", "/finance", "/inventory"] as const;

function findItem(href: string): NavItem | undefined {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  return undefined;
}

const relationsItems = NAV_GROUPS.filter((g) => g.label === "Clients" || g.label === "Exhibitions").flatMap(
  (g) => g.items,
);

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabBar({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [clientsOpen, setClientsOpen] = useState(false);

  const [dashboardItem, artworksItem, financeItem, inventoryItem] = STANDALONE_HREFS.map(findItem);
  const clientsActive = relationsItems.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline flex items-stretch h-16">
        {dashboardItem && <TabLink item={dashboardItem} active={isActive(pathname, dashboardItem.href)} />}
        {artworksItem && <TabLink item={artworksItem} active={isActive(pathname, artworksItem.href)} />}
        {relationsItems.length > 0 && (
          <button
            type="button"
            onClick={() => setClientsOpen(true)}
            aria-current={clientsActive ? "page" : undefined}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
              clientsActive ? "bg-cobalt-wash text-deep-cobalt" : "text-ink-charcoal"
            }`}
          >
            {clientsActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-electric-cobalt" />
            )}
            <Users className="size-5" />
            Relations
          </button>
        )}
        {financeItem && <TabLink item={financeItem} active={isActive(pathname, financeItem.href)} />}
        {inventoryItem && <TabLink item={inventoryItem} active={isActive(pathname, inventoryItem.href)} />}
      </nav>

      {relationsItems.length > 0 && (
        <Dialog open={clientsOpen} onOpenChange={setClientsOpen}>
          <DialogContent
            showCloseButton
            className="inset-x-0 left-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-xl sm:max-w-none"
          >
            <DialogHeader>
              <DialogTitle>Relations</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1">
              {relationsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setClientsOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-ink-charcoal hover:bg-canvas-cream active:scale-[0.98] transition-[background-color,transform] duration-150 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm" className="rounded-pill w-full">
                Log out
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = TAB_ICONS[item.href];
  if (!Icon) return null;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
        active ? "bg-cobalt-wash text-deep-cobalt" : "text-ink-charcoal"
      }`}
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-electric-cobalt" />
      )}
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
