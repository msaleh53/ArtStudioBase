import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto space-y-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </main>
  );
}
