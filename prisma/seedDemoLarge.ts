/**
 * prisma/seedDemoLarge.ts
 *
 * Generates a demo session with 400 participants and realistic distributions
 * across engineering areas, experience levels, AI usage, and attitudes.
 *
 * Run with:  npm run seed:demo-large
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Distribution helpers
// ---------------------------------------------------------------------------

function pickWeighted<T>(options: Array<[T, number]>): T {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [val, w] of options) {
    r -= w;
    if (r <= 0) return val;
  }
  return options[options.length - 1][0];
}

const ENGINEERING_AREAS: Array<[string, number]> = [
  ["functional_safety", 15],
  ["embedded_software", 20],
  ["autosar", 10],
  ["cybersecurity", 12],
  ["testing", 15],
  ["diagnostics", 8],
  ["devops", 10],
  ["architecture", 10],
];

const EXPERIENCE_LEVELS: Array<[string, number]> = [
  ["junior", 20],
  ["mid", 35],
  ["senior", 30],
  ["lead", 15],
];

const AI_USAGE_LEVELS: Array<[string, number]> = [
  ["never", 15],
  ["rarely", 20],
  ["monthly", 25],
  ["weekly", 25],
  ["daily", 15],
];

const AI_ATTITUDES: Array<[string, number]> = [
  ["enthusiast", 20],
  ["cautious", 30],
  ["skeptic", 15],
  ["curious", 25],
  ["neutral", 10],
];

const PERSONAS = [
  "AI Champion",
  "Practical Adopter",
  "Safety Guardian",
  "Quality Defender",
  "Cybersecurity Watchdog",
  "AI Skeptic",
  "Automation Hunter",
  "Process Optimizer",
];

function pickPersona(): string {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding demo large session (400 participants)…");

  // Upsert session
  const session = await prisma.gameSession.upsert({
    where: { code: "DEMO400" },
    update: { title: "Demo 400-Participant Session", status: "completed" },
    create: {
      code: "DEMO400",
      title: "Demo 400-Participant Session",
      status: "completed",
    },
  });

  console.log(`Session: ${session.id} (${session.code})`);

  // Find key questions to attach responses to
  const smQ1 = await prisma.question.findFirst({ where: { roundId: "stock_market", order: 1 } });
  const rcQ1 = await prisma.question.findFirst({ where: { roundId: "risk_casino", order: 1 } });
  const mbQ1 = await prisma.question.findFirst({ where: { roundId: "mythbusters", order: 1 } });

  const smQ1Options = smQ1
    ? await prisma.questionOption.findMany({ where: { questionId: smQ1.id }, orderBy: { order: "asc" } })
    : [];
  const rcQ1Options = rcQ1
    ? await prisma.questionOption.findMany({ where: { questionId: rcQ1.id }, orderBy: { order: "asc" } })
    : [];
  const mbQ1Options = mbQ1
    ? await prisma.questionOption.findMany({
        where: { questionId: mbQ1.id, category: { not: "myth_meta" } },
        orderBy: { order: "asc" },
      })
    : [];

  // Delete existing participants for this session to allow re-running
  await prisma.response.deleteMany({ where: { sessionId: session.id } });
  await prisma.participant.deleteMany({ where: { sessionId: session.id } });

  const TOTAL = 400;
  let created = 0;

  for (let i = 0; i < TOTAL; i++) {
    const engineeringArea = pickWeighted(ENGINEERING_AREAS);
    const experienceLevel = pickWeighted(EXPERIENCE_LEVELS);
    const aiUsageLevel = pickWeighted(AI_USAGE_LEVELS);
    const aiAttitude = pickWeighted(AI_ATTITUDES);
    const persona = pickPersona();

    const participant = await prisma.participant.create({
      data: {
        sessionId: session.id,
        engineeringArea,
        experienceLevel,
        aiUsageLevel,
        aiAttitude,
        persona,
        teamAlias: `Engineer_${String(i + 1).padStart(3, "0")}`,
      },
    });

    // Attach responses to key questions if they exist
    if (smQ1 && smQ1Options.length > 0) {
      const allocation: Record<string, number> = {};
      const shuffled = [...smQ1Options].sort(() => Math.random() - 0.5);
      const topPicks = shuffled.slice(0, Math.floor(Math.random() * 4) + 2);
      let remaining = 100;
      topPicks.forEach((opt, idx) => {
        const coins = idx === topPicks.length - 1 ? remaining : Math.floor(Math.random() * (remaining / 2)) + 5;
        allocation[opt.id] = Math.min(coins, remaining);
        remaining -= allocation[opt.id];
      });

      await prisma.response.create({
        data: {
          sessionId: session.id,
          participantId: participant.id,
          questionId: smQ1.id,
          payload: JSON.stringify({ allocation }),
        },
      });
    }

    if (rcQ1 && rcQ1Options.length > 0) {
      const votableOptions = rcQ1Options.filter((o) => o.category !== "myth_meta");
      if (votableOptions.length > 0) {
        const allocation: Record<string, number> = {};
        const shuffled = [...votableOptions].sort(() => Math.random() - 0.5);
        const topPicks = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
        let remaining = 100;
        topPicks.forEach((opt, idx) => {
          const coins = idx === topPicks.length - 1 ? remaining : Math.floor(Math.random() * (remaining / 2)) + 5;
          allocation[opt.id] = Math.min(coins, remaining);
          remaining -= allocation[opt.id];
        });

        await prisma.response.create({
          data: {
            sessionId: session.id,
            participantId: participant.id,
            questionId: rcQ1.id,
            payload: JSON.stringify({ allocation }),
          },
        });
      }
    }

    if (mbQ1 && mbQ1Options.length > 0) {
      const voteOptions = mbQ1Options.filter((o) => o.category === "vote" || !o.category);
      if (voteOptions.length > 0) {
        const selectedOptionIds = [
          voteOptions[Math.floor(Math.random() * voteOptions.length)].id,
        ];
        await prisma.response.create({
          data: {
            sessionId: session.id,
            participantId: participant.id,
            questionId: mbQ1.id,
            payload: JSON.stringify({ selectedOptionIds }),
          },
        });
      }
    }

    created++;
    if (created % 50 === 0) {
      console.log(`  Created ${created}/${TOTAL} participants…`);
    }
  }

  console.log(`\nDemo seed complete: ${TOTAL} participants`);
  console.log(`Session code: DEMO400`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
