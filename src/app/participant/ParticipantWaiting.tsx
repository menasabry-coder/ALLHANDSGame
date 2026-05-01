"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";
import type { GameEvent, GameSessionDto, ParticipantDto, QuestionDto, ResponsePayload } from "@/types/game";

type ConnectionStatus = "connecting" | "connected" | "disconnected";
type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

const LS_SUBMITTED_KEY_PREFIX = "arena_submitted_"; // + sessionId
const LS_PARTICIPANT_KEY = "arena_participant";

interface Props {
  sessionId: string;
  participantId: string;
}

// ---------------------------------------------------------------------------
// Answer input components
// ---------------------------------------------------------------------------

/** Single-choice */
function SingleChoiceInput({
  question,
  value,
  onChange,
}: {
  question: QuestionDto;
  value: string;
  onChange: (id: string) => void;
}) {
  const rows = question.options.filter((o) => o.category !== "column");
  return (
    <div className="space-y-2">
      {rows.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={[
            "w-full text-left rounded-xl px-4 py-3 text-sm font-medium border transition",
            value === opt.id
              ? "border-blue-500 bg-blue-600/20 text-white"
              : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Multi-select with configurable max */
function MultiSelectInput({
  question,
  values,
  onChange,
}: {
  question: QuestionDto;
  values: string[];
  onChange: (ids: string[]) => void;
}) {
  // If this question has myth vote/confidence options, delegate to MythVoteInput
  const hasVoteGroup = question.options.some((o) => o.category === "vote");
  if (hasVoteGroup) {
    return <MythVoteInput question={question} values={values} onChange={onChange} />;
  }

  // Detect max from category field  ("max3", "max5", etc.)
  const firstCat = question.options[0]?.category ?? "";
  const maxMatch = firstCat.match(/^max(\d+)$/);
  const max = maxMatch ? parseInt(maxMatch[1], 10) : question.options.length;

  const rows = question.options.filter(
    (o) => !o.category?.startsWith("column") && o.category !== "myth_meta"
  );

  function toggle(id: string) {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else if (values.length < max) {
      onChange([...values, id]);
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Select up to {max} — {values.length}/{max} selected
      </p>
      <div className="space-y-2">
        {rows.map((opt) => {
          const selected = values.includes(opt.id);
          const disabled = !selected && values.length >= max;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              disabled={disabled}
              className={[
                "w-full text-left rounded-xl px-4 py-3 text-sm font-medium border transition",
                selected
                  ? "border-blue-500 bg-blue-600/20 text-white"
                  : disabled
                  ? "border-gray-800 bg-gray-900/30 text-gray-600 cursor-not-allowed"
                  : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white",
              ].join(" ")}
            >
              <span className="inline-block w-5 text-center mr-2">
                {selected ? "✓" : "○"}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Myth vote input — renders two separate radio groups:
 *   1. Vote: True / False / Depends / I don't know
 *   2. Confidence: Very confident / Somewhat confident / Not confident
 * Stores both selections as `selectedOptionIds`.
 */
function MythVoteInput({
  question,
  values,
  onChange,
}: {
  question: QuestionDto;
  values: string[];
  onChange: (ids: string[]) => void;
}) {
  const voteOpts = question.options.filter((o) => o.category === "vote");
  const confOpts = question.options.filter((o) => o.category === "confidence");

  const selectedVote = values.find((id) => voteOpts.some((o) => o.id === id)) ?? "";
  const selectedConf = values.find((id) => confOpts.some((o) => o.id === id)) ?? "";

  function pickVote(id: string) {
    const others = values.filter((v) => !voteOpts.some((o) => o.id === v));
    onChange([...others, id]);
  }
  function pickConf(id: string) {
    const others = values.filter((v) => !confOpts.some((o) => o.id === v));
    onChange([...others, id]);
  }

  function radioBtn(
    opt: { id: string; label: string },
    selected: boolean,
    pick: (id: string) => void,
    accent: string
  ) {
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => pick(opt.id)}
        className={[
          "w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium border transition",
          selected
            ? `border-${accent}-500 bg-${accent}-600/20 text-white`
            : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white",
        ].join(" ")}
      >
        <span className="inline-block w-5 text-center mr-2">
          {selected ? "●" : "○"}
        </span>
        {opt.label}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vote group */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your verdict
        </p>
        <div className="space-y-2">
          {voteOpts.map((opt) =>
            radioBtn(opt, selectedVote === opt.id, pickVote, "blue")
          )}
        </div>
      </div>

      {/* Confidence group */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          How confident are you?
        </p>
        <div className="space-y-2">
          {confOpts.map((opt) =>
            radioBtn(opt, selectedConf === opt.id, pickConf, "purple")
          )}
        </div>
      </div>
    </div>
  );
}

/** Allocation (100 coins / chips) */
function AllocationInput({
  question,
  allocation,
  onChange,
}: {
  question: QuestionDto;
  allocation: Record<string, number>;
  onChange: (alloc: Record<string, number>) => void;
}) {
  const total = Object.values(allocation).reduce((s, n) => s + n, 0);
  const remaining = 100 - total;

  const rows = question.options.filter((o) => o.category !== "column");

  function set(id: string, val: number) {
    const newAlloc = { ...allocation, [id]: val };
    onChange(newAlloc);
  }

  return (
    <div>
      <div
        className={[
          "flex items-center justify-between mb-4 px-4 py-2 rounded-xl text-sm font-semibold",
          remaining < 0
            ? "bg-red-900/40 text-red-300"
            : remaining === 0
            ? "bg-green-900/40 text-green-300"
            : "bg-gray-800 text-gray-300",
        ].join(" ")}
      >
        <span>Remaining coins</span>
        <span className="text-xl font-extrabold">{remaining}</span>
      </div>
      <div className="space-y-3">
        {rows.map((opt) => {
          const val = allocation[opt.id] ?? 0;
          return (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300 truncate max-w-[75%]">
                  {opt.label}
                </span>
                <span className="text-sm font-bold text-blue-300 ml-2">{val}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={val}
                onChange={(e) => {
                  const desired = parseInt(e.target.value, 10);
                  const otherTotal = total - val;
                  const clamped = Math.min(desired, 100 - otherTotal);
                  set(opt.id, clamped);
                }}
                className="w-full h-2 accent-blue-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Matrix question — rows × columns (mobile-friendly: one row per card) */
function MatrixInput({
  question,
  selections,
  onChange,
}: {
  question: QuestionDto;
  selections: Record<string, string>;
  onChange: (sel: Record<string, string>) => void;
}) {
  const rows = question.options.filter((o) => o.category === "row");
  const cols = question.options.filter((o) => o.category === "column");

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.id} className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
          <p className="text-sm text-gray-300 mb-2 font-medium">{row.label}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {cols.map((col) => {
              const selected = selections[row.id] === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() =>
                    onChange({ ...selections, [row.id]: col.id })
                  }
                  className={[
                    "text-left rounded-lg px-3 py-2 text-xs font-medium border transition",
                    selected
                      ? "border-blue-500 bg-blue-600/20 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-white",
                  ].join(" ")}
                >
                  {selected ? "✓ " : "○ "}
                  {col.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Free text */
function FreeTextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type your answer here…"
      maxLength={500}
      rows={5}
      className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 resize-none"
    />
  );
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validatePayload(q: QuestionDto, payload: ResponsePayload): string | null {
  if (q.questionType === "single_choice") {
    if (!payload.selectedOptionIds?.length) return "Please select an option.";
  }
  if (q.questionType === "multi_select") {
    const isMythVote = q.options.some((o) => o.category === "vote");
    if (isMythVote) {
      const voteOpts = q.options.filter((o) => o.category === "vote");
      const confOpts = q.options.filter((o) => o.category === "confidence");
      const ids = payload.selectedOptionIds ?? [];
      const hasVote = ids.some((id) => voteOpts.some((o) => o.id === id));
      const hasConf = ids.some((id) => confOpts.some((o) => o.id === id));
      if (!hasVote) return "Please select your verdict (True / False / Depends / I don't know).";
      if (!hasConf) return "Please select your confidence level.";
    } else {
      if (!payload.selectedOptionIds?.length) return "Please select at least one option.";
    }
  }
  if (q.questionType === "allocation") {
    const total = Object.values(payload.allocation ?? {}).reduce((s, n) => s + n, 0);
    if (total !== 100) return `Total must equal 100 (currently ${total}).`;
  }
  if (q.questionType === "matrix") {
    const rows = q.options.filter((o) => o.category === "row");
    const sel = payload.matrixSelections ?? {};
    const unanswered = rows.filter((r) => !sel[r.id]).length;
    if (unanswered > 0) return `Please answer all rows (${unanswered} remaining).`;
  }
  if (q.questionType === "free_text") {
    if (!payload.freeText?.trim()) return "Please write your answer.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ParticipantWaiting({ sessionId, participantId }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<GameSessionDto | null>(null);
  const [participant, setParticipant] = useState<ParticipantDto | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connecting");
  const [activeQuestion, setActiveQuestion] = useState<QuestionDto | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [initError, setInitError] = useState("");

  // Answer state
  const [singleChoice, setSingleChoice] = useState<string>("");
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const [matrixSel, setMatrixSel] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");

  const esRef = useRef<EventSource | null>(null);

  // submitted question IDs stored in localStorage to prevent re-submission
  const hasSubmitted = useCallback(
    (qid: string): boolean => {
      try {
        const raw = localStorage.getItem(`${LS_SUBMITTED_KEY_PREFIX}${sessionId}`);
        const ids = JSON.parse(raw ?? "[]") as string[];
        return ids.includes(qid);
      } catch {
        return false;
      }
    },
    [sessionId]
  );

  function markSubmitted(qid: string) {
    try {
      const raw = localStorage.getItem(`${LS_SUBMITTED_KEY_PREFIX}${sessionId}`);
      const ids: string[] = JSON.parse(raw ?? "[]");
      if (!ids.includes(qid)) {
        localStorage.setItem(
          `${LS_SUBMITTED_KEY_PREFIX}${sessionId}`,
          JSON.stringify([...ids, qid])
        );
      }
    } catch {
      // ignore
    }
  }

  // Load a question by ID and reset answer state
  const loadQuestion = useCallback(
    async (qid: string | null) => {
      if (!qid) {
        setActiveQuestion(null);
        return;
      }
      // If already submitted, don't show the question
      if (hasSubmitted(qid)) {
        setActiveQuestion(null);
        setSubmitStatus("submitted");
        return;
      }
      try {
        const res = await fetch(`/api/questions/${qid}`);
        if (res.ok) {
          const q: QuestionDto = await res.json();
          setActiveQuestion(q);
          setSubmitStatus("idle");
          setSubmitError("");
          setSingleChoice("");
          setMultiSelect([]);
          setAllocation({});
          setMatrixSel({});
          setFreeText("");
        } else {
          setActiveQuestion(null);
        }
      } catch {
        setActiveQuestion(null);
      }
    },
    [sessionId, hasSubmitted]
  );

  // Fetch session + participant profile
  useEffect(() => {
    if (!sessionId || !participantId) {
      setInitError("Missing session or participant information.");
      return;
    }
    async function loadData() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ existingParticipantId: participantId }),
          }),
        ]);
        if (sRes.ok) {
          const s: GameSessionDto = await sRes.json();
          setSession(s);
          if (s.activeQuestionId) {
            loadQuestion(s.activeQuestionId);
          }
        }
        if (pRes.ok) {
          setParticipant(await pRes.json());
        } else {
          // Try to read from localStorage anyway
          const stored = localStorage.getItem(LS_PARTICIPANT_KEY);
          if (!stored) setInitError("Could not load your profile. Try rejoining.");
        }
      } catch {
        setInitError("Could not connect to the server.");
      }
    }
    loadData();
  }, [sessionId, participantId, loadQuestion]);

  // SSE subscription
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`/api/events?sessionId=${sessionId}`);
    esRef.current = es;
    es.onopen = () => setConnStatus("connected");
    es.onerror = () => setConnStatus("disconnected");
    es.onmessage = (e) => {
      try {
        const event: GameEvent = JSON.parse(e.data as string);
        if (event.type === "question:activated") {
          const p = event.payload as { questionId: string | null };
          setSession((prev) =>
            prev ? { ...prev, activeQuestionId: p.questionId } : prev
          );
          loadQuestion(p.questionId);
        }
        if (event.type === "question:locked") {
          setActiveQuestion((prev) =>
            prev ? { ...prev, isLocked: true } : prev
          );
        }
        if (event.type === "session:updated") {
          const p = event.payload as { status?: string };
          setSession((prev) =>
            prev && p.status
              ? { ...prev, status: p.status as GameSessionDto["status"] }
              : prev
          );
        }
        if (event.type === "game:completed") {
          router.push(`/report?sessionId=${sessionId}`);
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [sessionId, router, loadQuestion]);

  // Submit answer
  async function handleSubmit() {
    if (!activeQuestion) return;
    let payload: ResponsePayload = {};
    if (activeQuestion.questionType === "single_choice") {
      payload = { selectedOptionIds: singleChoice ? [singleChoice] : [] };
    } else if (activeQuestion.questionType === "multi_select") {
      payload = { selectedOptionIds: multiSelect };
    } else if (activeQuestion.questionType === "allocation") {
      payload = { allocation };
    } else if (activeQuestion.questionType === "matrix") {
      payload = { matrixSelections: matrixSel };
    } else if (activeQuestion.questionType === "free_text") {
      payload = { freeText };
    }

    const validationError = validatePayload(activeQuestion, payload);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitStatus("submitting");
    setSubmitError("");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantId,
          questionId: activeQuestion.id,
          payload,
        }),
      });
      if (res.ok || res.status === 409) {
        // 409 = locked or already answered — both cases count as submitted
        markSubmitted(activeQuestion.id);
        setSubmitStatus("submitted");
        setActiveQuestion(null);
      } else {
        const d = await res.json();
        setSubmitError(d.error ?? "Submission failed. Please try again.");
        setSubmitStatus("error");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitStatus("error");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-red-400 text-sm mb-4">{initError}</p>
          <a href="/join" className="text-blue-400 underline text-sm">
            Return to Join page
          </a>
        </div>
      </div>
    );
  }

  // Active question view
  if (activeQuestion && !activeQuestion.isLocked) {
    const roundLabel =
      activeQuestion.roundId === "stock_market"
        ? "🏦 AI Adoption Stock Market"
        : activeQuestion.roundId === "risk_casino"
        ? "🎰 AI Risk Casino"
        : activeQuestion.roundId === "mythbusters"
        ? "💡 AI MythBusters"
        : activeQuestion.roundId;

    return (
      <div className="flex flex-col items-start flex-1 p-4 pt-6 gap-4 max-w-lg mx-auto w-full">
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-1">{roundLabel}</p>
          <h2 className="text-xl font-bold text-white leading-snug">
            {activeQuestion.title}
          </h2>
          <p className="text-sm text-gray-400 mt-1">{activeQuestion.prompt}</p>
        </div>

        <div className="w-full">
          {activeQuestion.questionType === "single_choice" && (
            <SingleChoiceInput
              question={activeQuestion}
              value={singleChoice}
              onChange={setSingleChoice}
            />
          )}
          {activeQuestion.questionType === "multi_select" && (
            <MultiSelectInput
              question={activeQuestion}
              values={multiSelect}
              onChange={setMultiSelect}
            />
          )}
          {activeQuestion.questionType === "allocation" && (
            <AllocationInput
              question={activeQuestion}
              allocation={allocation}
              onChange={setAllocation}
            />
          )}
          {activeQuestion.questionType === "matrix" && (
            <MatrixInput
              question={activeQuestion}
              selections={matrixSel}
              onChange={setMatrixSel}
            />
          )}
          {activeQuestion.questionType === "free_text" && (
            <FreeTextInput value={freeText} onChange={setFreeText} />
          )}
        </div>

        {submitError && (
          <p className="text-red-400 text-xs w-full">{submitError}</p>
        )}

        <PrimaryButton
          onClick={handleSubmit}
          disabled={submitStatus === "submitting"}
          className="w-full"
          size="lg"
        >
          {submitStatus === "submitting" ? "Submitting…" : "Submit Answer →"}
        </PrimaryButton>

        <p className="text-xs text-gray-700 text-center w-full">
          🔒 This activity collects anonymous meeting responses for AI adoption
          analysis. Do not enter confidential project names, customer data, source
          code, or personal data.
        </p>

        {/* Connection */}
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span
            className={[
              "w-1.5 h-1.5 rounded-full",
              connStatus === "connected" ? "bg-green-400" : "bg-yellow-400",
            ].join(" ")}
          />
          {connStatus === "connected" ? "Live" : "Reconnecting…"}
        </div>
      </div>
    );
  }

  // Waiting / submitted view
  const isGameActive = session?.status === "active";

  return (
    <div className="flex flex-col items-center justify-start flex-1 p-6 pt-10 gap-5 max-w-lg mx-auto w-full">
      {/* Hero message */}
      <div className="text-center">
        <div className="text-5xl mb-3">
          {submitStatus === "submitted" ? "✅" : isGameActive ? "⏳" : "✅"}
        </div>
        <h1 className="text-2xl font-bold mb-1">
          {submitStatus === "submitted"
            ? "Answer submitted!"
            : "You are in."}
        </h1>
        <p className="text-gray-400 text-sm">
          {submitStatus === "submitted"
            ? "Waiting for the next question."
            : isGameActive
            ? "The game is live. Waiting for the next AI Arena question."
            : "Waiting for the game to start."}
        </p>
      </div>

      {/* Session info */}
      {session && (
        <Panel className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">
                Session
              </p>
              <p className="text-sm font-semibold text-gray-200">{session.title}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{session.code}</p>
            </div>
            <span
              className={[
                "text-xs font-semibold px-2.5 py-1 rounded-full",
                session.status === "active"
                  ? "bg-green-800/50 text-green-300"
                  : session.status === "completed"
                  ? "bg-gray-700 text-gray-400"
                  : "bg-yellow-800/40 text-yellow-300",
              ].join(" ")}
            >
              {session.status}
            </span>
          </div>
        </Panel>
      )}

      {/* Profile summary */}
      {participant && (
        <Panel title="Your Profile" className="w-full">
          <dl className="space-y-2">
            {(
              [
                ["Area", participant.engineeringArea],
                ["Experience", participant.experienceLevel],
                ["AI Usage", participant.aiUsageLevel],
                ["Attitude", participant.aiAttitude],
                ...(participant.teamAlias
                  ? [["Team", participant.teamAlias]]
                  : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4"
              >
                <dt className="text-xs text-gray-500 font-semibold uppercase tracking-wide shrink-0 pt-0.5">
                  {label}
                </dt>
                <dd className="text-sm text-gray-200 text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span
          className={[
            "w-2 h-2 rounded-full",
            connStatus === "connected"
              ? "bg-green-400 animate-pulse"
              : connStatus === "connecting"
              ? "bg-yellow-400 animate-pulse"
              : "bg-red-500",
          ].join(" ")}
        />
        {connStatus === "connected"
          ? "Connected — updates arrive automatically"
          : connStatus === "connecting"
          ? "Connecting…"
          : "Connection lost — please reload"}
      </div>
    </div>
  );
}
