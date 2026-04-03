"use client";

import { useState, useEffect, useCallback } from "react";
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
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-1">{session.name}</h1>
      <p className="text-gray-500 text-sm mb-8">Player View</p>

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

      {session.status === "active" && activeQuestion && (
        <div className="w-full max-w-lg">
          <div className="bg-gray-800/60 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-1">
              Q{activeQuestion.order}: {activeQuestion.text}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Pick your answer below
            </p>

            {voted.has(activeQuestion.id) ? (
              <div>
                <p className="text-green-400 font-semibold text-center mb-4">
                  Vote recorded!
                </p>
                <ResultsChart question={activeQuestion} />
              </div>
            ) : (
              <VoteButtons
                options={activeQuestion.options}
                onVote={(idx) => handleVote(activeQuestion.id, idx)}
              />
            )}
          </div>
        </div>
      )}

      {session.status === "active" && !activeQuestion && (
        <div className="text-center mt-20">
          <p className="text-gray-400">
            No question is active right now. Hang tight!
          </p>
        </div>
      )}
    </main>
  );
}
