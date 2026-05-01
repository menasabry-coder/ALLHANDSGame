/**
 * prisma/seed.ts
 *
 * Seeds the SQLite database with:
 *  - One demo GameSession
 *  - Registration questions (answered during join)
 *  - Placeholder questions for Round 1: AI Adoption Stock Market
 *  - Placeholder questions for Round 2: AI Risk Casino
 *  - Placeholder questions for Round 3: AI MythBusters
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface OptionSeed {
  id: string;
  label: string;
  description?: string;
  category?: string;
  severity?: string;
  riskLevel?: string;
  order: number;
}

interface QuestionSeed {
  id: string;
  roundId: string;
  order: number;
  title: string;
  prompt: string;
  questionType: string;
  options: OptionSeed[];
}

async function upsertQuestion(q: QuestionSeed) {
  await prisma.question.upsert({
    where: { id: q.id },
    update: {},
    create: {
      id: q.id,
      roundId: q.roundId,
      order: q.order,
      title: q.title,
      prompt: q.prompt,
      questionType: q.questionType,
    },
  });
  for (const o of q.options) {
    await prisma.questionOption.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        questionId: q.id,
        label: o.label,
        description: o.description ?? null,
        category: o.category ?? null,
        severity: o.severity ?? null,
        riskLevel: o.riskLevel ?? null,
        order: o.order,
      },
    });
  }
}

async function main() {
  console.log("🌱 Seeding database…");

  // -------------------------------------------------------------------------
  // Demo session
  // -------------------------------------------------------------------------
  const session = await prisma.gameSession.upsert({
    where: { code: "ARENA-2026" },
    update: {},
    create: {
      code: "ARENA-2026",
      title: "AI Arena — Automotive Engineering Dept. All-Hands 2026",
      status: "draft",
    },
  });
  console.log(`✓ Session: ${session.code} (${session.id})`);

  // -------------------------------------------------------------------------
  // Registration questions  (roundId = "registration")
  // -------------------------------------------------------------------------
  const regQuestions: QuestionSeed[] = [
    {
      id: "reg_q1",
      roundId: "registration",
      order: 1,
      title: "Engineering Area",
      prompt: "Which engineering area best describes your current role?",
      questionType: "single_choice",
      options: [
        { id: "reg_q1_o1", label: "Software / Embedded", order: 1 },
        { id: "reg_q1_o2", label: "Systems Engineering", order: 2 },
        { id: "reg_q1_o3", label: "Integration & Test", order: 3 },
        { id: "reg_q1_o4", label: "Architecture / Platform", order: 4 },
        { id: "reg_q1_o5", label: "Other / Management", order: 5 },
      ],
    },
    {
      id: "reg_q2",
      roundId: "registration",
      order: 2,
      title: "Experience Level",
      prompt: "How many years of professional engineering experience do you have?",
      questionType: "single_choice",
      options: [
        { id: "reg_q2_o1", label: "0–3 years", order: 1 },
        { id: "reg_q2_o2", label: "4–8 years", order: 2 },
        { id: "reg_q2_o3", label: "9–15 years", order: 3 },
        { id: "reg_q2_o4", label: "16+ years", order: 4 },
      ],
    },
    {
      id: "reg_q3",
      roundId: "registration",
      order: 3,
      title: "Current AI Usage",
      prompt: "How often do you currently use AI tools in your work?",
      questionType: "single_choice",
      options: [
        { id: "reg_q3_o1", label: "Daily", order: 1 },
        { id: "reg_q3_o2", label: "Several times a week", order: 2 },
        { id: "reg_q3_o3", label: "Occasionally", order: 3 },
        { id: "reg_q3_o4", label: "Rarely or never", order: 4 },
      ],
    },
    {
      id: "reg_q4",
      roundId: "registration",
      order: 4,
      title: "AI Attitude",
      prompt:
        "Which statement best captures your current attitude toward AI in automotive software?",
      questionType: "single_choice",
      options: [
        { id: "reg_q4_o1", label: "Early adopter — I actively experiment", order: 1 },
        { id: "reg_q4_o2", label: "Optimistic but cautious", order: 2 },
        { id: "reg_q4_o3", label: "Neutral / waiting to see", order: 3 },
        { id: "reg_q4_o4", label: "Skeptical — I need convincing", order: 4 },
        { id: "reg_q4_o5", label: "Concerned about risks", order: 5 },
      ],
    },
  ];

  for (const q of regQuestions) await upsertQuestion(q);
  console.log(`✓ ${regQuestions.length} registration questions seeded`);

  // -------------------------------------------------------------------------
  // Round 1: AI Adoption Stock Market  (roundId = "stock_market")
  // -------------------------------------------------------------------------
  const stockMarketQuestions: QuestionSeed[] = [
    {
      id: "sm_q1",
      roundId: "stock_market",
      order: 1,
      title: "AI Investment Priority",
      prompt:
        "You have 100 tokens to allocate across AI capabilities. Where does your team invest?",
      questionType: "allocation",
      options: [
        { id: "sm_q1_o1", label: "Code generation & review", category: "productivity", order: 1 },
        { id: "sm_q1_o2", label: "Test automation & coverage", category: "quality", order: 2 },
        { id: "sm_q1_o3", label: "Requirements analysis", category: "requirements", order: 3 },
        { id: "sm_q1_o4", label: "Defect prediction & root-cause", category: "quality", order: 4 },
        { id: "sm_q1_o5", label: "Documentation generation", category: "productivity", order: 5 },
      ],
    },
    {
      id: "sm_q2",
      roundId: "stock_market",
      order: 2,
      title: "Adoption Readiness",
      prompt:
        "What is the single biggest blocker to broader AI adoption in your area today?",
      questionType: "single_choice",
      options: [
        { id: "sm_q2_o1", label: "Trust / explainability concerns", order: 1 },
        { id: "sm_q2_o2", label: "Lack of tooling / infrastructure", order: 2 },
        { id: "sm_q2_o3", label: "Unclear ownership & governance", order: 3 },
        { id: "sm_q2_o4", label: "Skills gap in the team", order: 4 },
        { id: "sm_q2_o5", label: "Regulatory / safety compliance", order: 5 },
      ],
    },
    {
      id: "sm_q3",
      roundId: "stock_market",
      order: 3,
      title: "Expected ROI Horizon",
      prompt:
        "When do you expect AI tooling to deliver a meaningful productivity gain in your daily workflow?",
      questionType: "single_choice",
      options: [
        { id: "sm_q3_o1", label: "It already has", order: 1 },
        { id: "sm_q3_o2", label: "Within 6 months", order: 2 },
        { id: "sm_q3_o3", label: "6–18 months", order: 3 },
        { id: "sm_q3_o4", label: "18 months – 3 years", order: 4 },
        { id: "sm_q3_o5", label: "Unsure / skeptical", order: 5 },
      ],
    },
  ];

  for (const q of stockMarketQuestions) await upsertQuestion(q);
  console.log(`✓ ${stockMarketQuestions.length} Stock Market questions seeded`);

  // -------------------------------------------------------------------------
  // Round 2: AI Risk Casino  (roundId = "risk_casino")
  // -------------------------------------------------------------------------
  const riskCasinoQuestions: QuestionSeed[] = [
    {
      id: "rc_q1",
      roundId: "risk_casino",
      order: 1,
      title: "Riskiest AI Use Case",
      prompt:
        "Which AI application in automotive software carries the highest safety risk?",
      questionType: "single_choice",
      options: [
        { id: "rc_q1_o1", label: "AI-generated AUTOSAR code without full review", severity: "high", riskLevel: "high", order: 1 },
        { id: "rc_q1_o2", label: "AI-assisted FMEA analysis", severity: "medium", riskLevel: "medium", order: 2 },
        { id: "rc_q1_o3", label: "AI test-case generation (coverage only)", severity: "low", riskLevel: "low", order: 3 },
        { id: "rc_q1_o4", label: "AI document summarization", severity: "minimal", riskLevel: "low", order: 4 },
      ],
    },
    {
      id: "rc_q2",
      roundId: "risk_casino",
      order: 2,
      title: "Risk Mitigation Priority",
      prompt:
        "Select the top 2 risk mitigations you believe the team should prioritize.",
      questionType: "multi_select",
      options: [
        { id: "rc_q2_o1", label: "Mandatory human-in-the-loop for safety-critical code", order: 1 },
        { id: "rc_q2_o2", label: "AI output audit trails & traceability", order: 2 },
        { id: "rc_q2_o3", label: "Red-team / adversarial testing of AI tools", order: 3 },
        { id: "rc_q2_o4", label: "Training & competency certification for AI users", order: 4 },
        { id: "rc_q2_o5", label: "Regulatory pre-approval for AI-assisted artefacts", order: 5 },
      ],
    },
    {
      id: "rc_q3",
      roundId: "risk_casino",
      order: 3,
      title: "Risk Appetite",
      prompt:
        "How would you describe your team's current risk appetite for adopting AI in production software?",
      questionType: "single_choice",
      options: [
        { id: "rc_q3_o1", label: "Risk-seeking — move fast, learn fast", order: 1 },
        { id: "rc_q3_o2", label: "Balanced — adopt with guardrails", order: 2 },
        { id: "rc_q3_o3", label: "Risk-averse — wait for proven standards", order: 3 },
        { id: "rc_q3_o4", label: "Avoidant — not ready for production AI", order: 4 },
      ],
    },
  ];

  for (const q of riskCasinoQuestions) await upsertQuestion(q);
  console.log(`✓ ${riskCasinoQuestions.length} Risk Casino questions seeded`);

  // -------------------------------------------------------------------------
  // Round 3: AI MythBusters  (roundId = "mythbusters")
  // -------------------------------------------------------------------------
  const mythBustersQuestions: QuestionSeed[] = [
    {
      id: "mb_q1",
      roundId: "mythbusters",
      order: 1,
      title: "The 'Black Box' Myth",
      prompt:
        '"AI is a black box — we can never know why it made a decision." Do you agree?',
      questionType: "single_choice",
      options: [
        { id: "mb_q1_o1", label: "Strongly agree — it will always be opaque", order: 1 },
        { id: "mb_q1_o2", label: "Partially agree — some use cases can be explained", order: 2 },
        { id: "mb_q1_o3", label: "Disagree — XAI tools already exist", order: 3 },
        { id: "mb_q1_o4", label: "Strongly disagree — transparency is improving fast", order: 4 },
      ],
    },
    {
      id: "mb_q2",
      roundId: "mythbusters",
      order: 2,
      title: "The 'Job Replacement' Myth",
      prompt:
        '"AI will replace automotive software engineers within 10 years." What is your view?',
      questionType: "single_choice",
      options: [
        { id: "mb_q2_o1", label: "Mostly true — significant displacement ahead", order: 1 },
        { id: "mb_q2_o2", label: "Partially true — some roles will change significantly", order: 2 },
        { id: "mb_q2_o3", label: "Unlikely — engineers using AI will outperform those who don't", order: 3 },
        { id: "mb_q2_o4", label: "False — engineering creativity cannot be automated", order: 4 },
      ],
    },
    {
      id: "mb_q3",
      roundId: "mythbusters",
      order: 3,
      title: "Open Reflection",
      prompt:
        "What is one AI capability you wish existed today that would most help your engineering work?",
      questionType: "free_text",
      options: [],
    },
  ];

  for (const q of mythBustersQuestions) await upsertQuestion(q);
  console.log(`✓ ${mythBustersQuestions.length} MythBusters questions seeded`);

  const total =
    regQuestions.length +
    stockMarketQuestions.length +
    riskCasinoQuestions.length +
    mythBustersQuestions.length;

  console.log("\n✅ Seed complete.");
  console.log(`   Session code: ${session.code}`);
  console.log(`   Session ID:   ${session.id}`);
  console.log(`   Total questions: ${total}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
