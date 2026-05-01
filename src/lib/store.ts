/**
 * In-memory data store for the Engineering Pulse Arena.
 *
 * This keeps everything self-contained — no external database required to run
 * locally.  Swap this module out for Supabase calls when deploying to
 * production (the Supabase client helper is already provided in supabase.ts).
 */

import { v4 as uuidv4 } from "uuid";
import type {
  Session,
  Question,
  QuestionType,
  Vote,
  QuestionWithResults,
} from "./types";

// ---------------------------------------------------------------------------
// In-memory collections
// ---------------------------------------------------------------------------
const sessions: Map<string, Session> = new Map();
const questions: Map<string, Question> = new Map();
const votes: Map<string, Vote> = new Map();
/** participantId set per session */
const participants: Map<string, Set<string>> = new Map();

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
    participantCount: 0,
  };
  sessions.set(session.id, session);
  participants.set(session.id, new Set());
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function listSessions(): Session[] {
  return Array.from(sessions.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
// Participants
// ---------------------------------------------------------------------------

/** Register a participant in a session. Returns the updated count. */
export function registerParticipant(
  sessionId: string,
  participantId: string
): number {
  const session = sessions.get(sessionId);
  if (!session) return 0;
  let set = participants.get(sessionId);
  if (!set) {
    set = new Set();
    participants.set(sessionId, set);
  }
  set.add(participantId);
  session.participantCount = set.size;
  return set.size;
}

export function getParticipantCount(sessionId: string): number {
  return participants.get(sessionId)?.size ?? 0;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export function addQuestion(
  sessionId: string,
  text: string,
  type: QuestionType,
  options: string[]
): Question | undefined {
  if (!sessions.has(sessionId)) return undefined;
  const existing = listQuestions(sessionId);
  const question: Question = {
    id: uuidv4(),
    sessionId,
    text,
    type,
    options,
    order: existing.length + 1,
    published: false,
    createdAt: new Date().toISOString(),
  };
  questions.set(question.id, question);
  return question;
}

/** List all questions for a session (admin view — includes unpublished). */
export function listQuestions(sessionId: string): Question[] {
  return Array.from(questions.values())
    .filter((q) => q.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
}

/** List only published questions (player / dashboard view). */
export function listPublishedQuestions(sessionId: string): Question[] {
  return listQuestions(sessionId).filter((q) => q.published);
}

export function getQuestion(questionId: string): Question | undefined {
  return questions.get(questionId);
}

/** Publish a single question by ID. */
export function publishQuestion(questionId: string): Question | undefined {
  const q = questions.get(questionId);
  if (!q) return undefined;
  q.published = true;
  return q;
}

/** Publish all questions in a session at once. */
export function publishAllQuestions(sessionId: string): Question[] {
  const qs = listQuestions(sessionId);
  for (const q of qs) {
    q.published = true;
  }
  return qs;
}

/** Publish the next unpublished question in order. Returns it or undefined. */
export function publishNextQuestion(sessionId: string): Question | undefined {
  const next = listQuestions(sessionId).find((q) => !q.published);
  if (!next) return undefined;
  next.published = true;
  return next;
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export function castVote(
  questionId: string,
  sessionId: string,
  participantId: string,
  optionIndex: number,
  freeTextAnswer: string | null = null
): Vote | null {
  // Prevent double-voting per participant per question
  const existing = Array.from(votes.values()).find(
    (v) => v.questionId === questionId && v.participantId === participantId
  );
  if (existing) return null;

  const question = questions.get(questionId);
  if (!question) return null;

  // Validate based on question type
  if (question.type === "mcq") {
    if (optionIndex < 0 || optionIndex >= question.options.length) return null;
  } else {
    // freetext — must have an answer
    if (!freeTextAnswer || freeTextAnswer.trim().length === 0) return null;
  }

  const vote: Vote = {
    id: uuidv4(),
    questionId,
    sessionId,
    participantId,
    optionIndex,
    freeTextAnswer:
      question.type === "freetext" ? (freeTextAnswer?.trim() ?? null) : null,
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
  const freeTextAnswers: string[] = [];
  for (const v of questionVotes) {
    if (question.type === "mcq") {
      tally[v.optionIndex] = (tally[v.optionIndex] ?? 0) + 1;
    } else if (v.freeTextAnswer) {
      freeTextAnswers.push(v.freeTextAnswer);
    }
  }

  return {
    ...question,
    votes: tally,
    totalVotes: questionVotes.length,
    freeTextAnswers,
  };
}
