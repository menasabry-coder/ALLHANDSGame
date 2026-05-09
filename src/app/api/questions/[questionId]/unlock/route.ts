import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ questionId: string }>;
}

/**
 * POST /api/questions/[questionId]/unlock
 *
 * Re-opens a previously locked question so it can be activated again.
 */
export async function POST(_req: Request, { params }: Params) {
  const { questionId } = await params;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, isLocked: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (!question.isLocked) {
    return NextResponse.json(
      { error: "Question is not locked" },
      { status: 409 }
    );
  }

  const updated = await prisma.question.update({
    where: { id: questionId },
    data: { isLocked: false },
    select: { id: true, isLocked: true, isActive: true },
  });

  return NextResponse.json(updated);
}
