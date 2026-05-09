import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import ParticipantWaiting from "./ParticipantWaiting";

export default async function ParticipantPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; participantId?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell hideNav>
      <Suspense
        fallback={
          <div className="flex items-center justify-center flex-1">
            <div className="text-gray-400 text-sm">Loading…</div>
          </div>
        }
      >
        <ParticipantWaiting
          sessionId={params.sessionId ?? ""}
          participantId={params.participantId ?? ""}
        />
      </Suspense>
    </AppShell>
  );
}
