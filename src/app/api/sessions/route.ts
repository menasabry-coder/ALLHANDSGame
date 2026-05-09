import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitGameEvent } from "@/lib/eventBus";

/** Generate a human-readable meeting code like GAME-X7K2 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GAME-${suffix}`;
}

/** GET /api/sessions — list all sessions (Prisma-backed) */
export async function GET() {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { participants: true } } },
  });
  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      status: s.status,
      activeRoundId: s.activeRoundId,
      activeQuestionId: s.activeQuestionId,
      participantCount: s._count.participants,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))
  );
}

/** POST /api/sessions — create a new session (Prisma-backed) */
export async function POST(request: Request) {
  const body = await request.json();
  // Accept either "title" (Phase 3) or legacy "name"
  const title: string = (body?.title ?? body?.name ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "A session title is required" },
      { status: 400 }
    );
  }

  // Use caller-supplied code or generate one, retrying on collision
  let code: string = body?.code
    ? String(body.code).trim().toUpperCase()
    : generateCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const conflict = await prisma.gameSession.findUnique({ where: { code } });
    if (!conflict) break;
    code = generateCode();
  }

  const session = await prisma.gameSession.create({
    data: { code, title, status: "draft" },
  });

  emitGameEvent("session:created", session.id, {
    code: session.code,
    title: session.title,
  });

  return NextResponse.json(
    {
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      activeRoundId: session.activeRoundId,
      activeQuestionId: session.activeQuestionId,
      participantCount: 0,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}
