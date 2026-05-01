/**
 * Phase 2 — Game domain types
 *
 * These types complement the existing `src/lib/types.ts` (in-memory store types)
 * and describe the full Prisma-backed data model.
 */

export type RoundId = "registration" | "stock_market" | "risk_casino" | "mythbusters";

export type QuestionType =
  | "single_choice"
  | "multi_select"
  | "allocation"
  | "matrix"
  | "free_text";

export type SessionStatus = "draft" | "active" | "completed";

export type AnalysisType =
  | "current_question"
  | "cumulative_pulse"
  | "final_report";

// ---------------------------------------------------------------------------
// DTO interfaces (safe to serialise over the API)
// ---------------------------------------------------------------------------

export interface GameSessionDto {
  id: string;
  code: string;
  title: string;
  status: SessionStatus;
  activeRoundId: string | null;
  activeQuestionId: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantDto {
  id: string;
  sessionId: string;
  engineeringArea: string;
  experienceLevel: string;
  aiUsageLevel: string;
  aiAttitude: string;
  teamAlias: string | null;
  persona: string | null;
  createdAt: string;
}

export interface QuestionOptionDto {
  id: string;
  questionId: string;
  label: string;
  description: string | null;
  category: string | null;
  severity: string | null;
  riskLevel: string | null;
  order: number;
}

export interface QuestionDto {
  id: string;
  roundId: RoundId;
  order: number;
  title: string;
  prompt: string;
  questionType: QuestionType;
  isActive: boolean;
  isLocked: boolean;
  options: QuestionOptionDto[];
  responseCount: number;
  createdAt: string;
}

/**
 * The JSON payload stored in `Response.payload`.
 * Structure depends on `questionType`.
 */
export interface ResponsePayload {
  /** For single_choice / multi_select — selected option IDs */
  selectedOptionIds?: string[];
  /** For allocation — map of optionId → allocated points (0-100, sum ≤ 100) */
  allocation?: Record<string, number>;
  /** For matrix — map of rowId → columnId */
  matrixSelections?: Record<string, string>;
  /** For free_text */
  freeText?: string;
}

export interface AnalysisResultDto {
  id: string;
  sessionId: string;
  questionId: string | null;
  analysisType: AnalysisType;
  /** Parsed payload — shape varies by analysisType */
  payload: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Realtime event shapes
// ---------------------------------------------------------------------------

export type GameEventType =
  | "session:created"
  | "session:updated"
  | "participant:joined"
  | "question:activated"
  | "question:locked"
  | "response:submitted"
  | "analysis:current-question-ready"
  | "analysis:cumulative-pulse-ready"
  | "round:started"
  | "round:completed"
  | "game:completed";

export interface GameEvent<T = unknown> {
  type: GameEventType;
  sessionId: string;
  payload: T;
  timestamp: string;
}
