import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  getSession,
  listQuestions,
  getQuestionResults,
  getParticipantCount,
} from "@/lib/store";
import { prisma } from "@/lib/prisma";
import type { AIAnalysis } from "@/lib/types";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/analyze
 *
 * Returns the most recent AnalysisResult records for this session.
 * Query params:
 *   ?type=current_question  — latest per-question analysis
 *   ?type=cumulative_pulse  — latest cumulative pulse
 *   ?questionId=<id>        — filter to a specific question (for current_question type)
 */
export async function GET(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const questionId = url.searchParams.get("questionId");

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const where = {
    sessionId,
    ...(type ? { analysisType: type } : {}),
    ...(questionId ? { questionId } : {}),
  };

  const results = await prisma.analysisResult.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: type === "cumulative_pulse" ? 1 : 50,
  });

  const parsed = results.map((r) => {
    try {
      return { ...r, payload: JSON.parse(r.payload) };
    } catch {
      return r;
    }
  });

  return NextResponse.json({ sessionId, results: parsed });
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
  const analysisModel = process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-4.1";
  const systemPrompt = `You are an expert data analyst for live polling sessions at engineering all-hands meetings.
You will be given the questions (MCQ and free-text), their answer options/responses, and the voting results.
Total participants in the session: ${participantCount}
${similarities.length > 0 ? `\nThematic analysis from embeddings:\n${similarities.join("\n")}` : ""}

Analyze the data and return a JSON object (no markdown fences) with this exact structure:
{
  "summary": "A 2-4 sentence narrative summary of what the votes/answers reveal about the team's sentiments and preferences. Include participation percentages where relevant.",
  "questionInsights": [
    {
      "questionId": "<id>",
      "questionText": "<text>",
      "insight": "A 1-2 sentence insight about the voting/answer pattern for this question. For MCQ, mention what % of participants chose each top option. For free-text, summarize the common themes.",
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
  ]
}

For recommendedVisualization:
- Use "pie" when one option dominates (>60%) or there are few options
- Use "donut" for evenly split results
- Use "ranking" when options represent an ordered preference
- Use "bar" as default for MCQ
- Use "wordcloud" for free-text questions with many short answers
- Use "list" for free-text questions with longer answers

For infographics: Generate 3-6 insightful data cards that would make a great infographic dashboard. Examples: participation rate, most popular answer, consensus level, engagement score, etc.`;

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
      model: analysisModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const raw = chatRes.choices[0]?.message?.content?.trim() ?? "";

    // Strip markdown fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const analysis: AIAnalysis = JSON.parse(cleaned);
    return NextResponse.json(analysis);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
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
