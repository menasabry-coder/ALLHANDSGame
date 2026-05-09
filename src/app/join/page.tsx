import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import JoinFlow from "./JoinFlow";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode = params.code ?? "";

  return (
    <AppShell hideNav>
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1">
            <div className="text-gray-400 text-sm">Loading…</div>
          </div>
        }
      >
        <JoinFlow initialCode={initialCode} />
      </Suspense>
    </AppShell>
  );
}
