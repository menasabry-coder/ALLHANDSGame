"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import Panel from "@/components/Panel";
import QRCode from "@/components/QRCode";
import { GAME_NAME, GAME_SUBTITLE } from "@/config/gameConfig";
import type { GameEvent, GameSessionDto } from "@/types/game";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticipantStats {
  count: number;
  byArea: Record<string, number>;
  byAttitude: Record<string, number>;
  byUsage: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Simple horizontal bar chart — no external library
// ---------------------------------------------------------------------------

function DistributionBars({
  data,
  colorClass = "bg-blue-500",
}: {
  data: Record<string, number>;
  colorClass?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) {
    return <p className="text-xs text-gray-600 italic">No data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([label, count]) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-300 truncate max-w-[70%]">{label}</span>
            <span className="text-gray-500">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function PresenterDashboard({
  sessionId,
}: {
  sessionId: string;
}) {
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [stats, setStats] = useState<ParticipantStats>({
    count: 0,
    byArea: {},
    byAttitude: {},
    byUsage: {},
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const esRef = useRef<EventSource | null>(null);

  // Compute join URL once we have the session code
  useEffect(() => {
    if (typeof window !== "undefined" && session?.code) {
      setJoinUrl(`${window.location.origin}/join?code=${session.code}`);
    }
  }, [session?.code]);

  // Fetch session and stats
  const fetchStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/participants`),
      ]);
      if (sRes.ok) {
        const s = await sRes.json();
        setSession(s);
      } else {
        setLoadError("Session not found.");
      }
      if (pRes.ok) {
        const p = await pRes.json();
        setStats(p);
      }
    } catch {
      setLoadError("Could not load session data.");
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // SSE subscription — refresh stats on participant events
  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/events?sessionId=${sessionId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event: GameEvent = JSON.parse(e.data as string);

        if (
          event.type === "participant:joined" ||
          event.type === "session:updated"
        ) {
          fetchStats();
        }

        if (event.type === "session:updated") {
          const p = event.payload as { status?: string };
          if (p.status) {
            setSession((prev) =>
              prev
                ? { ...prev, status: p.status as GameSessionDto["status"] }
                : prev
            );
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      es.close();
    };
  }, [sessionId, fetchStats]);

  // ---------------------------------------------------------------------------
  // Render: no session selected
  // ---------------------------------------------------------------------------

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <h1 className="text-3xl font-bold text-gray-300">
          No session selected.
        </h1>
        <p className="text-gray-500 text-sm">
          Go to{" "}
          <a href="/admin" className="text-blue-400 underline">
            Admin
          </a>{" "}
          to create or start a session, then open the presenter view from there.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: full dashboard
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-8 gap-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {GAME_NAME}
          </h1>
          <p className="text-gray-400 text-lg mt-1">{GAME_SUBTITLE}</p>
          {session && (
            <p className="text-gray-500 text-sm mt-2 font-mono">
              {session.title} &middot;{" "}
              <span className="font-bold text-gray-300 tracking-widest">
                {session.code}
              </span>
            </p>
          )}
        </div>

        {/* QR Code */}
        {joinUrl && (
          <div className="flex flex-col items-center gap-2 shrink-0">
            <QRCode value={joinUrl} size={140} />
            <p className="text-xs text-gray-500">Scan to join</p>
            <p className="text-xs font-mono font-bold text-gray-300 tracking-widest">
              {session?.code}
            </p>
          </div>
        )}
      </header>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Participants"
          value={stats.count}
          description="Joined this session"
          icon="👥"
          accent="teal"
        />
        <MetricCard
          label="Active Round"
          value={session?.activeRoundId ?? "—"}
          description="Current game round"
          icon="🎯"
          accent="blue"
        />
        <MetricCard
          label="Session Status"
          value={session?.status ?? "—"}
          description="Game state"
          icon="📡"
          accent="purple"
        />
      </div>

      {/* Distribution panels */}
      <div className="grid grid-cols-3 gap-6">
        <Panel title="Engineering Area" subtitle="Distribution of participants">
          <DistributionBars data={stats.byArea} colorClass="bg-teal-500" />
        </Panel>

        <Panel title="AI Attitude" subtitle="How participants feel about AI">
          <DistributionBars data={stats.byAttitude} colorClass="bg-blue-500" />
        </Panel>

        <Panel title="AI Usage" subtitle="Current adoption level">
          <DistributionBars data={stats.byUsage} colorClass="bg-purple-500" />
        </Panel>
      </div>

      {/* Footer hint */}
      <p className="text-center text-xs text-gray-700 mt-auto">
        Presenter view — participants see the waiting screen. Share the QR code
        or code above.
      </p>
    </div>
  );
}
