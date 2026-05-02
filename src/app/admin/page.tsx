"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "@/components/QRCode";
import type {
  Session,
  Question,
  QuestionType,
  AnalysisStatus,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SessionStatus {
  sessionStatus: string;
  activeQuestionId: string | null;
  activeQuestionLocked: boolean;
  participantCount: number;
  activeQuestionResponseCount: number;
  responseRate: number;
  analysisStatus: AnalysisStatus;
  hasCachedAnalysis: boolean;
}

// ---------------------------------------------------------------------------
// Analysis status badge
// ---------------------------------------------------------------------------
const ANALYSIS_BADGE: Record<AnalysisStatus, string> = {
  not_started: "bg-gray-700 text-gray-400",
  running: "bg-blue-800 text-blue-200 animate-pulse",
  complete: "bg-emerald-800 text-emerald-200",
  failed: "bg-red-800 text-red-200",
};

const ANALYSIS_LABEL: Record<AnalysisStatus, string> = {
  not_started: "Not analyzed",
  running: "⟳ Analyzing…",
  complete: "✓ Analysis ready",
  failed: "✗ Failed",
};

function AnalysisBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ANALYSIS_BADGE[status]}`}>
      {ANALYSIS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);

  const [newName, setNewName] = useState("");
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<QuestionType>("mcq");
  const [qOptions, setQOptions] = useState(["", ""]);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    setSessions(await res.json());
  }, []);

  const fetchQuestions = useCallback(async (sid: string) => {
    const res = await fetch(`/api/sessions/${sid}/questions?all=true`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    if (data.session) setSelectedSession(data.session);
  }, []);

  const fetchStatus = useCallback(async (sid: string) => {
    const res = await fetch(`/api/sessions/${sid}/status`);
    if (res.ok) setSessionStatus(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => { if (!cancelled) fetchSessions(); };
    const iv = setInterval(load, 3000);
    const t = setTimeout(load, 0);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(t); };
  }, [fetchSessions]);

  useEffect(() => {
    if (!selectedSession) return;
    let cancelled = false;
    const load = () => {
      if (!cancelled) {
        fetchQuestions(selectedSession.id);
        fetchStatus(selectedSession.id);
      }
    };
    const iv = setInterval(load, 2000);
    const t = setTimeout(load, 0);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(t); };
  }, [selectedSession, fetchQuestions, fetchStatus]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const createSession = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const session = await res.json();
    setNewName("");
    setSessions((prev) => [session, ...prev]);
    setSelectedSession(session);
  };

  const addQuestion = async () => {
    if (!selectedSession || !qText.trim()) return;
    if (qType === "mcq" && qOptions.some((o) => !o.trim())) return;
    await fetch(`/api/sessions/${selectedSession.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: qText.trim(),
        type: qType,
        ...(qType === "mcq" ? { options: qOptions.map((o) => o.trim()) } : {}),
      }),
    });
    setQText("");
    setQType("mcq");
    setQOptions(["", ""]);
    fetchQuestions(selectedSession.id);
  };

  const activateQuestion = async (questionId: string | null) => {
    if (!selectedSession) return;
    await fetch(`/api/sessions/${selectedSession.id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    fetchQuestions(selectedSession.id);
    flash(questionId ? "✅ Question activated" : "🏁 Session finished");
  };

  const lockQuestion = async (questionId: string, locked: boolean) => {
    if (!selectedSession) return;
    await fetch(`/api/sessions/${selectedSession.id}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, locked }),
    });
    fetchQuestions(selectedSession.id);
    flash(locked ? "🔒 Question locked" : "🔓 Question unlocked");
  };

  const publishAction = async (mode: "all" | "next") => {
    if (!selectedSession) return;
    await fetch(`/api/sessions/${selectedSession.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    fetchQuestions(selectedSession.id);
  };

  const publishOne = async (questionId: string) => {
    if (!selectedSession) return;
    await fetch(`/api/sessions/${selectedSession.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "one", questionId }),
    });
    fetchQuestions(selectedSession.id);
  };

  const runAnalysis = async () => {
    if (!selectedSession) return;
    setAnalysisRunning(true);
    flash("⟳ Running AI analysis…");
    const res = await fetch(`/api/sessions/${selectedSession.id}/analyze`, {
      method: "POST",
    });
    setAnalysisRunning(false);
    if (res.ok) {
      flash("✓ Analysis complete");
    } else {
      const data = await res.json();
      flash(`✗ Analysis failed: ${data.error ?? "unknown error"}`);
    }
    fetchStatus(selectedSession.id);
  };

  const handleExport = (format: "json" | "csv") => {
    if (!selectedSession) return;
    window.open(`/api/sessions/${selectedSession.id}/export?format=${format}`, "_blank");
  };

  const unpublishedCount = questions.filter((q) => !q.published).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🛠 Admin Panel</h1>
        {actionMsg && (
          <div className="text-sm bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg text-white">
            {actionMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: Sessions */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Sessions</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Session name"
              className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === "Enter" && createSession()}
            />
            <button
              onClick={createSession}
              className="bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Create
            </button>
          </div>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className={`cursor-pointer rounded-lg px-4 py-3 transition ${
                  selectedSession?.id === s.id
                    ? "bg-blue-900/40 border border-blue-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <p className="font-medium">{s.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-gray-500 font-mono">{s.id.slice(0, 8)}…</p>
                  <span className="text-xs text-gray-500">
                    · {s.participantCount} participant{s.participantCount !== 1 && "s"}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      s.status === "active"
                        ? "bg-green-900 text-green-300"
                        : s.status === "finished"
                          ? "bg-gray-700 text-gray-400"
                          : "bg-yellow-900 text-yellow-300"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Column 2 & 3 */}
        {selectedSession && (
          <section className="lg:col-span-2 space-y-6">
            {/* Status panel */}
            {sessionStatus && (
              <div className="bg-gray-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{sessionStatus.participantCount}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Participants</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${
                    sessionStatus.responseRate >= 80 ? "text-emerald-400"
                    : sessionStatus.responseRate >= 50 ? "text-yellow-400"
                    : "text-red-400"
                  }`}>
                    {sessionStatus.responseRate}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Response rate ({sessionStatus.activeQuestionResponseCount})
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-semibold ${
                    sessionStatus.activeQuestionLocked ? "text-red-300" : "text-emerald-300"
                  }`}>
                    {sessionStatus.activeQuestionLocked ? "🔒 Locked" : "🔓 Open"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Active question</p>
                </div>
                <div className="text-center">
                  <AnalysisBadge status={sessionStatus.analysisStatus} />
                  <p className="text-xs text-gray-400 mt-0.5">AI analysis</p>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {unpublishedCount > 0 && (
                <>
                  <button
                    onClick={() => publishAction("next")}
                    className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold transition"
                  >
                    📤 Publish Next
                  </button>
                  <button
                    onClick={() => publishAction("all")}
                    className="bg-indigo-800 hover:bg-indigo-700 rounded-lg px-3 py-2 text-sm font-semibold transition"
                  >
                    📤 Publish All ({unpublishedCount})
                  </button>
                </>
              )}
              <button
                onClick={runAnalysis}
                disabled={analysisRunning}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  analysisRunning
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : sessionStatus?.hasCachedAnalysis
                      ? "bg-purple-800 hover:bg-purple-700"
                      : "bg-purple-600 hover:bg-purple-500"
                }`}
              >
                {analysisRunning ? "⟳ Analyzing…"
                  : sessionStatus?.hasCachedAnalysis ? "🔄 Retry Analysis"
                  : "✨ Run Analysis"}
              </button>
              <button
                onClick={() => handleExport("json")}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm font-semibold transition"
              >
                ⬇ JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 text-sm font-semibold transition"
              >
                ⬇ CSV
              </button>
              <a
                href={`/presenter/${selectedSession.id}`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-800 hover:bg-blue-700 rounded-lg px-3 py-2 text-sm font-semibold transition"
              >
                🖥 Open Presenter
              </a>
            </div>

            {/* Questions header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Questions — {selectedSession.name}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedSession.status === "active" ? "bg-green-900 text-green-300"
                : selectedSession.status === "finished" ? "bg-gray-700 text-gray-400"
                : "bg-yellow-900 text-yellow-300"
              }`}>
                {selectedSession.status}
              </span>
            </div>

            {/* Question list */}
            <ul className="space-y-2">
              {questions.map((q) => {
                const isActive = selectedSession.activeQuestionId === q.id;
                return (
                  <li
                    key={q.id}
                    className={`rounded-lg px-4 py-3 ${
                      isActive ? "bg-green-900/30 border border-green-600"
                      : q.locked ? "bg-red-900/10 border border-red-700/40"
                      : q.published ? "bg-gray-800"
                      : "bg-gray-800/50 border border-dashed border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                          q.type === "freetext" ? "bg-purple-900 text-purple-300" : "bg-blue-900 text-blue-300"
                        }`}>
                          {q.type === "freetext" ? "FREE TEXT" : "MCQ"}
                        </span>
                        <p className="font-medium truncate">Q{q.order}: {q.text}</p>
                        {!q.published && <span className="text-xs text-yellow-500 shrink-0">(unpublished)</span>}
                        {q.locked && <span className="text-xs text-red-400 shrink-0">🔒</span>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!q.published && (
                          <button
                            onClick={() => publishOne(q.id)}
                            className="text-xs px-2 py-1 rounded-full bg-indigo-700 hover:bg-indigo-600 text-white transition"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => activateQuestion(q.id)}
                          className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                            isActive ? "bg-green-600 text-white"
                            : "bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white"
                          }`}
                        >
                          {isActive ? "● LIVE" : "Activate"}
                        </button>
                        {q.published && (
                          <button
                            onClick={() => lockQuestion(q.id, !q.locked)}
                            className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                              q.locked
                                ? "bg-red-800 hover:bg-red-700 text-red-200"
                                : "bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-red-200"
                            }`}
                          >
                            {q.locked ? "🔓 Unlock" : "🔒 Lock"}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      {q.type === "freetext" ? "Open-ended text answer" : `Options: ${q.options.join(" | ")}`}
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* Finish session */}
            {selectedSession.status !== "finished" && (
              <button
                onClick={() => activateQuestion(null)}
                className="bg-red-700 hover:bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold transition"
              >
                🏁 Finish Session
              </button>
            )}

            {/* Add question form */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Add Question</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setQType("mcq")}
                  className={`text-sm px-3 py-1 rounded-full font-semibold transition ${
                    qType === "mcq" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  onClick={() => setQType("freetext")}
                  className={`text-sm px-3 py-1 rounded-full font-semibold transition ${
                    qType === "freetext" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Free Text
                </button>
              </div>
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Question text"
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500"
              />
              {qType === "mcq" && (
                <>
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const copy = [...qOptions];
                          copy[idx] = e.target.value;
                          setQOptions(copy);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                      {idx >= 2 && (
                        <button
                          onClick={() => setQOptions(qOptions.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setQOptions([...qOptions, ""])}
                    className="text-sm text-blue-400 hover:text-blue-300 mb-2"
                  >
                    + Add option
                  </button>
                </>
              )}
              {qType === "freetext" && (
                <p className="text-xs text-gray-500 mb-2">Participants will type their own answer.</p>
              )}
              <div className="flex justify-end mt-2">
                <button
                  onClick={addQuestion}
                  className="bg-green-600 hover:bg-green-500 rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                  Add Question
                </button>
              </div>
            </div>

            {/* Share & QR */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Share &amp; Join</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                <QRCode
                  value={typeof window !== "undefined" ? `${window.location.origin}/play/${selectedSession.id}` : `/play/${selectedSession.id}`}
                  size={140}
                />
                <div className="flex-1 text-sm space-y-2">
                  <p className="text-gray-400">
                    <span className="font-medium text-gray-300">Player link:</span>{" "}
                    <code className="text-blue-400">/play/{selectedSession.id}</code>
                  </p>
                  <p className="text-gray-400">
                    <span className="font-medium text-gray-300">Presenter:</span>{" "}
                    <a href={`/presenter/${selectedSession.id}`} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                      /presenter/{selectedSession.id}
                    </a>
                  </p>
                  <p className="text-gray-400">
                    <span className="font-medium text-gray-300">Dashboard:</span>{" "}
                    <code className="text-blue-400">/dashboard/{selectedSession.id}</code>
                  </p>
                  <p className="text-gray-500 text-xs mt-2">Scan the QR code to join on a mobile device</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
