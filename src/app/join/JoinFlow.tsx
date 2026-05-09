"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";

// ---------------------------------------------------------------------------
// Registration question definitions (Phase 3 spec)
// ---------------------------------------------------------------------------

const ENGINEERING_AREAS = [
  "Embedded software",
  "AUTOSAR / BSW / MCAL",
  "Application software",
  "Powertrain controls",
  "Diagnostics / UDS",
  "Cybersecurity",
  "Functional safety",
  "Testing / validation",
  "DevOps / CI/CD",
  "Tools / automation",
  "System engineering / requirements",
  "Calibration",
  "Architecture",
  "Project / technical leadership",
  "Other",
];

const EXPERIENCE_LEVELS = [
  "0–2 years",
  "3–5 years",
  "6–10 years",
  "11–15 years",
  "15+ years",
];

const AI_USAGE_LEVELS = [
  "I do not use AI tools",
  "I tried them once or twice",
  "I use AI occasionally",
  "I use AI weekly",
  "I use AI daily",
  "I already build AI-assisted workflows",
];

const AI_ATTITUDES = ["Excited", "Curious", "Neutral", "Careful", "Skeptical", "Concerned"];

const LS_KEY = "arena_participant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 0 | 1 | 2 | 3 | 4 | 5; // 0=code, 1–4=questions, 5=alias

interface FormState {
  code: string;
  sessionId: string;
  sessionTitle: string;
  engineeringArea: string;
  experienceLevel: string;
  aiUsageLevel: string;
  aiAttitude: string;
  teamAlias: string;
}

