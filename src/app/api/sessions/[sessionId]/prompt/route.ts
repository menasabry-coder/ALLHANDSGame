import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  getSession,
  listQuestions,
  getQuestionResults,
  getParticipantCount,
} from "@/lib/store";

interface Params {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/sessions/[sessionId]/prompt
 *
 * Send a custom prompt to OpenAI with the session context.
 * Body: { prompt: string }
 */
export async function POST(request: Request, { params }: Params) {
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

  const body = await request.json();
  const prompt: string | undefined = body?.prompt;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Provide a `prompt` (string)" },
      { status: 400 }
    );
  }

  const participantCount = getParticipantCount(sessionId);
  const questions = listQuestions(sessionId);
  const questionsWithResults = questions.map((q) => {
    const results = getQuestionResults(q.id);
    return {
      text: q.text,
      type: q.type,
      options: q.options,
      order: q.order,
      votes: results?.votes ?? {},
      totalVotes: results?.totalVotes ?? 0,
      freeTextAnswers: results?.freeTextAnswers ?? [],
    };
  });

  const contextBlock = `Session: "${session.name}"
Total participants: ${participantCount}

${questionsWithResults.map((q) => {
  if (q.type === "mcq") {
    return `Question ${q.order} (MCQ): "${q.text}"
Options & Votes:
${q.options.map((opt, i) => `  - ${opt}: ${q.votes[i] ?? 0} votes (${participantCount > 0 ? Math.round(((q.votes[i] ?? 0) / participantCount) * 100) : 0}% of participants)`).join("\n")}
Total votes: ${q.totalVotes}`;
  }
  return `Question ${q.order} (Free Text): "${q.text}"
Answers (${q.freeTextAnswers.length}):
${q.freeTextAnswers.map((a) => `  - "${a}"`).join("\n") || "  (no answers yet)"}`;
}).join("\n\n")}`;

  try {
    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert analyst for a live polling session at an engineering all-hands meeting. You have access to the full session data below. Respond helpfully to the user's query based on this context.\n\n${contextBlock}`,
        },
        { role: "user", content: prompt.trim() },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = chatRes.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ response });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
