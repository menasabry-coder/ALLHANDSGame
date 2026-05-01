"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ResultsChart from "@/components/ResultsChart";
import QRCode from "@/components/QRCode";
import AIInsights from "@/components/AIInsights";
import type { Session, QuestionWithResults, PromptResult } from "@/lib/types";

export default function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResults[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Custom prompt state
  const [prompt, setPrompt] = useState("");
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions`);
      if (!res.ok) {
        setError("Session not found");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setQuestions(data.questions);
    } catch {
      setError("Could not connect to the server");
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!cancelled) fetchData();
    };
    const iv = setInterval(load, 2000);
    const t = setTimeout(load, 0);
    return () => {
      cancelled = true;
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [fetchData]);

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    setPromptLoading(true);
    setPromptError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPromptError(data.error ?? "Prompt failed");
        return;
      }
      const data: PromptResult = await res.json();
      setPromptResult(data);
    } catch (err) {
      setPromptError(
        err instanceof Error ? err.message : "Could not connect"
      );
    } finally {
      setPromptLoading(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </main>
    );
  }

  const activeQuestion = questions.find(
    (q) => q.id === session.activeQuestionId
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white p-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          {session.name}
        </h1>
        <p className="mt-1 text-gray-500 text-sm">Live Dashboard</p>
        <span
          className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${
            session.status === "active"
              ? "bg-green-900 text-green-300"
              : session.status === "finished"
                ? "bg-gray-700 text-gray-400"
                : "bg-yellow-900 text-yellow-300"
          }`}
        >
          {session.status.toUpperCase()}
        </span>
      </header>

      {/* Join QR Code + Participant Count */}
      <section className="max-w-2xl mx-auto mb-8">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <QRCode
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/play/${sessionId}`
                  : `/play/${sessionId}`
              }
              size={160}
            />
            <div className="bg-blue-900/40 rounded-lg px-4 py-2 text-center border border-blue-700/50">
              <p className="text-2xl font-bold text-blue-300">
                {session.participantCount}
              </p>
              <p className="text-xs text-blue-400">
                participant{session.participantCount !== 1 && "s"} joined
              </p>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold mb-1">Join this session</h2>
            <p className="text-gray-400 text-sm mb-2">
              Scan the QR code or share the link below
            </p>
            <code className="text-blue-400 text-xs break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/play/${sessionId}`
                : `/play/${sessionId}`}
            </code>
          </div>
        </div>
      </section>

      {/* Active question — hero card */}
      {activeQuestion && (
        <section className="max-w-2xl mx-auto mb-12">
          <div className="bg-gray-800/70 rounded-2xl p-8 border border-green-700 shadow-lg shadow-green-900/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-sm font-semibold uppercase tracking-wide">
                Live Now
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-6">
              Q{activeQuestion.order}: {activeQuestion.text}
            </h2>
            <ResultsChart question={activeQuestion} />
          </div>
        </section>
      )}

      {/* All questions summary */}
      <section className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">All Questions</h2>
        {questions.length === 0 ? (
          <p className="text-gray-500">No questions added yet.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`rounded-xl p-5 ${
                  q.id === session.activeQuestionId
                    ? "bg-green-900/20 border border-green-700"
                    : "bg-gray-800/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        q.type === "freetext"
                          ? "bg-purple-900 text-purple-300"
                          : "bg-blue-900 text-blue-300"
                      }`}
                    >
                      {q.type === "freetext" ? "FREE TEXT" : "MCQ"}
                    </span>
                    <h3 className="font-semibold">
                      Q{q.order}: {q.text}
                    </h3>
                  </div>
                  {q.id === session.activeQuestionId && (
                    <span className="text-xs text-green-400 font-semibold">
                      LIVE
                    </span>
                  )}
                </div>
                <ResultsChart question={q} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Analysis */}
      {questions.length > 0 && <AIInsights sessionId={sessionId} />}

      {/* Custom OpenAI Prompt Area */}
      <section className="max-w-2xl mx-auto mt-10">
        <div className="bg-gray-800/70 rounded-2xl p-6 border border-cyan-700/50">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💬</span>
            <h2 className="text-xl font-bold">Ask AI About This Session</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Send a custom prompt to OpenAI with full context of this
            session&apos;s questions, answers, and participant data.
          </p>
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Summarize the top 3 concerns..."
              className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
              onKeyDown={(e) => e.key === "Enter" && sendPrompt()}
            />
            <button
              onClick={sendPrompt}
              disabled={promptLoading || !prompt.trim()}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                promptLoading || !prompt.trim()
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white"
              }`}
            >
              {promptLoading ? "Thinking..." : "Send"}
            </button>
          </div>

          {promptError && (
            <p className="text-red-400 text-sm mt-3">{promptError}</p>
          )}

          {promptResult && (
            <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {promptResult.response}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
