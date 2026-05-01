"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Panel from "@/components/Panel";
import type { GameEvent } from "@/types/game";
import type { GameSessionDto, ParticipantDto } from "@/types/game";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface Props {
  sessionId: string;
  participantId: string;
}

export default function ParticipantWaiting({ sessionId, participantId }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [participant, setParticipant] = useState<ParticipantDto | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const esRef = useRef<EventSource | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!sessionId || !participantId) {
      setError("Missing session or participant information.");
      return;
    }

    async function loadData() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ existingParticipantId: participantId }),
          }),
        ]);

        if (sRes.ok) {
          const s = await sRes.json();
          setSession(s);
        }

        if (pRes.ok) {
          const p = await pRes.json();
          setParticipant(p);
        } else {
          setError("Could not load your profile. Try rejoining.");
        }
      } catch {
        setError("Could not connect to the server.");
      }
    }

    loadData();
  }, [sessionId, participantId]);

  // SSE subscription
  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/events?sessionId=${sessionId}`);
    esRef.current = es;

    es.onopen = () => setConnStatus("connected");
    es.onerror = () => {
      setConnStatus("disconnected");
    };

    es.onmessage = (e) => {
      try {
        const event: GameEvent = JSON.parse(e.data as string);

        if (event.type === "session:updated") {
          const payload = event.payload as { status: string };
          setSession((prev) =>
            prev ? { ...prev, status: payload.status as GameSessionDto["status"] } : prev
          );
        }

        if (event.type === "question:activated") {
          // In a future phase, navigate to the question screen
          const payload = event.payload as { questionId: string | null };
          setSession((prev) =>
            prev ? { ...prev, activeQuestionId: payload.questionId } : prev
          );
        }

        if (event.type === "game:completed") {
          router.push(`/report?sessionId=${sessionId}`);
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      es.close();
    };
  }, [sessionId, router]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <a
            href="/join"
            className="text-blue-400 underline text-sm"
          >
            Return to Join page
          </a>
        </div>
      </div>
    );
  }

  const isGameActive = session?.status === "active";

  return (
    <div className="flex flex-col items-center justify-start flex-1 p-6 pt-10 gap-5 max-w-lg mx-auto w-full">
      {/* Hero message */}
      <div className="text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-2xl font-bold mb-1">You are in.</h1>
        <p className="text-gray-400 text-sm">
          {isGameActive
            ? "The game is live. Waiting for the next AI Arena question."
            : "Waiting for the game to start."}
        </p>
      </div>

      {/* Session info */}
      {session && (
        <Panel className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
                Session
              </p>
              <p className="text-sm font-semibold text-gray-200">
                {session.title}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {session.code}
              </p>
            </div>
            <span
              className={[
                "text-xs font-semibold px-2.5 py-1 rounded-full",
                session.status === "active"
                  ? "bg-green-800/50 text-green-300"
                  : session.status === "completed"
                  ? "bg-gray-700 text-gray-400"
                  : "bg-yellow-800/40 text-yellow-300",
              ].join(" ")}
            >
              {session.status}
            </span>
          </div>
        </Panel>
      )}

      {/* Profile summary */}
      {participant && (
        <Panel title="Your Profile" className="w-full">
          <dl className="space-y-2">
            {(
              [
                ["Area", participant.engineeringArea],
                ["Experience", participant.experienceLevel],
                ["AI Usage", participant.aiUsageLevel],
                ["Attitude", participant.aiAttitude],
                ...(participant.teamAlias
                  ? [["Team", participant.teamAlias]]
                  : []),
              ] as [string, string][]
            ).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide shrink-0 pt-0.5">
                    {label}
                  </dt>
                  <dd className="text-sm text-gray-200 text-right">{value}</dd>
                </div>
              ))}
          </dl>
        </Panel>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span
          className={[
            "w-2 h-2 rounded-full",
            connStatus === "connected"
              ? "bg-green-400 animate-pulse"
              : connStatus === "connecting"
              ? "bg-yellow-400 animate-pulse"
              : "bg-red-500",
          ].join(" ")}
        />
        {connStatus === "connected"
          ? "Connected — updates arrive automatically"
          : connStatus === "connecting"
          ? "Connecting…"
          : "Connection lost — please reload"}
      </div>
    </div>
  );
}
