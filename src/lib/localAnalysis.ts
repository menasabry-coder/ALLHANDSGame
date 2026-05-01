/**
 * src/lib/localAnalysis.ts
 *
 * Phase 7 — Local aggregate analysis (no OpenAI dependency).
 *
 * Computes CurrentQuestionAnalysis and CumulativePulseAnalysis from raw
 * database responses using deterministic rules.  The output conforms to the
 * Phase 7 TypeScript interfaces so the same UI and storage layer works when
 * OpenAI is plugged in later.
 */

import { prisma } from "@/lib/prisma";
import type {
  CurrentQuestionAnalysis,
  CumulativePulseAnalysis,
} from "@/types/analysis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_MULTIPLIER: Record<string, number> = {
  low: 1.0,
  medium: 1.3,
  "medium-high": 1.5,
  high: 1.7,
  critical: 2.0,
};

function topN<T extends { score: number }>(arr: T[], n: number): T[] {
  return [...arr].sort((a, b) => b.score - a.score).slice(0, n);
}

function agreementLevel(
  tally: Record<string, number>
): CurrentQuestionAnalysis["agreementLevel"] {
  const values = Object.values(tally);
  const total = values.reduce((s, n) => s + n, 0);
  if (total === 0) return "insufficient_data";
  const max = Math.max(...values);
  const pct = max / total;
  if (pct >= 0.7) return "strong_consensus";
  if (pct >= 0.5) return "moderate_consensus";
  if (pct >= 0.35) return "mixed";
  return "polarized";
}

function controversyScore(tally: Record<string, number>): number {
  const values = Object.values(tally);
  const total = values.reduce((s, n) => s + n, 0);
  if (total === 0) return 0;
  const probs = values.map((v) => v / total);
  // Normalised entropy: -Σ p·log2(p) / log2(n)
  const n = probs.length;
  if (n <= 1) return 0;
  const entropy = probs.reduce(
    (s, p) => (p > 0 ? s - p * Math.log2(p) : s),
    0
  );
  return Math.round((entropy / Math.log2(n)) * 100);
}

