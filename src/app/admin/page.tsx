"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";
import RoleBadge from "@/components/RoleBadge";
import type { GameSessionDto } from "@/types/game";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Admin page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [sessions, setSessions] = useState<GameSessionDto[]>([]);
  const [selected, setSelected] = useState<GameSessionDto | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: GameSessionDto[] = await res.json();
        setSessions(data);
        // Auto-select if only one session
        if (data.length === 1 && !selected) {
          setSelected(data[0]);
        }
      }
    } catch {
      setError("Could not load sessions.");
    }
  }

  async function refreshSelected(id: string) {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const s: GameSessionDto = await res.json();
      setSelected(s);
      setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Create new session
  async function handleCreate() {
    if (!newTitle.trim()) {
      setError("Enter a session title.");
      return;
    }
    setCreateLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create session.");
        return;
      }
      const s: GameSessionDto = await res.json();
      setSessions((prev) => [s, ...prev]);
      setSelected(s);
      setNewTitle("");
      showToast(`Session created: ${s.code}`);
    } catch {
      setError("Network error.");
    } finally {
      setCreateLoading(false);
    }
  }

  // Start game
  async function handleStart() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selected.id}/start`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSelected(selected.id);
        showToast("Game started!");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to start game.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  // Reset session
  async function handleReset() {
    if (!selected) return;
    setConfirmReset(false);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selected.id}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSelected(selected.id);
        showToast("Session reset to draft.");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to reset.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  // Copy session code
  function handleCopyCode() {
    if (!selected) return;
    navigator.clipboard
      .writeText(selected.code)
      .then(() => showToast(`Copied: ${selected.code}`))
      .catch(() => showToast("Could not copy to clipboard."));
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Control</h1>
          <RoleBadge role="Admin" />
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-green-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create session */}
          <Panel title="Create Session" subtitle="Start a new AI Arena game session">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Session title, e.g. All-Hands Q2 2026"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                disabled={createLoading}
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <PrimaryButton
                onClick={handleCreate}
                disabled={createLoading}
                className="w-full"
              >
                {createLoading ? "Creating…" : "+ Create Session"}
              </PrimaryButton>
            </div>
          </Panel>

          {/* Session list */}
          <Panel title="Sessions" subtitle="Select a session to manage">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No sessions yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={[
                      "w-full text-left rounded-xl px-4 py-3 border transition",
                      selected?.id === s.id
                        ? "border-blue-500 bg-blue-600/10"
                        : "border-gray-700 bg-gray-900/40 hover:border-gray-600",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-200 truncate max-w-[180px]">
                          {s.title}
                        </p>
                        <p className="text-xs font-mono text-gray-500 mt-0.5">
                          {s.code}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={[
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            s.status === "active"
                              ? "bg-green-800/50 text-green-300"
                              : s.status === "completed"
                              ? "bg-gray-700 text-gray-400"
                              : "bg-yellow-800/40 text-yellow-300",
                          ].join(" ")}
                        >
                          {s.status}
                        </span>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {s.participantCount} joined
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {/* Selected session controls */}
          {selected && (
            <>
              <Panel
                title="Session Info"
                subtitle={selected.title}
                className="col-span-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-900/60 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
                        Meeting Code
                      </p>
                      <p className="font-mono font-bold text-lg tracking-widest text-gray-200">
                        {selected.code}
                      </p>
                    </div>
                    <PrimaryButton
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyCode}
                    >
                      Copy
                    </PrimaryButton>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/60 rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-teal-300">
                        {selected.participantCount}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Participants</p>
                    </div>
                    <div className="bg-gray-900/60 rounded-xl px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-gray-300 mt-1 capitalize">
                        {selected.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Status</p>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Actions"
                subtitle="Control the game session"
                className="col-span-1"
              >
                <div className="space-y-3">
                  {/* Start game */}
                  <PrimaryButton
                    onClick={handleStart}
                    disabled={
                      actionLoading || selected.status !== "draft"
                    }
                    className="w-full"
                  >
                    ▶ Start Game
                  </PrimaryButton>

                  {/* Open presenter view */}
                  <a
                    href={`/presenter?sessionId=${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={[
                      "block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition",
                      "bg-gray-700 hover:bg-gray-600 text-gray-200",
                    ].join(" ")}
                  >
                    📺 Open Presenter View
                  </a>

                  {/* Join link */}
                  <a
                    href={`/join?code=${selected.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={[
                      "block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition",
                      "bg-gray-700 hover:bg-gray-600 text-gray-200",
                    ].join(" ")}
                  >
                    🔗 Join Page (test)
                  </a>

                  {/* Reset */}
                  {!confirmReset ? (
                    <PrimaryButton
                      variant="danger"
                      onClick={() => setConfirmReset(true)}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      🔄 Reset Session
                    </PrimaryButton>
                  ) : (
                    <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-4 space-y-3">
                      <p className="text-sm text-red-300 font-semibold text-center">
                        Reset will delete all participants and responses. Are you
                        sure?
                      </p>
                      <div className="flex gap-2">
                        <PrimaryButton
                          variant="secondary"
                          onClick={() => setConfirmReset(false)}
                          className="flex-1"
                          size="sm"
                        >
                          Cancel
                        </PrimaryButton>
                        <PrimaryButton
                          variant="danger"
                          onClick={handleReset}
                          disabled={actionLoading}
                          className="flex-1"
                          size="sm"
                        >
                          {actionLoading ? "Resetting…" : "Yes, Reset"}
                        </PrimaryButton>
                      </div>
                    </div>
                  )}

                  <PrimaryButton
                    variant="secondary"
                    onClick={() => refreshSelected(selected.id)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    ↻ Refresh
                  </PrimaryButton>
                </div>
              </Panel>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-10">
          Phase 3 — Question controls will be enabled in Phase 4.
        </p>
      </div>
    </AppShell>
  );
}

