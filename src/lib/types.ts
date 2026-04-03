/** Core domain types for Engineering Pulse Arena */

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  activeQuestionId: string | null;
  status: "waiting" | "active" | "finished";
  /** Number of participants who joined */
  participantCount: number;
}

export type QuestionType = "mcq" | "freetext";

export interface Question {
  id: string;
  sessionId: string;
  text: string;
  type: QuestionType;
  /** Options for multiple-choice; empty array for free-text */
  options: string[];
  order: number;
  /** Whether this question is visible to players */
  published: boolean;
  createdAt: string;
}

export interface Vote {
  id: string;
  questionId: string;
  sessionId: string;
  participantId: string;
  /** For MCQ questions — index of the chosen option */
  optionIndex: number;
  /** For free-text questions — the participant's written answer */
  freeTextAnswer: string | null;
  createdAt: string;
}

export interface QuestionWithResults extends Question {
  votes: Record<number, number>; // optionIndex → count
  totalVotes: number;
  /** Free-text answers (only populated for freetext questions) */
  freeTextAnswers: string[];
}

/** AI-generated analysis of a session's questions and answers */
export interface AIAnalysis {
  summary: string;
  questionInsights: {
    questionId: string;
    questionText: string;
    insight: string;
    recommendedVisualization: "bar" | "pie" | "donut" | "ranking" | "wordcloud" | "list";
  }[];
  overallThemes: string[];
  sentiment: string;
  /** Infographic data cards for the dashboard */
  infographics: InfographicCard[];
}

/** A single infographic data card rendered on the dashboard */
export interface InfographicCard {
  title: string;
  value: string;
  description: string;
  icon: string; // emoji
  color: "blue" | "green" | "purple" | "yellow" | "red" | "pink";
}

/** Result of a custom prompt sent to OpenAI */
export interface PromptResult {
  response: string;
}
