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
  // Phase 3 spec questions — R0.1 through R0.5
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
        { id: "reg_q1_o01", label: "Embedded software", order: 1 },
        { id: "reg_q1_o02", label: "AUTOSAR / BSW / MCAL", order: 2 },
        { id: "reg_q1_o03", label: "Application software", order: 3 },
        { id: "reg_q1_o04", label: "Powertrain controls", order: 4 },
        { id: "reg_q1_o05", label: "Diagnostics / UDS", order: 5 },
        { id: "reg_q1_o06", label: "Cybersecurity", order: 6 },
        { id: "reg_q1_o07", label: "Functional safety", order: 7 },
        { id: "reg_q1_o08", label: "Testing / validation", order: 8 },
        { id: "reg_q1_o09", label: "DevOps / CI/CD", order: 9 },
        { id: "reg_q1_o10", label: "Tools / automation", order: 10 },
        { id: "reg_q1_o11", label: "System engineering / requirements", order: 11 },
        { id: "reg_q1_o12", label: "Calibration", order: 12 },
        { id: "reg_q1_o13", label: "Architecture", order: 13 },
        { id: "reg_q1_o14", label: "Project / technical leadership", order: 14 },
        { id: "reg_q1_o15", label: "Other", order: 15 },
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
        { id: "reg_q2_o1", label: "0–2 years", order: 1 },
        { id: "reg_q2_o2", label: "3–5 years", order: 2 },
        { id: "reg_q2_o3", label: "6–10 years", order: 3 },
        { id: "reg_q2_o4", label: "11–15 years", order: 4 },
        { id: "reg_q2_o5", label: "15+ years", order: 5 },
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
        { id: "reg_q3_o1", label: "I do not use AI tools", order: 1 },
        { id: "reg_q3_o2", label: "I tried them once or twice", order: 2 },
        { id: "reg_q3_o3", label: "I use AI occasionally", order: 3 },
        { id: "reg_q3_o4", label: "I use AI weekly", order: 4 },
        { id: "reg_q3_o5", label: "I use AI daily", order: 5 },
        { id: "reg_q3_o6", label: "I already build AI-assisted workflows", order: 6 },
      ],
    },
    {
      id: "reg_q4",
      roundId: "registration",
      order: 4,
      title: "Current AI Attitude",
      prompt: "How would you describe your current attitude toward AI?",
      questionType: "single_choice",
      options: [
        { id: "reg_q4_o1", label: "Excited", order: 1 },
        { id: "reg_q4_o2", label: "Curious", order: 2 },
        { id: "reg_q4_o3", label: "Neutral", order: 3 },
        { id: "reg_q4_o4", label: "Careful", order: 4 },
        { id: "reg_q4_o5", label: "Skeptical", order: 5 },
        { id: "reg_q4_o6", label: "Concerned", order: 6 },
      ],
    },
    {
      id: "reg_q5",
      roundId: "registration",
      order: 5,
      title: "Team Alias",
      prompt: "Optional: enter a team alias or table name.",
      questionType: "free_text",
      options: [],
    },
  ];

  for (const q of regQuestions) await upsertQuestion(q);
  console.log(`✓ ${regQuestions.length} registration questions seeded`);

  // -------------------------------------------------------------------------
  // Round 1: AI Adoption Stock Market  (roundId = "stock_market")
  // SM1 — Main Investment (allocation, 16 AI stock cards)
  // SM2 — Near-Term Pilot Feasibility (multi-select, max 3)
  // SM3 — Time Saving Activity (single choice)
  // SM3b — Hours Saved (single choice, follow-up)
  // SM4 — AI Trust Boundary (multi-select, max 5)
  // SM5 — Free-Text AI Wish (free text)
  // -------------------------------------------------------------------------

  // 16 AI stock options — shared between SM1 and SM2
  const AI_STOCK_OPTIONS: OptionSeed[] = [
    { id: "sm_stock_01", label: "AI Unit Test Generator",              description: "Generate unit tests from code and requirements",                            category: "quality",      riskLevel: "medium",      order: 1 },
    { id: "sm_stock_02", label: "AI Code Review Assistant",            description: "Review PRs for bugs, maintainability, test gaps",                         category: "productivity", riskLevel: "medium",      order: 2 },
    { id: "sm_stock_03", label: "AI Requirements Clarifier",           description: "Convert vague requirements into questions and acceptance criteria",        category: "requirements", riskLevel: "medium",      order: 3 },
    { id: "sm_stock_04", label: "AI Traceability Assistant",           description: "Link requirements, design, code, tests, defects",                        category: "process",      riskLevel: "medium",      order: 4 },
    { id: "sm_stock_05", label: "AI CI Failure Doctor",                description: "Analyze failed builds/tests/logs and propose root cause",                 category: "devops",       riskLevel: "low",         order: 5 },
    { id: "sm_stock_06", label: "AI AUTOSAR Config Assistant",         description: "Generate/check AUTOSAR config consistency",                               category: "embedded",     riskLevel: "high",        order: 6 },
    { id: "sm_stock_07", label: "AI Diagnostics Assistant",            description: "Check UDS diagnostic flows, DTC logic, service tables",                   category: "diagnostics",  riskLevel: "medium-high", order: 7 },
    { id: "sm_stock_08", label: "AI Safety Analysis Assistant",        description: "Assist HARA, FMEA, safety requirement review",                            category: "safety",       riskLevel: "high",        order: 8 },
    { id: "sm_stock_09", label: "AI Cybersecurity Review Assistant",   description: "Identify security risks in code/config/design",                           category: "security",     riskLevel: "high",        order: 9 },
    { id: "sm_stock_10", label: "AI Documentation Generator",          description: "Generate design notes, API docs, release notes",                          category: "productivity", riskLevel: "low",         order: 10 },
    { id: "sm_stock_11", label: "AI Legacy Code Explainer",            description: "Explain old C/C++ modules and dependencies",                              category: "productivity", riskLevel: "low",         order: 11 },
    { id: "sm_stock_12", label: "AI Calibration Data Analyzer",        description: "Analyze calibration trends and anomalies",                                category: "calibration",  riskLevel: "medium",      order: 12 },
    { id: "sm_stock_13", label: "AI Simulation Scenario Generator",    description: "Generate SIL/HIL/MIL test scenarios",                                    category: "testing",      riskLevel: "medium-high", order: 13 },
    { id: "sm_stock_14", label: "AI Log Analysis Assistant",           description: "Summarize ECU logs, CAN traces, test logs",                               category: "debugging",    riskLevel: "medium",      order: 14 },
    { id: "sm_stock_15", label: "AI Architecture Reviewer",            description: "Challenge design decisions and generate ADRs",                            category: "architecture", riskLevel: "high",        order: 15 },
    { id: "sm_stock_16", label: "AI Production Code Generator",        description: "Generate implementation code for product modules",                        category: "productivity", riskLevel: "high",        order: 16 },
  ];

  const stockMarketQuestions: QuestionSeed[] = [
    // SM1 — Allocation
    {
      id: "sm_q1",
      roundId: "stock_market",
      order: 1,
      title: "Where should we invest AI effort first?",
      prompt: "You have 100 AI coins. Invest them in the AI use cases that would create the highest value for your daily engineering work.",
      questionType: "allocation",
      options: AI_STOCK_OPTIONS.map((o) => ({ ...o, id: `sm1_${o.id}` })),
    },
    // SM2 — Multi-select max 3
    {
      id: "sm_q2",
      roundId: "stock_market",
      order: 2,
      title: "What can we realistically pilot in the next 3 months?",
      prompt: "Select up to 3 AI use cases that are realistic to pilot quickly in our department.",
      questionType: "multi_select",
      options: AI_STOCK_OPTIONS.map((o) => ({ ...o, id: `sm2_${o.id}`, category: "max3" })),
    },
    // SM3 — Single choice (time-saving activity)
    {
      id: "sm_q3",
      roundId: "stock_market",
      order: 3,
      title: "Where would AI save your team the most time?",
      prompt: "Choose the engineering activity where AI could save you the most time personally.",
      questionType: "single_choice",
      options: [
        { id: "sm_q3_o01", label: "Requirements clarification",  order: 1 },
        { id: "sm_q3_o02", label: "Design and architecture",      order: 2 },
        { id: "sm_q3_o03", label: "Coding",                       order: 3 },
        { id: "sm_q3_o04", label: "Unit testing",                 order: 4 },
        { id: "sm_q3_o05", label: "Integration testing",          order: 5 },
        { id: "sm_q3_o06", label: "Debugging",                    order: 6 },
        { id: "sm_q3_o07", label: "Code review",                  order: 7 },
        { id: "sm_q3_o08", label: "Documentation",                order: 8 },
        { id: "sm_q3_o09", label: "Traceability",                 order: 9 },
        { id: "sm_q3_o10", label: "Safety analysis",              order: 10 },
        { id: "sm_q3_o11", label: "Cybersecurity review",         order: 11 },
        { id: "sm_q3_o12", label: "CI/CD failure analysis",       order: 12 },
        { id: "sm_q3_o13", label: "Calibration analysis",         order: 13 },
        { id: "sm_q3_o14", label: "AUTOSAR configuration",        order: 14 },
        { id: "sm_q3_o15", label: "Diagnostics",                  order: 15 },
        { id: "sm_q3_o16", label: "Release preparation",          order: 16 },
      ],
    },
    // SM3b — Follow-up: hours saved
    {
      id: "sm_q3b",
      roundId: "stock_market",
      order: 4,
      title: "How many hours per week could AI save you?",
      prompt: "How many hours per week could this save you personally?",
      questionType: "single_choice",
      options: [
        { id: "sm_q3b_o1", label: "Less than 1 hour",   order: 1 },
        { id: "sm_q3b_o2", label: "1–2 hours",           order: 2 },
        { id: "sm_q3b_o3", label: "3–5 hours",           order: 3 },
        { id: "sm_q3b_o4", label: "6–10 hours",          order: 4 },
        { id: "sm_q3b_o5", label: "More than 10 hours",  order: 5 },
        { id: "sm_q3b_o6", label: "Not sure",             order: 6 },
      ],
    },
    // SM4 — Multi-select max 5 (trust boundary)
    {
      id: "sm_q4",
      roundId: "stock_market",
      order: 5,
      title: "Where should AI stop?",
      prompt: "Which tasks should AI assist with but never perform alone without human approval? (Select up to 5)",
      questionType: "multi_select",
      options: [
        { id: "sm_q4_o01", label: "Safety requirement generation",          category: "max5", order: 1 },
        { id: "sm_q4_o02", label: "Cybersecurity risk assessment",           category: "max5", order: 2 },
        { id: "sm_q4_o03", label: "Production code generation",              category: "max5", order: 3 },
        { id: "sm_q4_o04", label: "AUTOSAR configuration changes",           category: "max5", order: 4 },
        { id: "sm_q4_o05", label: "Diagnostic service definition",           category: "max5", order: 5 },
        { id: "sm_q4_o06", label: "Calibration parameter recommendation",    category: "max5", order: 6 },
        { id: "sm_q4_o07", label: "Architecture decisions",                  category: "max5", order: 7 },
        { id: "sm_q4_o08", label: "Test result acceptance",                  category: "max5", order: 8 },
        { id: "sm_q4_o09", label: "Release readiness decision",              category: "max5", order: 9 },
        { id: "sm_q4_o10", label: "Customer requirement interpretation",     category: "max5", order: 10 },
        { id: "sm_q4_o11", label: "Supplier deliverable acceptance",         category: "max5", order: 11 },
        { id: "sm_q4_o12", label: "CI/CD pipeline changes",                  category: "max5", order: 12 },
        { id: "sm_q4_o13", label: "Code refactoring",                        category: "max5", order: 13 },
        { id: "sm_q4_o14", label: "Unit test generation",                    category: "max5", order: 14 },
        { id: "sm_q4_o15", label: "Documentation generation",                category: "max5", order: 15 },
      ],
    },
    // SM5 — Free text
    {
      id: "sm_q5",
      roundId: "stock_market",
      order: 6,
      title: "What is one repetitive engineering task you wish AI could remove?",
      prompt: "Write one repetitive engineering task you wish AI could reduce or remove. Do not include confidential project names, customer data, or source code.",
      questionType: "free_text",
      options: [],
    },
  ];

  for (const q of stockMarketQuestions) await upsertQuestion(q);
  console.log(`✓ ${stockMarketQuestions.length} Stock Market questions seeded (SM1–SM5+follow-up)`);

  // -------------------------------------------------------------------------
  // Round 2: AI Risk Casino  (roundId = "risk_casino")
  // RC1 — Main Risk Bet (allocation, 18 risk cards)
  // RC2 — Control Readiness (matrix: 18 risk rows × 5 control columns)
  // RC3 — Governance Rule (single choice, 12 options)
  // RC4 — Automotive High-Risk Scenarios (matrix: 15 scenario rows × 5 autonomy cols)
  // RC5 — Free-Text Control (free text)
  // -------------------------------------------------------------------------

  // 18 risk card options — shared for RC1 and RC2 rows
  const RC_RISK_ROW_OPTIONS: OptionSeed[] = [
    { id: "rc_risk_01", label: "Over-trust in AI output",            description: "Engineers accept AI output without enough review",             severity: "critical",    category: "row", order: 1 },
    { id: "rc_risk_02", label: "Hallucinated APIs / fake facts",     description: "AI invents functions, interfaces, constraints, or standards",  severity: "high",        category: "row", order: 2 },
    { id: "rc_risk_03", label: "Safety-critical misuse",             description: "AI used directly on ASIL-related logic without gates",         severity: "critical",    category: "row", order: 3 },
    { id: "rc_risk_04", label: "Cybersecurity/IP leakage",           description: "Sensitive code, customer data, or architecture exposed",        severity: "critical",    category: "row", order: 4 },
    { id: "rc_risk_05", label: "Prompt injection / tool manipulation",description: "AI tools influenced by malicious repo content or external data",severity: "high",        category: "row", order: 5 },
    { id: "rc_risk_06", label: "Weak traceability",                  description: "AI artifacts not linked to requirements/tests",                 severity: "high",        category: "row", order: 6 },
    { id: "rc_risk_07", label: "Poor test coverage",                 description: "AI-generated code looks good but misses edge cases",            severity: "high",        category: "row", order: 7 },
    { id: "rc_risk_08", label: "Hidden technical debt",              description: "Duplicated or unmaintainable AI-generated code",                severity: "medium-high", category: "row", order: 8 },
    { id: "rc_risk_09", label: "Wrong requirement interpretation",   description: "AI misunderstands ambiguous customer/system requirements",      severity: "high",        category: "row", order: 9 },
    { id: "rc_risk_10", label: "SOTIF blind spots",                  description: "AI misses misuse cases or performance limitations",              severity: "critical",    category: "row", order: 10 },
    { id: "rc_risk_11", label: "Configuration mistakes",             description: "Wrong AUTOSAR/BSW/MCAL config suggestions",                    severity: "high",        category: "row", order: 11 },
    { id: "rc_risk_12", label: "Calibration misuse",                 description: "AI suggests parameters without physical validation",            severity: "critical",    category: "row", order: 12 },
    { id: "rc_risk_13", label: "False confidence from polished output",description: "AI sounds professional but is wrong",                         severity: "high",        category: "row", order: 13 },
    { id: "rc_risk_14", label: "Loss of engineering skill",          description: "Junior engineers rely on AI without understanding",              severity: "medium",      category: "row", order: 14 },
    { id: "rc_risk_15", label: "Inconsistent coding style",          description: "AI violates coding/project rules",                             severity: "medium",      category: "row", order: 15 },
    { id: "rc_risk_16", label: "Tool qualification uncertainty",     description: "Unclear AI tool usage in safety lifecycle",                     severity: "high",        category: "row", order: 16 },
    { id: "rc_risk_17", label: "Data quality dependency",            description: "Poor outputs due to messy internal data",                       severity: "medium",      category: "row", order: 17 },
    { id: "rc_risk_18", label: "Management over-expectation",        description: "AI expected to replace hard engineering too quickly",           severity: "medium-high", category: "row", order: 18 },
  ];

  // RC2 column options (control readiness levels)
  const RC2_COL_OPTIONS: OptionSeed[] = [
    { id: "rc2_col_1", label: "Yes, strong controls exist", category: "column", order: 101 },
    { id: "rc2_col_2", label: "Some controls exist",        category: "column", order: 102 },
    { id: "rc2_col_3", label: "Weak controls exist",        category: "column", order: 103 },
    { id: "rc2_col_4", label: "No clear controls",          category: "column", order: 104 },
    { id: "rc2_col_5", label: "I don't know",               category: "column", order: 105 },
  ];

  // RC4 row scenarios
  const RC4_ROW_OPTIONS: OptionSeed[] = [
    { id: "rc4_row_01", label: "AI generates unit tests for non-safety utility code",      category: "row", order: 1 },
    { id: "rc4_row_02", label: "AI writes release notes from closed issues",               category: "row", order: 2 },
    { id: "rc4_row_03", label: "AI summarizes CAN logs from a failed test",                category: "row", order: 3 },
    { id: "rc4_row_04", label: "AI suggests a fix for a failing CI pipeline",              category: "row", order: 4 },
    { id: "rc4_row_05", label: "AI generates production C code for signal validation",     category: "row", order: 5 },
    { id: "rc4_row_06", label: "AI modifies AUTOSAR configuration files",                  category: "row", order: 6 },
    { id: "rc4_row_07", label: "AI proposes calibration values for torque control",        category: "row", order: 7 },
    { id: "rc4_row_08", label: "AI drafts safety requirements from a feature description", category: "row", order: 8 },
    { id: "rc4_row_09", label: "AI reviews cybersecurity impact of a diagnostic service",  category: "row", order: 9 },
    { id: "rc4_row_10", label: "AI generates test scenarios for HIL validation",            category: "row", order: 10 },
    { id: "rc4_row_11", label: "AI explains legacy code to a new engineer",                category: "row", order: 11 },
    { id: "rc4_row_12", label: "AI accepts a test result as pass/fail without human approval", category: "row", order: 12 },
    { id: "rc4_row_13", label: "AI creates customer-facing requirement wording",           category: "row", order: 13 },
    { id: "rc4_row_14", label: "AI generates a software architecture decision record",     category: "row", order: 14 },
    { id: "rc4_row_15", label: "AI updates traceability links between requirements and tests", category: "row", order: 15 },
  ];

  // RC4 column options (autonomy levels)
  const RC4_COL_OPTIONS: OptionSeed[] = [
    { id: "rc4_col_1", label: "Allow freely",             category: "column", order: 101 },
    { id: "rc4_col_2", label: "Allow with human review",  category: "column", order: 102 },
    { id: "rc4_col_3", label: "Allow only as suggestion", category: "column", order: 103 },
    { id: "rc4_col_4", label: "Do not allow",             category: "column", order: 104 },
    { id: "rc4_col_5", label: "Not sure",                 category: "column", order: 105 },
  ];

  const riskCasinoQuestions: QuestionSeed[] = [
    // RC1 — Allocation
    {
      id: "rc_q1",
      roundId: "risk_casino",
      order: 1,
      title: "What can go wrong if we adopt AI badly?",
      prompt: "You have 100 risk chips. Place them on the AI risks you believe are most dangerous for our department.",
      questionType: "allocation",
      options: RC_RISK_ROW_OPTIONS.map((o) => ({ ...o, id: `rc1_${o.id}`, category: o.severity })),
    },
    // RC2 — Matrix (control readiness)
    {
      id: "rc_q2",
      roundId: "risk_casino",
      order: 2,
      title: "Which risks do we already know how to control?",
      prompt: "For each risk, how strong are our current controls?",
      questionType: "matrix",
      options: [
        ...RC_RISK_ROW_OPTIONS.map((o) => ({ ...o, id: `rc2_${o.id}` })),
        ...RC2_COL_OPTIONS,
      ],
    },
    // RC3 — Single choice (governance rule)
    {
      id: "rc_q3",
      roundId: "risk_casino",
      order: 3,
      title: "What rule would make AI safer?",
      prompt: "Choose the governance rule that would most increase your confidence in using AI at work.",
      questionType: "single_choice",
      options: [
        { id: "rc_q3_o01", label: "Mandatory human review for AI-generated code",                  order: 1 },
        { id: "rc_q3_o02", label: "AI usage policy by allowed/prohibited use case",                order: 2 },
        { id: "rc_q3_o03", label: "Approved tools only",                                            order: 3 },
        { id: "rc_q3_o04", label: "No customer/confidential data in public AI tools",              order: 4 },
        { id: "rc_q3_o05", label: "AI-generated code must include tests",                          order: 5 },
        { id: "rc_q3_o06", label: "AI output must link to requirement/design/test IDs",            order: 6 },
        { id: "rc_q3_o07", label: "Safety-related AI use requires safety approval",                order: 7 },
        { id: "rc_q3_o08", label: "Cybersecurity review for AI-generated scripts/tools",           order: 8 },
        { id: "rc_q3_o09", label: "Prompt and output must be stored for audit",                    order: 9 },
        { id: "rc_q3_o10", label: "AI-generated changes must be marked in PRs",                    order: 10 },
        { id: "rc_q3_o11", label: "Training program before tool access",                           order: 11 },
        { id: "rc_q3_o12", label: "Team-level AI champions and reviewers",                         order: 12 },
      ],
    },
    // RC4 — Matrix (autonomy scenarios)
    {
      id: "rc_q4",
      roundId: "risk_casino",
      order: 4,
      title: "Would you allow AI here?",
      prompt: "For each scenario, choose the highest level of AI autonomy you would allow.",
      questionType: "matrix",
      options: [
        ...RC4_ROW_OPTIONS,
        ...RC4_COL_OPTIONS,
      ],
    },
    // RC5 — Free text
    {
      id: "rc_q5",
      roundId: "risk_casino",
      order: 5,
      title: "What control would make you comfortable using AI more?",
      prompt: "Write one rule, control, or safeguard that would make you more comfortable using AI in automotive software engineering. Do not include confidential data.",
      questionType: "free_text",
      options: [],
    },
  ];

  for (const q of riskCasinoQuestions) await upsertQuestion(q);
  console.log(`✓ ${riskCasinoQuestions.length} Risk Casino questions seeded (RC1–RC5)`);

  // -------------------------------------------------------------------------
  // Round 3: AI MythBusters  (roundId = "mythbusters")
  //
  // Each myth generates TWO questions:
  //   mb_q{n}_vote  — multi_select with vote (category="vote") + confidence
  //                   (category="confidence") option groups, plus myth_meta
  //                   options storing the recommended answer and reality text.
  //   mb_q{n}_fu    — single_choice follow-up question
  //
  // The participant UI detects the "vote" / "confidence" categories and renders
  // two separate radio groups.  Options with category="myth_meta" are hidden
  // from participants and read by the presenter dashboard for the reveal card.
  // -------------------------------------------------------------------------

  // Standard vote + confidence options (reused with unique IDs per myth)
  function mbVoteOpts(mythNum: string): OptionSeed[] {
    return [
      { id: `mb${mythNum}_v1`, label: "True",         category: "vote",       order: 1 },
      { id: `mb${mythNum}_v2`, label: "False",        category: "vote",       order: 2 },
      { id: `mb${mythNum}_v3`, label: "Depends",      category: "vote",       order: 3 },
      { id: `mb${mythNum}_v4`, label: "I don't know", category: "vote",       order: 4 },
      { id: `mb${mythNum}_c1`, label: "Very confident",      category: "confidence", order: 5 },
      { id: `mb${mythNum}_c2`, label: "Somewhat confident",  category: "confidence", order: 6 },
      { id: `mb${mythNum}_c3`, label: "Not confident",       category: "confidence", order: 7 },
    ];
  }

  interface MythSeed {
    num: string;
    title: string;
    statement: string;
    recommendedAnswer: string;
    reality: string;
    followUpQuestion: string;
    followUpOptions: string[];
  }

  const MYTHS: MythSeed[] = [
    {
      num: "01",
      title: "MB1 — Compiling Means Production Ready",
      statement: "AI-generated code is production-ready if it compiles.",
      recommendedAnswer: "False",
      reality: "Compiling only proves syntax and basic linkage. It does not prove correctness, safety, timing behavior, boundary handling, cybersecurity, traceability, maintainability, or requirement compliance.",
      followUpQuestion: "What is the minimum gate for AI-generated code?",
      followUpOptions: [
        "Compile only",
        "Compile + unit tests",
        "Unit tests + code review",
        "Requirement traceability + tests + review",
        "Depends on ASIL/security/process criticality",
      ],
    },
    {
      num: "02",
      title: "MB2 — AI Is Mainly for Production Code",
      statement: "AI is most useful for generating production code.",
      recommendedAnswer: "Depends, but usually not the first adoption area.",
      reality: "For automotive teams, lower-risk high-value starting areas are often tests, documentation, log analysis, code explanation, CI failure analysis, and review assistance. Direct production code generation needs stronger gates.",
      followUpQuestion: "Where should we start?",
      followUpOptions: [
        "Production code",
        "Unit tests",
        "Documentation",
        "CI/debugging",
        "Requirements clarification",
        "Code review",
        "Traceability",
      ],
    },
    {
      num: "03",
      title: "MB3 — AI Can Replace Senior Reviewers",
      statement: "AI can replace senior code reviewers.",
      recommendedAnswer: "False",
      reality: "AI can increase review coverage, suggest issues, and improve consistency, but senior reviewers understand context, architecture, safety implications, product history, and trade-offs.",
      followUpQuestion: "What role should AI have in review?",
      followUpOptions: [
        "No role",
        "Pre-review assistant",
        "Second reviewer",
        "Mandatory checklist reviewer",
        "Final approver",
      ],
    },
    {
      num: "04",
      title: "MB4 — AI Unit Tests Solve Quality",
      statement: "If AI writes the unit tests, the code quality problem is solved.",
      recommendedAnswer: "False",
      reality: "AI can generate useful tests, but it may miss requirements, equivalence classes, boundary cases, timing behavior, fault injection, hardware assumptions, and safety/security scenarios.",
      followUpQuestion: "What test type would benefit most from AI?",
      followUpOptions: [
        "Unit tests",
        "Integration tests",
        "HIL test scenarios",
        "Regression tests",
        "Fault injection tests",
        "Log-based test recommendations",
      ],
    },
    {
      num: "05",
      title: "MB5 — AI Should Never Touch Safety Work",
      statement: "AI should never be used in safety-related work.",
      recommendedAnswer: "Depends",
      reality: "AI may be useful as an assistant for summarization, checklist preparation, test idea generation, and review support, but final safety decisions and safety work products must remain under controlled engineering processes.",
      followUpQuestion: "What safety-related AI use would you allow first?",
      followUpOptions: [
        "Summarize safety requirements",
        "Generate review checklist",
        "Suggest test cases",
        "Draft FMEA ideas",
        "Generate safety-critical code",
        "None",
      ],
    },
    {
      num: "06",
      title: "MB6 — No Fault Means No Safety Risk",
      statement: "If the system has no fault, there is no safety risk.",
      recommendedAnswer: "False",
      reality: "SOTIF exists because hazards can result from functional insufficiencies, foreseeable misuse, or performance limitations, even when there is no classical malfunction.",
      followUpQuestion: "Where could AI help with SOTIF?",
      followUpOptions: [
        "Find misuse scenarios",
        "Generate edge-case scenarios",
        "Analyze limitations",
        "Summarize field feedback",
        "Create simulation scenarios",
        "I would not use AI here",
      ],
    },
    {
      num: "07",
      title: "MB7 — AI Can Generate Final Safety Requirements",
      statement: "AI can safely generate final safety requirements from a feature description.",
      recommendedAnswer: "Depends, but not as final output.",
      reality: "AI can draft candidate requirements and ask clarification questions, but safety requirements need system context, hazard analysis, ASIL reasoning, verification strategy, and expert approval.",
      followUpQuestion: "What should AI do in safety requirements work?",
      followUpOptions: [
        "Generate final requirements",
        "Suggest candidate requirements",
        "Ask clarification questions",
        "Check consistency",
        "Link requirements to tests",
        "No role",
      ],
    },
    {
      num: "08",
      title: "MB8 — Cybersecurity Is Only for Connected Features",
      statement: "Cybersecurity risk is only relevant to connected vehicle features.",
      recommendedAnswer: "False",
      reality: "Automotive cybersecurity is broader than infotainment or cloud connectivity. Diagnostic services, update mechanisms, development tools, interfaces, data, and ECU behavior can all have cybersecurity relevance.",
      followUpQuestion: "Where is AI most useful for cybersecurity?",
      followUpOptions: [
        "Threat modeling support",
        "Secure code review",
        "Diagnostic service risk review",
        "Security test generation",
        "Vulnerability triage",
        "I would avoid AI here",
      ],
    },
    {
      num: "09",
      title: "MB9 — Safe to Paste Code into Any AI Tool",
      statement: "It is safe to paste project code into any AI tool if the goal is only debugging.",
      recommendedAnswer: "False",
      reality: "Confidentiality, IP, customer agreements, cybersecurity policies, and data handling rules still apply. Approved enterprise tools and data rules are necessary.",
      followUpQuestion: "What should be the rule?",
      followUpOptions: [
        "Any AI tool is fine",
        "Approved tools only",
        "No confidential code",
        "No customer data",
        "Local/private AI only",
        "Depends on data classification",
      ],
    },
    {
      num: "10",
      title: "MB10 — AI Tools Create New Attack Surface",
      statement: "AI coding assistants create a new attack surface.",
      recommendedAnswer: "True",
      reality: "AI-connected development tools can introduce new risks, especially when they read repositories, execute actions, or interact with external context. Governance, approved tools, permission boundaries, and review are important.",
      followUpQuestion: "What control matters most?",
      followUpOptions: [
        "Approved tools",
        "Restricted permissions",
        "No autonomous execution",
        "Security review",
        "Prompt/output logging",
        "Developer training",
      ],
    },
    {
      num: "11",
      title: "MB11 — AI Documentation Automatically Helps ASPICE",
      statement: "AI-generated documentation is automatically useful for ASPICE.",
      recommendedAnswer: "False",
      reality: "Documentation is useful only if it is accurate, reviewed, consistent, and linked to the actual engineering artifacts. Automotive process capability depends on evidence quality, not document volume.",
      followUpQuestion: "What AI documentation use is most valuable?",
      followUpOptions: [
        "Design summaries",
        "Interface descriptions",
        "Review minutes",
        "Release notes",
        "Traceability suggestions",
        "Test reports",
      ],
    },
    {
      num: "12",
      title: "MB12 — Traceability Is a Perfect AI Use Case",
      statement: "Traceability is a perfect AI use case.",
      recommendedAnswer: "Depends",
      reality: "AI can suggest links between requirements, design, code, tests, and defects, but humans must validate the links. Wrong traceability creates false confidence.",
      followUpQuestion: "What traceability link should AI suggest first?",
      followUpOptions: [
        "Requirement to test",
        "Requirement to design",
        "Requirement to code",
        "Defect to test",
        "Change request to commit",
        "Safety requirement to verification evidence",
      ],
    },
    {
      num: "13",
      title: "MB13 — AI Understands AUTOSAR Like Normal Code",
      statement: "AI can understand AUTOSAR configuration as easily as normal application code.",
      recommendedAnswer: "False",
      reality: "AUTOSAR configuration depends on tooling, generated artifacts, dependencies, ECU extract, BSW stack configuration, integration constraints, and vendor-specific details. AI can assist, but direct changes need strong validation.",
      followUpQuestion: "What AUTOSAR task should AI support first?",
      followUpOptions: [
        "Explain configuration",
        "Check naming consistency",
        "Generate review checklist",
        "Detect missing links",
        "Suggest configuration changes",
        "Generate full configuration",
      ],
    },
    {
      num: "14",
      title: "MB14 — AI Is Safe for Calibration Because It Only Suggests Numbers",
      statement: "AI is safe for calibration because it only suggests numbers.",
      recommendedAnswer: "False",
      reality: "Calibration values affect physical behavior, drivability, emissions, thermal limits, torque response, battery behavior, and safety margins. Suggestions must go through engineering validation.",
      followUpQuestion: "Where could AI help calibration safely?",
      followUpOptions: [
        "Detect anomalies",
        "Summarize trends",
        "Compare calibration sets",
        "Suggest test points",
        "Generate reports",
        "Recommend final values",
      ],
    },
    {
      num: "15",
      title: "MB15 — AI Can Diagnose Test Failures Faster",
      statement: "AI can help diagnose test failures faster than manual log reading.",
      recommendedAnswer: "Often true, with validation.",
      reality: "AI can summarize logs, cluster similar failures, detect recurring patterns, and propose hypotheses. Root cause still needs verification.",
      followUpQuestion: "What logs should AI analyze first?",
      followUpOptions: [
        "CI logs",
        "CAN traces",
        "UDS diagnostic logs",
        "HIL logs",
        "SIL simulation logs",
        "Build logs",
        "Field issue logs",
      ],
    },
    {
      num: "16",
      title: "MB16 — AI Adoption Is Mainly Tooling",
      statement: "AI adoption is mainly a tooling topic.",
      recommendedAnswer: "False",
      reality: "AI adoption is a system change: tooling, process, training, governance, data classification, review culture, metrics, and leadership expectations.",
      followUpQuestion: "What is missing most in our department?",
      followUpOptions: [
        "Tools",
        "Training",
        "Governance",
        "Use-case selection",
        "Data access",
        "Management support",
        "Engineering champions",
        "Metrics",
      ],
    },
  ];

  const mythBustersQuestions: QuestionSeed[] = [];

  for (const myth of MYTHS) {
    const voteOrder = (parseInt(myth.num, 10) - 1) * 2 + 1;

    // Vote question (multi_select — vote group + confidence group + meta)
    mythBustersQuestions.push({
      id: `mb_q${myth.num}_vote`,
      roundId: "mythbusters",
      order: voteOrder,
      title: myth.title,
      prompt: myth.statement,
      questionType: "multi_select",
      options: [
        ...mbVoteOpts(myth.num),
        // Myth metadata — hidden from participant, read by presenter for reveal
        {
          id: `mb${myth.num}_m1`,
          label: "recommended_answer",
          description: myth.recommendedAnswer,
          category: "myth_meta",
          order: 8,
        },
        {
          id: `mb${myth.num}_m2`,
          label: "reality",
          description: myth.reality,
          category: "myth_meta",
          order: 9,
        },
      ],
    });

    // Follow-up question (single_choice)
    mythBustersQuestions.push({
      id: `mb_q${myth.num}_fu`,
      roundId: "mythbusters",
      order: voteOrder + 1,
      title: `${myth.title} — Follow-up`,
      prompt: myth.followUpQuestion,
      questionType: "single_choice",
      options: myth.followUpOptions.map((label, idx) => ({
        id: `mb${myth.num}_fu_o${String(idx + 1).padStart(2, "0")}`,
        label,
        order: idx + 1,
      })),
    });
  }

  for (const q of mythBustersQuestions) await upsertQuestion(q);
  console.log(`✓ ${mythBustersQuestions.length} MythBusters questions seeded (MB01–MB16 vote + follow-up)`);

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
