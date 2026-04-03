"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session, Question } from "@/lib/types";

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // New session form
  const [newName, setNewName] = useState("");

  // New question form
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["", ""]);

  // ------- Fetch helpers -------
  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    setSessions(await res.json());
  }, []);

  const fetchQuestions = useCallback(async (sid: string) => {
    const res = await fetch(`/api/sessions/${sid}/questions`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    if (data.session) setSelectedSession(data.session);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!cancelled) fetchSessions();
    };
    const iv = setInterval(load, 3000);
    // immediate load via zero-delay timeout (avoids sync setState in effect)
    const t = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (!selectedSession) return;
    let cancelled = false;
    const load = () => {
      if (!cancelled) fetchQuestions(selectedSession.id);
    };
    const iv = setInterval(load, 3000);
    const t = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [selectedSession, fetchQuestions]);

  // ------- Actions -------
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
    if (!selectedSession || !qText.trim() || qOptions.some((o) => !o.trim()))
      return;
    await fetch(`/api/sessions/${selectedSession.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: qText.trim(),
        options: qOptions.map((o) => o.trim()),
      }),
    });
    setQText("");
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
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">
        🛠 Admin Panel
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: Sessions */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Sessions</h2>

          {/* Create session */}
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

          {/* Session list */}
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
                <p className="text-xs text-gray-500 mt-1 font-mono">{s.id}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Column 2: Questions */}
        {selectedSession && (
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">
                Questions — {selectedSession.name}
              </h2>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  selectedSession.status === "active"
                    ? "bg-green-900 text-green-300"
                    : selectedSession.status === "finished"
                      ? "bg-gray-700 text-gray-400"
                      : "bg-yellow-900 text-yellow-300"
                }`}
              >
                {selectedSession.status}
              </span>
            </div>

            {/* Question list */}
            <ul className="space-y-2 mb-6">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className={`rounded-lg px-4 py-3 ${
                    selectedSession.activeQuestionId === q.id
                      ? "bg-green-900/30 border border-green-600"
                      : "bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      Q{q.order}: {q.text}
                    </p>
                    <button
                      onClick={() => activateQuestion(q.id)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
                        selectedSession.activeQuestionId === q.id
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white"
                      }`}
                    >
                      {selectedSession.activeQuestionId === q.id
                        ? "● LIVE"
                        : "Activate"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Options: {q.options.join(" | ")}
                  </p>
                </li>
              ))}
            </ul>

            {/* Finish session button */}
            {selectedSession.status !== "finished" && (
              <button
                onClick={() => activateQuestion(null)}
                className="mb-6 bg-red-700 hover:bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold transition"
              >
                Finish Session
              </button>
            )}

            {/* Add question */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3">Add Question</h3>
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Question text"
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500"
              />
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
                      onClick={() =>
                        setQOptions(qOptions.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setQOptions([...qOptions, ""])}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  + Add option
                </button>
                <div className="flex-1" />
                <button
                  onClick={addQuestion}
                  className="bg-green-600 hover:bg-green-500 rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                  Add Question
                </button>
              </div>
            </div>

            {/* Share links */}
            <div className="mt-6 bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Share Links</h3>
              <p className="text-sm text-gray-400 mb-1">
                <span className="font-medium text-gray-300">Player link:</span>{" "}
                <code className="text-blue-400">
                  /play/{selectedSession.id}
                </code>
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Dashboard:</span>{" "}
                <code className="text-blue-400">
                  /dashboard/{selectedSession.id}
                </code>
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
