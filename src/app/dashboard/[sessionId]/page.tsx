"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import ResultsChart from "@/components/ResultsChart";
import QRCode from "@/components/QRCode";
import AIInsights from "@/components/AIInsights";
import type { Session, QuestionWithResults } from "@/lib/types";

export default function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResults[]>([]);
  const [error, setError] = useState<string | null>(null);

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

      {/* Join QR Code */}
      <section className="max-w-2xl mx-auto mb-8">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 flex flex-col sm:flex-row items-center gap-6">
          <QRCode
            value={
              typeof window !== "undefined"
                ? `${window.location.origin}/play/${sessionId}`
                : `/play/${sessionId}`
            }
            size={160}
          />
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
                  <h3 className="font-semibold">
                    Q{q.order}: {q.text}
                  </h3>
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
    </main>
  );
}
