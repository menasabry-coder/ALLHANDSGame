import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ questionId: string }>;
}

/**
 * GET /api/questions/[questionId]
 *
 * Returns the full question record including all options (rows + columns for matrix).
 * Used by the participant play screen to render the active question.
 */
export async function GET(_req: Request, { params }: Params) {
  const { questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      options: { orderBy: { order: "asc" } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: question.id,
    roundId: question.roundId,
    order: question.order,
    title: question.title,
    prompt: question.prompt,
    questionType: question.questionType,
    isActive: question.isActive,
    isLocked: question.isLocked,
    options: question.options,
  });
}