function confidenceLabel(
  responseCount: number,
  participantCount: number
): CurrentQuestionAnalysis["confidence"] {
  if (participantCount === 0) return "low";
  const rate = responseCount / participantCount;
  if (rate >= 0.6 && responseCount >= 10) return "high";
  if (rate >= 0.3 || responseCount >= 5) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Current Question Analysis (local)
// ---------------------------------------------------------------------------

export async function buildCurrentQuestionAnalysis(
  sessionId: string,
  questionId: string
): Promise<CurrentQuestionAnalysis> {
  const now = new Date().toISOString();

  const [question, participantCount, responses] = await Promise.all([
    prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    prisma.participant.count({ where: { sessionId } }),
    prisma.response.findMany({ where: { sessionId, questionId } }),
  ]);

  if (!question) {
    return makeEmptyCurrentAnalysis(sessionId, questionId, "unknown", now);
  }

  const responseCount = responses.length;
  const responseRate =
    participantCount > 0 ? responseCount / participantCount : 0;

  // Build aggregate tallies
  const tally: Record<string, number> = {};
  const allocationTotals: Record<string, number> = {};
  const matrixTally: Record<string, Record<string, number>> = {};
  const freeTexts: string[] = [];

  for (const r of responses) {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload) as Record<string, unknown>;
    } catch {
      // skip malformed
    }

    const type = question.questionType;
    if (type === "single_choice" || type === "multi_select") {
      const ids = (payload.selectedOptionIds as string[]) ?? [];
      for (const id of ids) tally[id] = (tally[id] ?? 0) + 1;
    } else if (type === "allocation") {
      const alloc = (payload.allocation as Record<string, number>) ?? {};
      for (const [id, coins] of Object.entries(alloc)) {
        allocationTotals[id] = (allocationTotals[id] ?? 0) + coins;
      }
    } else if (type === "matrix") {
      const sel = (payload.matrixSelections as Record<string, string>) ?? {};
      for (const [rowId, colId] of Object.entries(sel)) {
        if (!matrixTally[rowId]) matrixTally[rowId] = {};
        matrixTally[rowId][colId] = (matrixTally[rowId][colId] ?? 0) + 1;
      }
    } else if (type === "free_text") {
      if (typeof payload.freeText === "string" && payload.freeText)
        freeTexts.push(payload.freeText);
    }
  }

  const optionById = Object.fromEntries(question.options.map((o) => [o.id, o]));

  // Determine winning pattern
  let winningLabel = "—";
  let winningValue: number | null = null;
  let winningExplanation = "No responses yet.";

  if (question.questionType === "single_choice" || question.questionType === "multi_select") {
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topId, topCount] = sorted[0];
      winningLabel = optionById[topId]?.label ?? topId;
      winningValue = topCount;
      const pct =
        responseCount > 0 ? Math.round((topCount / responseCount) * 100) : 0;
      winningExplanation = `"${winningLabel}" selected by ${pct}% of respondents (${topCount}/${responseCount}).`;
    }
  } else if (question.questionType === "allocation") {
    const sorted = Object.entries(allocationTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topId, topCoins] = sorted[0];
      winningLabel = optionById[topId]?.label ?? topId;
      winningValue = topCoins;
      winningExplanation = `"${winningLabel}" received the most coins (${topCoins} total).`;
    }
  } else if (question.questionType === "free_text") {
    winningLabel = "Free-text responses";
    winningValue = freeTexts.length;
    winningExplanation = `${freeTexts.length} free-text response${freeTexts.length !== 1 ? "s" : ""} collected.`;
  } else if (question.questionType === "matrix") {
    winningLabel = "Matrix responses";
    winningValue = responseCount;
    winningExplanation = `${responseCount} matrix response${responseCount !== 1 ? "s" : ""} collected across all rows.`;
  }

  // Agreement / controversy (choice questions)
  const agreement = agreementLevel(tally);
  const controversy = controversyScore(tally);
  const conf = confidenceLabel(responseCount, participantCount);

  // Key insights
  const keyInsights: CurrentQuestionAnalysis["keyInsights"] = [];
  if (responseCount === 0) {
    keyInsights.push({
      title: "No responses yet",
      explanation: "Waiting for participants to submit answers.",
      severity: "info",
    });
  } else if (question.questionType === "allocation") {
    const marketScore = Object.values(allocationTotals).reduce((s, n) => s + n, 0);
    keyInsights.push({
      title: `Total coins invested: ${marketScore}`,
      explanation: `Across ${responseCount} investors, the community invested ${marketScore} coins total.`,
      severity: "opportunity",
    });
    // Top 3 by allocation
    const top3 = Object.entries(allocationTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    if (top3.length > 0) {
      keyInsights.push({
        title: "Top investment areas",
        explanation: top3
          .map(([id, coins]) => `${optionById[id]?.label ?? id}: ${coins} coins`)
          .join(", "),
        severity: "opportunity",
      });
    }
  } else if (question.questionType === "single_choice" || question.questionType === "multi_select") {
    if (agreement === "polarized" || agreement === "mixed") {
      keyInsights.push({
        title: "Divided opinion",
        explanation: `Responses are spread across options (controversy score: ${controversy}/100). This topic warrants discussion.`,
        severity: "warning",
      });
    } else if (agreement === "strong_consensus") {
      keyInsights.push({
        title: "Strong consensus",
        explanation: `The group strongly agrees. This is a clear signal for decision-making.`,
        severity: "opportunity",
      });
    }
  } else if (question.questionType === "free_text") {
    keyInsights.push({
      title: `${freeTexts.length} ideas collected`,
      explanation: "Free-text themes will be clustered in the Phase 8 analysis.",
      severity: "info",
    });
  }

  // Risk scores for risk_casino
  let riskScores: Record<string, number> | undefined;
  let marketScore: number | undefined;
  if (question.questionType === "allocation") {
    if (question.roundId === "risk_casino") {
      riskScores = Object.fromEntries(
        question.options.map((o) => {
          const chips = allocationTotals[o.id] ?? 0;
          const sm = SEVERITY_MULTIPLIER[o.severity?.toLowerCase() ?? ""] ?? 1.0;
          return [o.id, chips * sm];
        })
      );
    }
    if (question.roundId === "stock_market") {
      marketScore = Object.values(allocationTotals).reduce((s, n) => s + n, 0);
    }
  }

  const headline = buildHeadline(question.questionType, winningLabel, responseCount, agreement);
  const roundLabel =
    question.roundId === "stock_market"
      ? "AI Adoption Stock Market"
      : question.roundId === "risk_casino"
      ? "AI Risk Casino"
      : question.roundId === "mythbusters"
      ? "AI MythBusters"
      : question.roundId;

  return {
    analysisType: "current_question",
    sessionId,
    questionId,
    roundId: question.roundId,
    generatedAt: now,
    source: "local",
    confidence: conf,
    responseRate: Math.round(responseRate * 100) / 100,
    headline,
    oneSentenceSummary: `${responseCount} of ${participantCount} participants responded to "${question.title}" in the ${roundLabel} round.`,
    winningPattern: {
      label: winningLabel,
      value: winningValue,
      explanation: winningExplanation,
    },
    agreementLevel: agreement,
    controversyScore: controversy,
    keyInsights,
    segmentDifferences: [],
    automotiveInterpretation: buildAutomotiveContext(question.roundId, question.questionType, winningLabel),
    presenterTalkingPoint: buildTalkingPoint(question.questionType, winningLabel, agreement, controversy, responseCount),
    suggestedFollowUpQuestion: buildFollowUp(question.roundId, question.questionType),
    dashboardCards: buildDashboardCards(responseCount, participantCount, winningLabel, controversy),
    recommendedChart: recommendedChart(question.questionType),
    rawAggregate: {
      responseCount,
      participantCount,
      tally: Object.keys(tally).length > 0 ? tally : undefined,
      allocationTotals: Object.keys(allocationTotals).length > 0 ? allocationTotals : undefined,
      matrixTally: Object.keys(matrixTally).length > 0 ? matrixTally : undefined,
      freeTexts: freeTexts.length > 0 ? freeTexts : undefined,
      marketScore,
      riskScores,
    },
  };
}