interface ExistingParticipantSession {
  sessionId: string;
  participantId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            "w-full text-left rounded-xl px-4 py-3 text-sm font-medium border transition",
            value === opt
              ? "border-blue-500 bg-blue-600/20 text-white"
              : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-500 hover:text-white",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-2 h-2 rounded-full transition",
            i < current
              ? "bg-blue-500"
              : i === current
              ? "bg-blue-400 ring-2 ring-blue-400/40"
              : "bg-gray-700",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function JoinFlow({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({
    code: initialCode.trim().toUpperCase(),
    sessionId: "",
    sessionTitle: "",
    engineeringArea: "",
    experienceLevel: "",
    aiUsageLevel: "",
    aiAttitude: "",
    teamAlias: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingSession, setExistingSession] =
    useState<ExistingParticipantSession | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // On mount: check localStorage for an existing participant session.
  // Do not auto-redirect; allow the user to intentionally switch sessions.
  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (!stored) {
        setCheckingExisting(false);
        return;
      }
      const { sessionId, participantId } = JSON.parse(stored) as {
        sessionId: string;
        participantId: string;
      };
      if (sessionId && participantId) {
        fetch(`/api/sessions/${sessionId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((s) => {
            if (cancelled) return;
            if (s) {
              setExistingSession({ sessionId, participantId });
            } else {
              localStorage.removeItem(LS_KEY);
            }
            setCheckingExisting(false);
          })
          .catch(() => {
            if (!cancelled) setCheckingExisting(false);
          });
      } else {
        setCheckingExisting(false);
      }
    } catch {
      setCheckingExisting(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function handleContinueExisting() {
    if (!existingSession) return;
    router.replace(
      `/participant?sessionId=${existingSession.sessionId}&participantId=${existingSession.participantId}`
    );
  }

  function handleJoinDifferentSession() {
    localStorage.removeItem(LS_KEY);
    setExistingSession(null);
  }

  // Step 0 — code lookup
  async function handleCodeNext() {
    if (!form.code.trim()) {
      setError("Please enter a meeting code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/sessions/by-code/${encodeURIComponent(form.code.trim())}`
      );
      if (!res.ok) {
        setError("Session not found. Check the code and try again.");
        return;
      }
      const session = await res.json();
      setForm((f) => ({
        ...f,
        sessionId: session.id,
        sessionTitle: session.title,
      }));
      setStep(1);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Final submission
  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${form.sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineeringArea: form.engineeringArea,
          experienceLevel: form.experienceLevel,
          aiUsageLevel: form.aiUsageLevel,
          aiAttitude: form.aiAttitude,
          teamAlias: form.teamAlias || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      const participant = await res.json();
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ sessionId: form.sessionId, participantId: participant.id })
      );
      router.push(
        `/participant?sessionId=${form.sessionId}&participantId=${participant.id}`
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const privacyNotice = (
    <p className="text-xs text-gray-600 mt-4 text-center leading-relaxed">
      🔒 This activity collects anonymous meeting responses for AI adoption
      analysis. Do not enter confidential project names, customer data, source
      code, or personal data.
    </p>
  );

  // Step 0: code entry
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full max-w-sm">
          {checkingExisting ? (
            <Panel className="mb-4">
              <p className="text-sm text-gray-400">Checking existing session…</p>
            </Panel>
          ) : null}

          {existingSession ? (
            <Panel className="mb-4">
              <p className="text-sm text-gray-300 mb-3">
                You already joined a session with this device.
              </p>
              <div className="flex gap-2">
                <PrimaryButton
                  size="sm"
                  className="flex-1"
                  onClick={handleContinueExisting}
                >
                  Resume
                </PrimaryButton>
                <PrimaryButton
                  size="sm"
                  className="flex-1"
                  variant="secondary"
                  onClick={handleJoinDifferentSession}
                >
                  Join Another
                </PrimaryButton>
              </div>
            </Panel>
          ) : null}

          <h1 className="text-2xl font-bold mb-1">Join AI Arena</h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter your meeting code to participate.
          </p>
          <Panel>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">
                  Meeting Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ARENA-2026"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleCodeNext()}
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600 font-mono tracking-widest"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}
              <PrimaryButton
                onClick={handleCodeNext}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Checking…" : "Continue →"}
              </PrimaryButton>
            </div>
          </Panel>
          {privacyNotice}
        </div>
      </div>
    );
  }

  // Steps 1–5: registration questions
  const TOTAL_Q_STEPS = 5;
  const qStep = step - 1; // 0-indexed question step

  return (
    <div className="flex flex-col items-center justify-start flex-1 p-6 pt-10">
      <div className="w-full max-w-sm">
        <StepDots current={qStep} total={TOTAL_Q_STEPS} />

        {/* Step 1 — Engineering Area */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-1">Engineering Area</h2>
            <p className="text-gray-400 text-sm mb-5">
              Which area best describes your current role?
            </p>
            <RadioGroup
              options={ENGINEERING_AREAS}
              value={form.engineeringArea}
              onChange={(v) => setForm((f) => ({ ...f, engineeringArea: v }))}
            />
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            <PrimaryButton
              onClick={() => {
                if (!form.engineeringArea) {
                  setError("Please select an option.");
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="w-full mt-5"
            >
              Next →
            </PrimaryButton>
          </>
        )}

        {/* Step 2 — Experience Level */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold mb-1">Experience Level</h2>
            <p className="text-gray-400 text-sm mb-5">
              Years of professional engineering experience?
            </p>
            <RadioGroup
              options={EXPERIENCE_LEVELS}
              value={form.experienceLevel}
              onChange={(v) => setForm((f) => ({ ...f, experienceLevel: v }))}
            />
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <PrimaryButton
                variant="secondary"
                onClick={() => { setError(""); setStep(1); }}
                className="flex-1"
              >
                ← Back
              </PrimaryButton>
              <PrimaryButton
                onClick={() => {
                  if (!form.experienceLevel) {
                    setError("Please select an option.");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                className="flex-1"
              >
                Next →
              </PrimaryButton>
            </div>
          </>
        )}

        {/* Step 3 — AI Usage */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-bold mb-1">AI Usage</h2>
            <p className="text-gray-400 text-sm mb-5">
              How often do you currently use AI tools at work?
            </p>
            <RadioGroup
              options={AI_USAGE_LEVELS}
              value={form.aiUsageLevel}
              onChange={(v) => setForm((f) => ({ ...f, aiUsageLevel: v }))}
            />
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <PrimaryButton
                variant="secondary"
                onClick={() => { setError(""); setStep(2); }}
                className="flex-1"
              >
                ← Back
              </PrimaryButton>
              <PrimaryButton
                onClick={() => {
                  if (!form.aiUsageLevel) {
                    setError("Please select an option.");
                    return;
                  }
                  setError("");
                  setStep(4);
                }}
                className="flex-1"
              >
                Next →
              </PrimaryButton>
            </div>
          </>
        )}

        {/* Step 4 — AI Attitude */}
        {step === 4 && (
          <>
            <h2 className="text-xl font-bold mb-1">AI Attitude</h2>
            <p className="text-gray-400 text-sm mb-5">
              How would you describe your current attitude toward AI?
            </p>
            <RadioGroup
              options={AI_ATTITUDES}
              value={form.aiAttitude}
              onChange={(v) => setForm((f) => ({ ...f, aiAttitude: v }))}
            />
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <PrimaryButton
                variant="secondary"
                onClick={() => { setError(""); setStep(3); }}
                className="flex-1"
              >
                ← Back
              </PrimaryButton>
              <PrimaryButton
                onClick={() => {
                  if (!form.aiAttitude) {
                    setError("Please select an option.");
                    return;
                  }
                  setError("");
                  setStep(5);
                }}
                className="flex-1"
              >
                Next →
              </PrimaryButton>
            </div>
          </>
        )}

        {/* Step 5 — Team Alias (optional) */}
        {step === 5 && (
          <>
            <h2 className="text-xl font-bold mb-1">Team Alias</h2>
            <p className="text-gray-400 text-sm mb-5">
              Optional: enter a team alias or table name.
            </p>
            <Panel>
              <input
                type="text"
                placeholder="e.g. Team Phoenix, Table 4"
                value={form.teamAlias}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teamAlias: e.target.value }))
                }
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                maxLength={40}
              />
            </Panel>
            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            <div className="flex gap-3 mt-5">
              <PrimaryButton
                variant="secondary"
                onClick={() => { setError(""); setStep(4); }}
                className="flex-1"
              >
                ← Back
              </PrimaryButton>
              <PrimaryButton
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Joining…" : "Join →"}
              </PrimaryButton>
            </div>
            {privacyNotice}
          </>
        )}
      </div>
    </div>
  );
}
