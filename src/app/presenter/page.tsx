import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import PresenterDashboard from "./PresenterDashboard";

export default async function PresenterPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell hideNav>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-400">Loading presenter dashboard…</div>
          </div>
        }
      >
        <PresenterDashboard sessionId={params.sessionId ?? ""} />
      </Suspense>
    </AppShell>
  );
}
