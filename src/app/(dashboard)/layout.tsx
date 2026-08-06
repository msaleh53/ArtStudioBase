import { logout } from "./actions";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-cream flex">
      <aside className="w-[220px] shrink-0 bg-white border-r border-hairline p-4 flex flex-col justify-between sticky top-0 h-screen">
        <div>
          <p className="font-semibold text-ink-charcoal px-3 mb-4">Studio</p>
          <NavLinks />
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" className="rounded-pill w-full">Log out</Button>
        </form>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
