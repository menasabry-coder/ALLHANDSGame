"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";
import RoleBadge from "@/components/RoleBadge";
import { ROUNDS } from "@/config/gameConfig";
import type { GameSessionDto } from "@/types/game";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionRow {
  id: string;
  roundId: string;
  order: number;
  title: string;
  questionType: string;
  isActive: boolean;
  isLocked: boolean;
  responseCount: number;
}

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

  // Round/question control
  const [activeRoundTab, setActiveRoundTab] = useState<string>(ROUNDS[0].id);
  const [roundQuestions, setRoundQuestions] = useState<QuestionRow[]>([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [customQuestionTitle, setCustomQuestionTitle] = useState("");
  const [customQuestionPrompt, setCustomQuestionPrompt] = useState("");
  const [customQuestionType, setCustomQuestionType] = useState<
    "single_choice" | "free_text"
  >("single_choice");
  const [customQuestionOptions, setCustomQuestionOptions] = useState(
    "Option 1\nOption 2"
  );

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: GameSessionDto[] = await res.json();
        setSessions(data);
        setSelected((prev) => (prev ? prev : data.length === 1 ? data[0] : null));
      }
    } catch {
      setError("Could not load sessions.");
    }
  }, []);

  // Fetch sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  async function refreshSelected(id: string) {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) {
      const s: GameSessionDto = await res.json();
      setSelected(s);
      setSessions((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    }
  }

  const loadRoundQuestions = useCallback(
    async (sessionId: string, roundId: string) => {
      setQuestionLoading(true);
      try {
        const res = await fetch(
          `/api/sessions/${sessionId}/round-questions?roundId=${roundId}`
        );
        if (res.ok) {
          const data = await res.json();
          setRoundQuestions(data.questions ?? []);
        }
      } catch {
        // ignore
      } finally {
        setQuestionLoading(false);
      }
    },
    []
  );

  // Reload questions when session or round tab changes
  useEffect(() => {
    if (selected) {
      loadRoundQuestions(selected.id, activeRoundTab);
    }
  }, [selected, activeRoundTab, loadRoundQuestions]);

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

  // Complete game
  async function handleComplete() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selected.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSelected(selected.id);
        showToast("Game completed!");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to complete game.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  // Trigger cumulative pulse analysis
  async function handleTriggerAnalysis() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selected.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "cumulative_pulse" }),
      });
      if (res.ok) {
        showToast("Cumulative pulse analysis triggered!");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to trigger analysis.");
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
        setRoundQuestions([]);
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

  // Activate a question
  async function handleActivateQuestion(questionId: string) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${selected.id}/active-question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        }
      );
      if (res.ok) {
        await refreshSelected(selected.id);
        await loadRoundQuestions(selected.id, activeRoundTab);
        showToast("Question activated.");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to activate question.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  // Deactivate active question (clear)
  async function handleClearQuestion() {
    if (!selected) return;
    setActionLoading(true);
    try {
      await fetch(`/api/sessions/${selected.id}/active-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: null }),
      });
      await refreshSelected(selected.id);
      await loadRoundQuestions(selected.id, activeRoundTab);
      showToast("Active question cleared.");
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  // Lock a question
  async function handleLockQuestion(questionId: string) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/lock`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSelected(selected.id);
        await loadRoundQuestions(selected.id, activeRoundTab);
        showToast("Question locked — no more submissions.");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to lock question.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlockQuestion(questionId: string) {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/unlock`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshSelected(selected.id);
        await loadRoundQuestions(selected.id, activeRoundTab);
        showToast("Question unlocked.");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to unlock question.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateCustomQuestion() {
    if (!selected) return;

    const title = customQuestionTitle.trim();
    const prompt = customQuestionPrompt.trim();
    const options = customQuestionOptions
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    if (!title) {
      setError("Enter a custom question title.");
      return;
    }
    if (customQuestionType === "single_choice" && options.length < 2) {
      setError("MCQ requires at least 2 options (one per line).");
      return;
    }

    setActionLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${selected.id}/round-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId: activeRoundTab,
          title,
          prompt: prompt || title,
          questionType: customQuestionType,
          options,
        }),
      });
      if (res.ok) {
        setCustomQuestionTitle("");
        setCustomQuestionPrompt("");
        setCustomQuestionType("single_choice");
        setCustomQuestionOptions("Option 1\nOption 2");
        await loadRoundQuestions(selected.id, activeRoundTab);
        showToast("Custom question added.");
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to add custom question.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch {
      setError("Could not log out.");
    }
  }

  const questionTypeLabel: Record<string, string> = {
    single_choice: "Single choice",
    multi_select: "Multi-select",
    allocation: "Allocation",
    matrix: "Matrix",
    free_text: "Free text",
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Control</h1>
          <div className="flex items-center gap-3">
            <RoleBadge role="Admin" />
            <PrimaryButton size="sm" variant="secondary" onClick={handleLogout}>
              Log out
            </PrimaryButton>
          </div>
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
              <Panel title="Session Info" subtitle={selected.title} className="col-span-1">
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
                    <PrimaryButton variant="secondary" size="sm" onClick={handleCopyCode}>
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

                  {selected.activeQuestionId && (
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-yellow-400 font-semibold">
                          Active question
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[160px]">
                          {selected.activeQuestionId}
                        </p>
                      </div>
                      <PrimaryButton
                        variant="secondary"
                        size="sm"
                        onClick={handleClearQuestion}
                        disabled={actionLoading}
                      >
                        Clear
                      </PrimaryButton>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="Actions" subtitle="Control the game session" className="col-span-1">
                <div className="space-y-3">
                  <PrimaryButton
                    onClick={handleStart}
                    disabled={actionLoading || selected.status !== "draft"}
                    className="w-full"
                  >
                    ▶ Start Game
                  </PrimaryButton>

                  <PrimaryButton
                    onClick={handleComplete}
                    disabled={actionLoading || selected.status !== "active"}
                    className="w-full"
                    variant="secondary"
                  >
                    ✅ Complete Game
                  </PrimaryButton>

                  <PrimaryButton
                    onClick={handleTriggerAnalysis}
                    disabled={actionLoading || !selected}
                    className="w-full"
                    variant="secondary"
                  >
                    🔬 Trigger Analysis
                  </PrimaryButton>

                  <a
                    href={`/presenter?sessionId=${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    📺 Open Presenter View
                  </a>

                  <a
                    href={`/report?sessionId=${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    📊 View Report
                  </a>

                  <a
                    href={`/join?code=${selected.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    🔗 Join Page (test)
                  </a>

                  <a
                    href="/admin/checklist"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    ✔ Pre-Meeting Checklist
                  </a>

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
                        Reset will delete all participants and responses. Are you sure?
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
                    onClick={() => {
                      refreshSelected(selected.id);
                      loadRoundQuestions(selected.id, activeRoundTab);
                    }}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    ↻ Refresh
                  </PrimaryButton>
                </div>
              </Panel>

              {/* Export panel */}
              <Panel title="Export" subtitle="Download session data" className="col-span-1">
                <div className="space-y-3">
                  <a
                    href={`/api/sessions/${selected.id}/export?format=json`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    📥 Export JSON
                  </a>
                  <a
                    href={`/api/sessions/${selected.id}/export?format=csv`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    📊 Export CSV
                  </a>
                  <a
                    href={`/api/sessions/${selected.id}/export?format=markdown`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center rounded-xl font-semibold py-2.5 text-sm transition bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    📝 Export Markdown
                  </a>
                </div>
              </Panel>

              {/* Round Question Control — full-width row */}
              <div className="col-span-1 md:col-span-2">
                <Panel
                  title="Round Question Control"
                  subtitle="Activate and lock questions for each game round"
                >
                  {/* Round tabs */}
                  <div className="flex gap-2 mb-5 flex-wrap">
                    {ROUNDS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveRoundTab(r.id)}
                        className={[
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                          activeRoundTab === r.id
                            ? "border-blue-500 bg-blue-600/20 text-white"
                            : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white",
                        ].join(" ")}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>

                  {/* Question list */}
                  <div className="mb-5 rounded-xl border border-gray-700 bg-gray-900/40 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-200">
                      Add Custom Question
                    </p>
                    <input
                      type="text"
                      placeholder="Question title"
                      value={customQuestionTitle}
                      onChange={(e) => setCustomQuestionTitle(e.target.value)}
                      className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                    />
                    <textarea
                      placeholder="Question prompt (optional)"
                      value={customQuestionPrompt}
                      onChange={(e) => setCustomQuestionPrompt(e.target.value)}
                      className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 min-h-[72px]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomQuestionType("single_choice")}
                        className={[
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                          customQuestionType === "single_choice"
                            ? "border-blue-500 bg-blue-600/20 text-white"
                            : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white",
                        ].join(" ")}
                      >
                        MCQ
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomQuestionType("free_text")}
                        className={[
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                          customQuestionType === "free_text"
                            ? "border-blue-500 bg-blue-600/20 text-white"
                            : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-white",
                        ].join(" ")}
                      >
                        Free text
                      </button>
                    </div>
                    {customQuestionType === "single_choice" && (
                      <textarea
                        placeholder={"MCQ options (one per line)\nOption 1\nOption 2"}
                        value={customQuestionOptions}
                        onChange={(e) => setCustomQuestionOptions(e.target.value)}
                        className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 min-h-[96px]"
                      />
                    )}
                    <PrimaryButton
                      size="sm"
                      onClick={handleCreateCustomQuestion}
                      disabled={actionLoading || !selected}
                    >
                      + Add to {ROUNDS.find((r) => r.id === activeRoundTab)?.name ?? "Round"}
                    </PrimaryButton>
                  </div>

                  {questionLoading ? (
                    <p className="text-xs text-gray-500 italic">Loading questions…</p>
                  ) : roundQuestions.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No questions found for this round.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {roundQuestions.map((q) => (
                        <div
                          key={q.id}
                          className={[
                            "rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                            q.isActive
                              ? "border-green-600/50 bg-green-900/10"
                              : q.isLocked
                              ? "border-gray-700 bg-gray-900/20 opacity-60"
                              : "border-gray-700 bg-gray-900/40",
                          ].join(" ")}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 font-mono shrink-0">
                                Q{q.order}
                              </span>
                              <p className="text-sm font-medium text-gray-200 truncate">
                                {q.title}
                              </p>
                              {q.isActive && (
                                <span className="bg-green-700/40 text-green-300 text-xs px-2 py-0.5 rounded-full font-semibold shrink-0">
                                  LIVE
                                </span>
                              )}
                              {q.isLocked && (
                                <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full font-semibold shrink-0">
                                  LOCKED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {questionTypeLabel[q.questionType] ?? q.questionType}
                              {" · "}
                              <span className="text-teal-400 font-semibold">
                                {q.responseCount} response{q.responseCount !== 1 ? "s" : ""}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {!q.isLocked ? (
                              <>
                                {!q.isActive ? (
                                  <PrimaryButton
                                    size="sm"
                                    onClick={() => handleActivateQuestion(q.id)}
                                    disabled={
                                      actionLoading ||
                                      selected.status !== "active"
                                    }
                                  >
                                    Activate
                                  </PrimaryButton>
                                ) : (
                                  <PrimaryButton
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleClearQuestion}
                                    disabled={actionLoading}
                                  >
                                    Deactivate
                                  </PrimaryButton>
                                )}
                                <PrimaryButton
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleLockQuestion(q.id)}
                                  disabled={actionLoading}
                                >
                                  🔒 Lock
                                </PrimaryButton>
                              </>
                            ) : (
                              <PrimaryButton
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUnlockQuestion(q.id)}
                                disabled={actionLoading}
                              >
                                🔓 Unlock
                              </PrimaryButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-10">
          Phase 8 &amp; 9 — Complete game, trigger analysis, and export reports.
        </p>
      </div>
    </AppShell>
  );
}
