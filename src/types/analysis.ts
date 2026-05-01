/**
 * Phase 7 — Analysis TypeScript interfaces
 *
 * These types describe the structured outputs produced by the analysis service
 * (local aggregate for now; OpenAI-powered in Phase 8).
 *
 * Both views are stored in `AnalysisResult.payload` and emitted via SSE.
 */

// ---------------------------------------------------------------------------
// Current Question Analysis
// ---------------------------------------------------------------------------

export interface CurrentQuestionAnalysis {
  analysisType: "current_question";
  sessionId: string;
  questionId: string;
  roundId: string;
  generatedAt: string;
  /** local = computed without OpenAI; openai = powered by GPT */
  source: "local" | "openai";
  confidence: "low" | "medium" | "high";
  responseRate: number;
  headline: string;
  oneSentenceSummary: string;
  winningPattern: {
    label: string;
    value: number | null;
    explanation: string;
  };
  agreementLevel:
    | "strong_consensus"
    | "moderate_consensus"
    | "mixed"
    | "polarized"
    | "insufficient_data";
  controversyScore: number;
  keyInsights: Array<{
    title: string;
    explanation: string;
    severity: "info" | "opportunity" | "risk" | "warning";
  }>;
  segmentDifferences: Array<{
    segmentName: string;
    observation: string;
    importance: "low" | "medium" | "high";
  }>;
  automotiveInterpretation: string;
  presenterTalkingPoint: string;
  suggestedFollowUpQuestion: string;
  dashboardCards: Array<{
    title: string;
    value: string;
    subtitle: string;
    tone: "neutral" | "positive" | "risk" | "warning";
  }>;
  recommendedChart:
    | "bar"
    | "stacked_bar"
    | "heatmap"
    | "radar"
    | "word_cloud"
    | "matrix"
    | "none";
  /** Raw aggregate data for Phase 8 re-analysis */
  rawAggregate: {
    responseCount: number;
    participantCount: number;
    tally?: Record<string, number>;
    allocationTotals?: Record<string, number>;
    matrixTally?: Record<string, Record<string, number>>;
    freeTexts?: string[];
    marketScore?: number;
    riskScores?: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Cumulative Pulse Analysis
// ---------------------------------------------------------------------------

export interface CumulativePulseAnalysis {
  analysisType: "cumulative_pulse";
  sessionId: string;
  generatedAt: string;
  /** local = computed without OpenAI; openai = powered by GPT */
  source: "local" | "openai";
  gameProgressPercent: number;
  confidence: "low" | "medium" | "high";
  headline: string;
  executiveSummary: string;
  aiConfidenceScore: number;
  opportunityIndex: number;
  riskIndex: number;
  governanceReadinessScore: number;
  topOpportunities: Array<{
    name: string;
    score: number;
    whyItMatters: string;
    recommendedPilot: boolean;
  }>;
  topRisks: Array<{
    name: string;
    score: number;
    whyItMatters: string;
    recommendedControl: string;
  }>;
  trustBoundaryMap: {
    lowRestriction: string[];
    humanReviewRequired: string[];
    restrictedOrSpecialApproval: string[];
    notRecommendedNow: string[];
  };
  personaDistribution: Array<{
    persona:
      | "AI Champion"
      | "Practical Adopter"
      | "Safety Guardian"
      | "Quality Defender"
      | "Cybersecurity Watchdog"
      | "AI Skeptic"
      | "Automation Hunter"
      | "Process Optimizer";
    percentage: number;
    description: string;
  }>;
  recommendedPilots: Array<{
    title: string;
    reason: string;
    firstStep: string;
    riskLevel: "low" | "medium" | "high";
    timeHorizon: "30_days" | "60_days" | "90_days";
  }>;
  recommendedGuardrails: string[];
  changedSinceLastQuestion: string;
  presenterClosingLine: string;
}

export type AnalysisPayload = CurrentQuestionAnalysis | CumulativePulseAnalysis;
