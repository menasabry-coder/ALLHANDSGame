"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import VoteButtons from "@/components/VoteButtons";
import ResultsChart from "@/components/ResultsChart";
import type { Session, QuestionWithResults } from "@/lib/types";

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------
type ConnectionState = "connecting" | "connected" | "error";

function ConnectionDot({ state }: { state: ConnectionState }) {
  const cls =
    state === "connected"
      ? "bg-green-500"
      : state === "error"
        ? "bg-red-500"
        : "bg-yellow-500 animate-pulse";
  const label =
    state === "connected" ? "Connected" : state === "error" ? "Connection error" : "Connecting…";
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${cls}`} />
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PlayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [participantId] = useState(() => {
    if (typeof window !== "undefined") {
      const key = `participant-${sessionId}`;
      const stored = sessionStorage.getItem(key);
      if (stored) return stored;
      const id = uuidv4();
      sessionStorage.setItem(key, id);
      return id;
    }
    return uuidv4();
  });

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResults[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [freeTextInput, setFreeTextInput] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    const t = setTimeout(() => {
      fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      }).catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [sessionId, participantId]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/questions`);
      if (!res.ok) {
        setError("Session not found");
        setConnection("error");
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setQuestions(data.questions);
      setConnection("connected");
    } catch {
      setConnection("error");
      setError("Could not connect to the server");
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => { if (!cancelled) fetchData(); };
    const iv = setInterval(load, 2000);
    const t = setTimeout(load, 0);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(t); };
  }, [fetchData]);

  const handleVote = async (questionId: string, optionIndex: number) => {
    const res = await fetch(
      `/api/sessions/${sessionId}/questions/${questionId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex, participantId }),
      }
    );
    if (res.ok) {
      setVoted((prev) => new Set(prev).add(questionId));
    }
    fetchData();
  };

  const handleFreeTextVote = async (questionId: string) => {
    if (!freeTextInput.trim()) return;
    const res = await fetch(
      `/api/sessions/${sessionId}/questions/${questionId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, freeTextAnswer: freeTextInput.trim() }),
      }
    );
    if (res.ok) {
      setVoted((prev) => new Set(prev).add(questionId));
      setFreeTextInput("");
    }
    fetchData();
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
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </main>
    );
  }

  const unansweredQuestions = questions.filter((q) => !voted.has(q.id));
  const currentQuestion = unansweredQuestions[currentQuestionIdx] ?? null;
  const activeQuestion = questions.find((q) => q.id === session.activeQuestionId);
  const displayQuestion =
    activeQuestion && !voted.has(activeQuestion.id)
      ? activeQuestion
      : currentQuestion;

  // Check if active question is locked
  const activeIsLocked = activeQuestion && "locked" in activeQuestion
    ? (activeQuestion as QuestionWithResults & { locked?: boolean }).locked
    : false;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex flex-col">
      {/* Header */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{session.name}</h1>
          <p className="text-gray-500 text-xs mt-0.5">Participant View</p>
        </div>
        <ConnectionDot state={connection} />
      </header>

      <div className="flex-1 flex flex-col items-center px-5 pb-8">
        {/* Waiting state */}
        {session.status === "waiting" && (
          <div className="text-center mt-24">
            <p className="text-5xl animate-pulse mb-6">⏳</p>
            <p className="text-xl text-gray-300 font-semibold">Get ready!</p>
            <p className="text-gray-500 mt-2">Waiting for the host to start the game…</p>
          </div>
        )}

        {/* Finished state */}
        {session.status === "finished" && (
          <div className="w-full max-w-lg mt-8">
            <div className="text-center mb-8">
              <p className="text-5xl mb-4">🏁</p>
              <p className="text-xl font-bold text-white">Game over!</p>
              <p className="text-gray-400 mt-1">Thanks for participating.</p>
            </div>
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="bg-gray-800 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 text-sm text-gray-300">
                    Q{q.order}: {q.text}
                  </h3>
                  <ResultsChart question={q} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active state */}
        {session.status === "active" && (
          <>
            {/* Locked — waiting for next question */}
            {displayQuestion === null && activeQuestion && activeIsLocked && (
              <div className="text-center mt-24 w-full max-w-sm">
                <div className="bg-gray-800/60 border border-gray-600 rounded-2xl p-8">
                  <p className="text-4xl mb-4">⏸</p>
                  <p className="text-lg font-semibold text-white mb-1">
                    Waiting for next question
                  </p>
                  <p className="text-gray-400 text-sm">
                    The presenter has locked this question. Stand by…
                  </p>
                  <div className="mt-4 flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active question card */}
            {displayQuestion && (
              <div className="w-full max-w-lg mt-4">
                <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700 shadow-lg">
                  {/* Question header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">
                      Live Now
                    </span>
                  </div>
                  <h2 className="text-xl font-bold mb-1 text-white">
                    Q{displayQuestion.order}: {displayQuestion.text}
                  </h2>
                  <p className="text-gray-500 text-sm mb-5">
                    {displayQuestion.type === "freetext"
                      ? "Type your answer below"
                      : "Pick your answer below"}
                  </p>

                  {/* Voted state */}
                  {voted.has(displayQuestion.id) ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 py-3 bg-green-900/30 border border-green-700 rounded-xl">
                        <span className="text-2xl">✅</span>
                        <p className="text-green-300 font-semibold">Response received!</p>
                      </div>
                      <ResultsChart question={displayQuestion} />
                    </div>
                  ) : displayQuestion.type === "freetext" ? (
                    <div className="space-y-3">
                      {/* Confidentiality warning */}
                      <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2 flex items-start gap-2">
                        <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠️</span>
                        <p className="text-amber-200 text-xs leading-relaxed">
                          Your response is anonymous. Do not include personal data,
                          names, or confidential project information.
                        </p>
                      </div>
                      <textarea
                        value={freeTextInput}
                        onChange={(e) => setFreeTextInput(e.target.value)}
                        placeholder="Type your answer here…"
                        className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                      />
                      <button
                        onClick={() => handleFreeTextVote(displayQuestion.id)}
                        disabled={!freeTextInput.trim()}
                        className={`w-full py-3 rounded-xl font-semibold transition text-base ${
                          freeTextInput.trim()
                            ? "bg-green-600 hover:bg-green-500 text-white"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Submit Answer
                      </button>
                    </div>
                  ) : (
                    <VoteButtons
                      options={displayQuestion.options}
                      onVote={(idx) => handleVote(displayQuestion.id, idx)}
                    />
                  )}
                </div>

                {/* Sequential navigation */}
                {unansweredQuestions.length > 1 && displayQuestion === currentQuestion && (
                  <div className="flex justify-between mt-4 text-sm">
                    <button
                      onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                      disabled={currentQuestionIdx === 0}
                      className="text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1"
                    >
                      ← Previous
                    </button>
                    <span className="text-gray-500">
                      {currentQuestionIdx + 1} of {unansweredQuestions.length}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentQuestionIdx((i) => Math.min(unansweredQuestions.length - 1, i + 1))
                      }
                      disabled={currentQuestionIdx >= unansweredQuestions.length - 1}
                      className="text-gray-400 hover:text-white disabled:opacity-30 px-3 py-1"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* All answered */}
            {!displayQuestion && !activeIsLocked && (
              <div className="text-center mt-24">
                {unansweredQuestions.length === 0 && questions.length > 0 ? (
                  <>
                    <p className="text-4xl mb-4">✅</p>
                    <p className="text-xl font-semibold text-white mb-1">All done!</p>
                    <p className="text-gray-400 text-sm">
                      You&apos;ve answered all questions. Hang tight for more!
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400 text-lg">
                    No question is active right now. Hang tight!
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
