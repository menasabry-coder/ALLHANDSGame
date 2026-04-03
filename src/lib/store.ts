/**
 * In-memory data store for the Engineering Pulse Arena.
 *
 * This keeps everything self-contained — no external database required to run
 * locally.  Swap this module out for Supabase calls when deploying to
 * production (the Supabase client helper is already provided in supabase.ts).
 */

import { v4 as uuidv4 } from "uuid";
import type { Session, Question, Vote, QuestionWithResults } from "./types";

// ---------------------------------------------------------------------------
// In-memory collections
// ---------------------------------------------------------------------------
const sessions: Map<string, Session> = new Map();
const questions: Map<string, Question> = new Map();
const votes: Map<string, Vote> = new Map();

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function createSession(name: string): Session {
  const session: Session = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    activeQuestionId: null,
    status: "waiting",
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function listSessions(): Session[] {
  return Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function activateQuestion(
  sessionId: string,
  questionId: string
): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.activeQuestionId = questionId;
  session.status = "active";
  return session;
}

export function finishSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.activeQuestionId = null;
  session.status = "finished";
  return session;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export function addQuestion(
  sessionId: string,
  text: string,
  options: string[]
): Question | undefined {
  if (!sessions.has(sessionId)) return undefined;
  const existing = listQuestions(sessionId);
  const question: Question = {
    id: uuidv4(),
    sessionId,
    text,
    options,
    order: existing.length + 1,
    createdAt: new Date().toISOString(),
  };
  questions.set(question.id, question);
  return question;
}

export function listQuestions(sessionId: string): Question[] {
  return Array.from(questions.values())
    .filter((q) => q.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
}

export function getQuestion(questionId: string): Question | undefined {
  return questions.get(questionId);
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export function castVote(
  questionId: string,
  sessionId: string,
  participantId: string,
  optionIndex: number
): Vote | null {
  // Prevent double-voting per participant per question
  const existing = Array.from(votes.values()).find(
    (v) => v.questionId === questionId && v.participantId === participantId
  );
  if (existing) return null;

  const question = questions.get(questionId);
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) {
    return null;
  }

  const vote: Vote = {
    id: uuidv4(),
    questionId,
    sessionId,
    participantId,
    optionIndex,
    createdAt: new Date().toISOString(),
  };
  votes.set(vote.id, vote);
  return vote;
}

export function getQuestionResults(
  questionId: string
): QuestionWithResults | undefined {
  const question = questions.get(questionId);
  if (!question) return undefined;

  const questionVotes = Array.from(votes.values()).filter(
    (v) => v.questionId === questionId
  );

  const tally: Record<number, number> = {};
  for (let i = 0; i < question.options.length; i++) {
    tally[i] = 0;
  }
  for (const v of questionVotes) {
    tally[v.optionIndex] = (tally[v.optionIndex] ?? 0) + 1;
  }

  return {
    ...question,
    votes: tally,
    totalVotes: questionVotes.length,
  };
}
