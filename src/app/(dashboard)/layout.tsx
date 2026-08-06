import Link from "next/link";
import { logout } from "./actions";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-cream">
      <nav className="bg-white border-b border-hairline px-8 py-4 flex items-center justify-between">
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-ink-charcoal font-medium">Dashboard</Link>
          <Link href="/artworks" className="text-ink-charcoal font-medium">Artworks</Link>
          <Link href="/customers" className="text-ink-charcoal font-medium">Customers</Link>
          <Link href="/commissions" className="text-ink-charcoal font-medium">Commissions</Link>
          <Link href="/exhibitions" className="text-ink-charcoal font-medium">Exhibitions</Link>
          <Link href="/finance" className="text-ink-charcoal font-medium">Finance</Link>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" className="rounded-pill">Log out</Button>
        </form>
      </nav>
      {children}
    </div>
  );
}
