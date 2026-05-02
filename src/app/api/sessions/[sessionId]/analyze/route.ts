import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  getSession,
  listQuestions,
  getQuestionResults,
  getParticipantCount,
  getAnalysis,
  setAnalysis,
  getAnalysisStatus,
  setAnalysisStatus,
} from "@/lib/store";
import type { AIAnalysis } from "@/lib/types";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/analyze
 *
 * Uses the OpenAI API (chat completions + embeddings) to analyze the session's
 * questions and vote results, then returns a structured AI analysis.
 */
export async function POST(_request: Request, { params }: Params) {
  const { sessionId } = await params;

  if (!openai) {
    // Return cached analysis if available, otherwise return error
    const cached = getAnalysis(sessionId);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      {
        error:
          "OpenAI is not configured. Set the OPENAI_API_KEY environment variable.",
      },
      { status: 503 }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const questions = listQuestions(sessionId);
  if (questions.length === 0) {
    return NextResponse.json(
      { error: "No questions in this session to analyze" },
      { status: 400 }
    );
  }

  setAnalysisStatus(sessionId, "running");
  const participantCount = getParticipantCount(sessionId);

  // Build results data for every question
  const questionsWithResults = questions.map((q) => {
    const results = getQuestionResults(q.id);
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      order: q.order,
      votes: results?.votes ?? {},
      totalVotes: results?.totalVotes ?? 0,
      freeTextAnswers: results?.freeTextAnswers ?? [],
    };
  });

  // ---- Step 1: Generate embeddings for each question text ----
  const embeddingTexts = questionsWithResults.map((q) => {
    if (q.type === "freetext") {
      return `Question: ${q.text}\nFree-text answers: ${q.freeTextAnswers.join("; ") || "(none)"}`;
    }
    return `Question: ${q.text}\nOptions: ${q.options.join(", ")}\nVote distribution: ${q.options.map((opt, i) => `${opt}: ${q.votes[i] ?? 0}`).join(", ")}`;
  });

  let embeddingData: number[][] = [];
  try {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: embeddingTexts,
    });
    embeddingData = embeddingRes.data.map((d) => d.embedding);
  } catch (embeddingErr) {
    // Embeddings are non-critical — log and continue without them
    console.warn(
      "OpenAI embeddings failed (continuing without thematic analysis):",
      embeddingErr instanceof Error ? embeddingErr.message : embeddingErr
    );
  }

  // ---- Step 2: Compute pairwise cosine similarities for context ----
  // Threshold chosen empirically: text-embedding-3-small cosine values above
  // 0.75 reliably indicate questions that share a common topic.
  const SIMILARITY_THRESHOLD = 0.75;
  const similarities: string[] = [];
  if (embeddingData.length >= 2) {
    for (let i = 0; i < embeddingData.length; i++) {
      for (let j = i + 1; j < embeddingData.length; j++) {
        const sim = cosineSimilarity(embeddingData[i], embeddingData[j]);
        if (sim > SIMILARITY_THRESHOLD) {
          similarities.push(
            `Questions "${questionsWithResults[i].text}" and "${questionsWithResults[j].text}" are thematically related (similarity: ${sim.toFixed(2)}).`
          );
        }
      }
    }
  }

  // ---- Step 3: Chat completion to produce the analysis ----
  const systemPrompt = `You are an expert data analyst for live polling sessions at engineering all-hands meetings focused on AI adoption in automotive software engineering.
You will be given the questions (MCQ and free-text), their answer options/responses, and the voting results.
Total participants in the session: ${participantCount}
${similarities.length > 0 ? `\nThematic analysis from embeddings:\n${similarities.join("\n")}` : ""}

Analyze the data and return a JSON object (no markdown fences) with this exact structure:
{
  "summary": "A 2-4 sentence narrative summary of what the votes/answers reveal. Include participation percentages where relevant.",
  "questionInsights": [
    {
      "questionId": "<id>",
      "questionText": "<text>",
      "headline": "Short punchy headline for this question result",
      "insight": "A 1-2 sentence insight about the voting/answer pattern.",
      "tone": "<opportunity|risk|warning|neutral>",
      "winningPattern": "Description of the dominant response pattern",
      "agreementLevel": 0-100,
      "controversyScore": 0-100,
      "keyInsights": ["insight1", "insight2"],
      "automotiveInterpretation": "How this result applies to automotive software engineering",
      "presenterTalkingPoint": "What the presenter should say about this result",
      "suggestedFollowUp": "A good follow-up question for the presenter to ask",
      "recommendedVisualization": "<bar|pie|donut|ranking|wordcloud|list>"
    }
  ],
  "overallThemes": ["theme1", "theme2"],
  "sentiment": "A single sentence describing the overall team sentiment.",
  "infographics": [
    {
      "title": "Short metric title",
      "value": "The key number/stat",
      "description": "A brief explanation",
      "icon": "emoji",
      "color": "<blue|green|purple|yellow|red|pink>"
    }
  ],
  "pulse": {
    "aiConfidenceScore": 0-100,
    "opportunityIndex": 0-100,
    "riskIndex": 0-100,
    "governanceReadinessScore": 0-100,
    "topOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
    "topRisks": ["risk1", "risk2", "risk3"],
    "recommendedPilots": ["pilot1", "pilot2"],
    "recommendedGuardrails": ["guardrail1", "guardrail2"],
    "changedSinceLastQuestion": "What shifted most notably in this update"
  }
}

For tone: opportunity=positive/green, risk=negative/red, warning=caution/amber, neutral=balanced/slate
For agreementLevel: 100=everyone agreed, 0=totally split
For controversyScore: 100=highly controversial, 0=no controversy
For recommendedVisualization: bar=default MCQ, pie=one option >60%, donut=even split, ranking=ordered preference, wordcloud=short free text, list=longer free text
For infographics: Generate 4-6 insightful data cards for the dashboard.
For pulse: Synthesize all responses into department-level AI readiness metrics.`;

  const userPrompt = `Session: "${session.name}"
Total participants: ${participantCount}

${questionsWithResults.map((q) => {
  if (q.type === "freetext") {
    return `Question ${q.order} (Free Text): "${q.text}"
Answers (${q.freeTextAnswers.length} of ${participantCount} participants):
${q.freeTextAnswers.map((a) => `  - "${a}"`).join("\n") || "  (no answers yet)"}`;
  }
  return `Question ${q.order} (MCQ): "${q.text}"
Options & Votes:
${q.options.map((opt, i) => `  - ${opt}: ${q.votes[i] ?? 0} votes (${participantCount > 0 ? Math.round(((q.votes[i] ?? 0) / participantCount) * 100) : 0}% of participants)`).join("\n")}
Total votes: ${q.totalVotes}`;
}).join("\n\n")}`;

  try {
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      // Increased from 3000 to accommodate the expanded analysis fields
      // (headline, tone, winningPattern, keyInsights, pulse, etc.)
      max_tokens: 4000,
    });

    const raw = chatRes.choices[0]?.message?.content?.trim() ?? "";

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const analysis: AIAnalysis = JSON.parse(cleaned);
    setAnalysis(sessionId, analysis);
    setAnalysisStatus(sessionId, "complete");
    return NextResponse.json(analysis);
  } catch (err) {
    setAnalysisStatus(sessionId, "failed");
    const message =
      err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * GET /api/sessions/[sessionId]/analyze
 * Returns cached analysis and current status.
 */
export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const cached = getAnalysis(sessionId);
  const status = getAnalysisStatus(sessionId);
  return NextResponse.json({ analysis: cached ?? null, status });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
