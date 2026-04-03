/** Core domain types for Engineering Pulse Arena */

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  activeQuestionId: string | null;
  status: "waiting" | "active" | "finished";
}

export interface Question {
  id: string;
  sessionId: string;
  text: string;
  options: string[];
  order: number;
  createdAt: string;
}

export interface Vote {
  id: string;
  questionId: string;
  sessionId: string;
  participantId: string;
  optionIndex: number;
  createdAt: string;
}

export interface QuestionWithResults extends Question {
  votes: Record<number, number>; // optionIndex → count
  totalVotes: number;
}
