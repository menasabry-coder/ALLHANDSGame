import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getSession, listQuestions, getQuestionResults } from "@/lib/store";
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

  // Build results data for every question
  const questionsWithResults = questions.map((q) => {
    const results = getQuestionResults(q.id);
    return {
      id: q.id,
      text: q.text,
      options: q.options,
      order: q.order,
      votes: results?.votes ?? {},
      totalVotes: results?.totalVotes ?? 0,
    };
  });

  // ---- Step 1: Generate embeddings for each question text ----
  const embeddingTexts = questionsWithResults.map(
    (q) =>
      `Question: ${q.text}\nOptions: ${q.options.join(", ")}\nVote distribution: ${q.options.map((opt, i) => `${opt}: ${q.votes[i] ?? 0}`).join(", ")}`
  );

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
  const similarities: string[] = [];
  if (embeddingData.length >= 2) {
    for (let i = 0; i < embeddingData.length; i++) {
      for (let j = i + 1; j < embeddingData.length; j++) {
        const sim = cosineSimilarity(embeddingData[i], embeddingData[j]);
        if (sim > 0.75) {
          similarities.push(
            `Questions "${questionsWithResults[i].text}" and "${questionsWithResults[j].text}" are thematically related (similarity: ${sim.toFixed(2)}).`
          );
        }
      }
    }
  }

  // ---- Step 3: Chat completion to produce the analysis ----
  const systemPrompt = `You are an expert data analyst for live polling sessions at engineering all-hands meetings.
You will be given the questions, their answer options, and the voting results.
${similarities.length > 0 ? `\nThematic analysis from embeddings:\n${similarities.join("\n")}` : ""}

Analyse the data and return a JSON object (no markdown fences) with this exact structure:
{
  "summary": "A 2-4 sentence narrative summary of what the votes reveal about the team's sentiments and preferences.",
  "questionInsights": [
    {
      "questionId": "<id>",
      "questionText": "<text>",
      "insight": "A 1-2 sentence insight about the voting pattern for this question.",
      "recommendedVisualization": "<bar|pie|donut|ranking>"
    }
  ],
  "overallThemes": ["theme1", "theme2"],
  "sentiment": "A single sentence describing the overall team sentiment."
}

For recommendedVisualization:
- Use "pie" when one option dominates (>60%) or there are few options
- Use "donut" for evenly split results
- Use "ranking" when options represent an ordered preference
- Use "bar" as default`;

  const userPrompt = `Session: "${session.name}"

${questionsWithResults.map((q) => `Question ${q.order}: "${q.text}"\nOptions & Votes:\n${q.options.map((opt, i) => `  - ${opt}: ${q.votes[i] ?? 0} votes`).join("\n")}\nTotal votes: ${q.totalVotes}`).join("\n\n")}`;

  try {
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
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
