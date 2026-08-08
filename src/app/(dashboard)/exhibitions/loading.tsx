import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-44 mb-6" />
      <ul className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="bg-white rounded-card p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </li>
        ))}
      </ul>
    </main>
  );
}
