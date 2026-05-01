"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import VoteButtons from "@/components/VoteButtons";
import ResultsChart from "@/components/ResultsChart";
import type { Session, QuestionWithResults } from "@/lib/types";

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
  /** Index of the question currently displayed to the user (sequential) */
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [freeTextInput, setFreeTextInput] = useState("");
  const joinedRef = useRef(false);

  // Register participant on first load
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
        body: JSON.stringify({
          participantId,
          freeTextAnswer: freeTextInput.trim(),
        }),
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
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </main>
    );
  }

  // Questions the player has not yet voted on (shown sequentially)
  const unansweredQuestions = questions.filter((q) => !voted.has(q.id));
  const currentQuestion = unansweredQuestions[currentQuestionIdx] ?? null;
  const activeQuestion = questions.find(
    (q) => q.id === session.activeQuestionId
  );
  // If there's an active question and user hasn't voted on it, prioritize it
  const displayQuestion =
    activeQuestion && !voted.has(activeQuestion.id)
      ? activeQuestion
      : currentQuestion;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{session.name}</h1>
      <p className="text-gray-500 text-sm mb-2">Player View</p>
      <p className="text-xs text-purple-400 mb-6 bg-purple-900/30 px-3 py-1 rounded-full border border-purple-700/50">
        🤖 This game is autonomous — questions appear automatically
      </p>

      {session.status === "waiting" && (
        <div className="text-center mt-20">
          <p className="text-3xl animate-pulse">&#9203;</p>
          <p className="text-gray-400 mt-4">
            Waiting for the host to start...
          </p>
        </div>
      )}

      {session.status === "finished" && (
        <div className="text-center mt-20">
          <p className="text-3xl">&#127937;</p>
          <p className="text-gray-400 mt-4">This session has ended.</p>
          <div className="mt-8 w-full max-w-lg space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="bg-gray-800 rounded-xl p-4">
                <h3 className="font-semibold mb-3">
                  Q{q.order}: {q.text}
                </h3>
                <ResultsChart question={q} />
              </div>
            ))}
          </div>
        </div>
      )}

      {session.status === "active" && displayQuestion && (
        <div className="w-full max-w-lg">
          <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-1">
              Q{displayQuestion.order}: {displayQuestion.text}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {displayQuestion.type === "freetext"
                ? "Type your answer below"
                : "Pick your answer below"}
            </p>

            {voted.has(displayQuestion.id) ? (
              <div>
                <p className="text-green-400 font-semibold text-center mb-4">
                  Answer recorded!
                </p>
                <ResultsChart question={displayQuestion} />
              </div>
            ) : displayQuestion.type === "freetext" ? (
              <div className="space-y-3">
                <textarea
                  value={freeTextInput}
                  onChange={(e) => setFreeTextInput(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                />
                <button
                  onClick={() => handleFreeTextVote(displayQuestion.id)}
                  disabled={!freeTextInput.trim()}
                  className={`w-full py-3 rounded-xl font-semibold transition ${
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

          {/* Navigation for sequential questions */}
          {unansweredQuestions.length > 1 &&
            displayQuestion === currentQuestion && (
              <div className="flex justify-between mt-4 text-sm">
                <button
                  onClick={() =>
                    setCurrentQuestionIdx((i) => Math.max(0, i - 1))
                  }
                  disabled={currentQuestionIdx === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  ← Previous
                </button>
                <span className="text-gray-500">
                  {currentQuestionIdx + 1} of {unansweredQuestions.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentQuestionIdx((i) =>
                      Math.min(unansweredQuestions.length - 1, i + 1)
                    )
                  }
                  disabled={
                    currentQuestionIdx >= unansweredQuestions.length - 1
                  }
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
        </div>
      )}

      {session.status === "active" && !displayQuestion && (
        <div className="text-center mt-20">
          {unansweredQuestions.length === 0 && questions.length > 0 ? (
            <>
              <p className="text-3xl">✅</p>
              <p className="text-gray-400 mt-4">
                You&apos;ve answered all questions. Hang tight for more!
              </p>
            </>
          ) : (
            <p className="text-gray-400">
              No question is active right now. Hang tight!
            </p>
          )}
        </div>
      )}
    </main>
  );
}