// ---------------------------------------------------------------------------
// Cumulative Pulse Analysis (local)
// ---------------------------------------------------------------------------

export async function buildCumulativePulseAnalysis(
  sessionId: string
): Promise<CumulativePulseAnalysis> {
  const now = new Date().toISOString();

  const [session, participantCount, lockedQuestions] = await Promise.all([
    prisma.gameSession.findUnique({ where: { id: sessionId } }),
    prisma.participant.count({ where: { sessionId } }),
    prisma.question.findMany({
      where: { isLocked: true },
      include: {
        options: { orderBy: { order: "asc" } },
        responses: { where: { sessionId } },
      },
      orderBy: [{ roundId: "asc" }, { order: "asc" }],
    }),
  ]);

  const totalQuestions = await prisma.question.count();
  const gameProgressPercent =
    totalQuestions > 0
      ? Math.round((lockedQuestions.length / totalQuestions) * 100)
      : 0;

  // Aggregate across all locked SM1 (allocation)
  const sm1 = lockedQuestions.find((q) => q.id === "sm_q1");
  const topOpportunities: CumulativePulseAnalysis["topOpportunities"] = [];
  let opportunityIndex = 0;

  if (sm1) {
    const allocationTotals: Record<string, number> = {};
    for (const r of sm1.responses) {
      try {
        const p = JSON.parse(r.payload) as { allocation?: Record<string, number> };
        for (const [id, coins] of Object.entries(p.allocation ?? {})) {
          allocationTotals[id] = (allocationTotals[id] ?? 0) + coins;
        }
      } catch { /* skip */ }
    }
    const optionById = Object.fromEntries(sm1.options.map((o) => [o.id, o]));
    const sorted = Object.entries(allocationTotals).sort((a, b) => b[1] - a[1]);
    const totalCoins = sorted.reduce((s, [, v]) => s + v, 0);
    opportunityIndex = Math.round(totalCoins / Math.max(1, participantCount));

    for (const [id, coins] of sorted.slice(0, 5)) {
      const opt = optionById[id];
      topOpportunities.push({
        name: opt?.label ?? id,
        score: coins,
        whyItMatters: opt?.description ?? "High community investment signal.",
        recommendedPilot: (opt?.riskLevel ?? "high") === "low" || (opt?.riskLevel ?? "") === "medium",
      });
    }
  }

  // Aggregate across all locked RC1 (risk allocation)
  const rc1 = lockedQuestions.find((q) => q.id === "rc_q1");
  const topRisks: CumulativePulseAnalysis["topRisks"] = [];
  let riskIndex = 0;

  if (rc1) {
    const riskTotals: Record<string, number> = {};
    for (const r of rc1.responses) {
      try {
        const p = JSON.parse(r.payload) as { allocation?: Record<string, number> };
        for (const [id, chips] of Object.entries(p.allocation ?? {})) {
          riskTotals[id] = (riskTotals[id] ?? 0) + chips;
        }
      } catch { /* skip */ }
    }
    const optionById = Object.fromEntries(rc1.options.map((o) => [o.id, o]));
    const sorted = Object.entries(riskTotals).sort((a, b) => b[1] - a[1]);
    const totalChips = sorted.reduce((s, [, v]) => s + v, 0);
    riskIndex = Math.round(totalChips / Math.max(1, participantCount));

    for (const [id, chips] of sorted.slice(0, 5)) {
      const opt = optionById[id];
      const sm = SEVERITY_MULTIPLIER[opt?.severity?.toLowerCase() ?? ""] ?? 1.0;
      topRisks.push({
        name: opt?.label ?? id,
        score: Math.round(chips * sm),
        whyItMatters: opt?.description ?? "High community risk signal.",
        recommendedControl: `Apply controls before expanding AI into ${opt?.label ?? "this area"}.`,
      });
    }
  }

  // SM4 trust boundary
  const sm4 = lockedQuestions.find((q) => q.id === "sm_q4");
  const humanReviewRequired: string[] = [];
  if (sm4) {
    const tally: Record<string, number> = {};
    for (const r of sm4.responses) {
      try {
        const p = JSON.parse(r.payload) as { selectedOptionIds?: string[] };
        for (const id of p.selectedOptionIds ?? []) tally[id] = (tally[id] ?? 0) + 1;
      } catch { /* skip */ }
    }
    const optionById = Object.fromEntries(sm4.options.map((o) => [o.id, o]));
    const threshold = Math.max(1, sm4.responses.length * 0.3);
    for (const [id, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
      if (count >= threshold) humanReviewRequired.push(optionById[id]?.label ?? id);
    }
  }

  const confidence = confidenceLabel(
    lockedQuestions.reduce((s, q) => s + q.responses.length, 0),
    participantCount
  );

  return {
    analysisType: "cumulative_pulse",
    sessionId,
    generatedAt: now,
    source: "local",
    gameProgressPercent,
    confidence,
    headline: `Game ${gameProgressPercent}% complete — ${participantCount} participants`,
    executiveSummary: `${lockedQuestions.length} question${lockedQuestions.length !== 1 ? "s" : ""} answered so far. ${topOpportunities[0] ? `Top AI opportunity: ${topOpportunities[0].name}.` : ""} ${topRisks[0] ? `Top AI risk: ${topRisks[0].name}.` : ""} Full narrative analysis available after OpenAI is configured.`,
    aiConfidenceScore: opportunityIndex,
    opportunityIndex,
    riskIndex,
    governanceReadinessScore: humanReviewRequired.length > 0 ? 40 : 20,
    topOpportunities,
    topRisks,
    trustBoundaryMap: {
      lowRestriction: [],
      humanReviewRequired,
      restrictedOrSpecialApproval: [],
      notRecommendedNow: [],
    },
    personaDistribution: buildPersonaDistribution(session?.status ?? "draft"),
    recommendedPilots: topOpportunities
      .filter((o) => o.recommendedPilot)
      .slice(0, 3)
      .map((o, i) => ({
        title: o.name,
        reason: o.whyItMatters,
        firstStep: `Define scope and tooling, then run a 2-week proof of concept.`,
        riskLevel: "low" as const,
        timeHorizon: (["30_days", "60_days", "90_days"] as const)[i] ?? "90_days",
      })),
    recommendedGuardrails: [
      "Mandatory human review for AI-generated code",
      "No customer/confidential data in public AI tools",
      "AI output must link to requirement/design/test IDs",
    ],
    changedSinceLastQuestion: `Updated after locking ${lockedQuestions[lockedQuestions.length - 1]?.title ?? "last question"}.`,
    presenterClosingLine: `These results reflect ${participantCount} engineers' honest assessment of AI adoption readiness.`,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function makeEmptyCurrentAnalysis(
  sessionId: string,
  questionId: string,
  roundId: string,
  now: string
): CurrentQuestionAnalysis {
  return {
    analysisType: "current_question",
    sessionId,
    questionId,
    roundId,
    generatedAt: now,
    source: "local",
    confidence: "low",
    responseRate: 0,
    headline: "No data yet…",
    oneSentenceSummary: "Question not found or no responses.",
    winningPattern: { label: "—", value: null, explanation: "No data." },
    agreementLevel: "insufficient_data",
    controversyScore: 0,
    keyInsights: [],
    segmentDifferences: [],
    automotiveInterpretation: "",
    presenterTalkingPoint: "",
    suggestedFollowUpQuestion: "",
    dashboardCards: [],
    recommendedChart: "none",
    rawAggregate: { responseCount: 0, participantCount: 0 },
  };
}

function buildHeadline(
  qType: string,
  winningLabel: string,
  responseCount: number,
  agreement: string
): string {
  if (responseCount === 0) return "Waiting for responses…";
  if (qType === "allocation") return `💰 Top pick: ${winningLabel}`;
  if (qType === "free_text") return `💬 ${responseCount} ideas submitted`;
  if (qType === "matrix") return `📊 ${responseCount} matrix responses`;
  if (agreement === "strong_consensus") return `✅ Consensus: ${winningLabel}`;
  if (agreement === "polarized") return `⚡ Divided: ${winningLabel} leads`;
  return `📈 Leading: ${winningLabel}`;
}

function buildAutomotiveContext(roundId: string, qType: string, winnerLabel: string): string {
  if (roundId === "stock_market") {
    return `Investment signals from an automotive team should focus on high-value, low-risk pilots first. "${winnerLabel}" reflects the team's current appetite.`;
  }
  if (roundId === "risk_casino") {
    return `Risk perception in automotive software engineering is shaped by functional safety, cybersecurity, and ASPICE process concerns. "${winnerLabel}" deserves specific controls.`;
  }
  if (roundId === "mythbusters") {
    return `Myth-busting helps surface assumptions that could block or endanger responsible AI adoption in safety-critical systems.`;
  }
  return `Automotive engineering AI adoption requires balancing productivity gains against safety, security, and process compliance.`;
}

function buildTalkingPoint(
  qType: string,
  winnerLabel: string,
  agreement: string,
  controversy: number,
  responseCount: number
): string {
  if (responseCount === 0) return "No data yet — activate the question and wait for responses.";
  if (qType === "allocation")
    return `The crowd invested most coins in "${winnerLabel}". Ask the room: why does this feel like the highest-value opportunity?`;
  if (qType === "free_text")
    return `Engineers are pointing to real pain points. Use these inputs to feed your pilot backlog.`;
  if (agreement === "polarized" || controversy > 60)
    return `The group is divided on "${winnerLabel}". This is worth a live discussion — ask for a quick show of hands on the key difference.`;
  return `"${winnerLabel}" emerged as the clear choice. Explore what engineering context drove this preference.`;
}

function buildFollowUp(roundId: string, qType: string): string {
  if (roundId === "stock_market" && qType === "allocation")
    return "Which of the top-funded stocks could we start piloting within 30 days?";
  if (roundId === "risk_casino" && qType === "allocation")
    return "For the top risks, do we already have controls in place? (RC2 covers this.)";
  if (roundId === "mythbusters")
    return "What experience shaped your answer on this myth?";
  return "What would change your mind?";
}

function buildDashboardCards(
  responseCount: number,
  participantCount: number,
  winnerLabel: string,
  controversy: number
): CurrentQuestionAnalysis["dashboardCards"] {
  return [
    {
      title: "Responses",
      value: `${responseCount}/${participantCount}`,
      subtitle: `${participantCount > 0 ? Math.round((responseCount / participantCount) * 100) : 0}% response rate`,
      tone: responseCount > 0 ? "positive" : "neutral",
    },
    {
      title: "Top Answer",
      value: winnerLabel.length > 20 ? winnerLabel.slice(0, 20) + "…" : winnerLabel,
      subtitle: "Leading option",
      tone: "neutral",
    },
    {
      title: "Controversy",
      value: `${controversy}/100`,
      subtitle: controversy > 60 ? "Highly divided" : controversy > 30 ? "Moderate spread" : "General agreement",
      tone: controversy > 60 ? "warning" : "neutral",
    },
  ];
}

function recommendedChart(
  qType: string
): CurrentQuestionAnalysis["recommendedChart"] {
  if (qType === "allocation") return "bar";
  if (qType === "single_choice" || qType === "multi_select") return "bar";
  if (qType === "matrix") return "heatmap";
  if (qType === "free_text") return "word_cloud";
  return "none";
}

function buildPersonaDistribution(
  sessionStatus: string
): CumulativePulseAnalysis["personaDistribution"] {
  if (sessionStatus !== "active" && sessionStatus !== "completed") return [];
  // Placeholder distribution — will be refined by Phase 8 OpenAI analysis
  return [
    { persona: "Practical Adopter", percentage: 35, description: "Focuses on concrete productivity gains." },
    { persona: "Safety Guardian", percentage: 20, description: "Prioritises process compliance and safety." },
    { persona: "AI Champion", percentage: 15, description: "Early adopter, keen to push AI forward." },
    { persona: "AI Skeptic", percentage: 15, description: "Questions AI reliability and governance." },
    { persona: "Quality Defender", percentage: 15, description: "Focused on maintainability and test coverage." },
  ];
}
