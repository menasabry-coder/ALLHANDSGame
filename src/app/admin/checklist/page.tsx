"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";

type CheckStatus = "pass" | "warn" | "fail";

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  details: string;
}

interface ChecklistResponse {
  summary: CheckStatus;
  generatedAt: string;
  checks: CheckItem[];
}

const statusClasses: Record<CheckStatus, string> = {
  pass: "bg-green-900/20 border-green-700/40 text-green-300",
  warn: "bg-yellow-900/20 border-yellow-700/40 text-yellow-300",
  fail: "bg-red-900/20 border-red-700/40 text-red-300",
};

const summaryLabel: Record<CheckStatus, string> = {
  pass: "Ready",
  warn: "Needs Attention",
  fail: "Blocked",
};

export default function ChecklistPage() {
  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/checklist", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to run checks");
      }
      const json = (await res.json()) as ChecklistResponse;
      setData(json);
    } catch {
      setError("Could not run automated checks. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Pre-Meeting Checklist</h1>
            <p className="text-gray-500 text-sm mt-1">
              Automated environment checks run for you.
            </p>
          </div>
          <a href="/admin" className="text-sm text-blue-400 hover:text-blue-300 underline">
            ← Back to Admin
          </a>
        </div>

        <Panel
          title="System Readiness"
          subtitle={
            data
              ? `${summaryLabel[data.summary]} · Last run ${new Date(data.generatedAt).toLocaleString()}`
              : "Running checks…"
          }
        >
          <div className="space-y-3">
            {data?.checks.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-4 py-3 ${statusClasses[item.status]}`}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs mt-1 opacity-90">{item.details}</p>
              </div>
            ))}
          </div>

          {error ? <p className="text-red-400 text-xs mt-4">{error}</p> : null}

          <div className="mt-5">
            <PrimaryButton size="sm" onClick={runChecks} disabled={loading}>
              {loading ? "Running checks…" : "Run Checks Again"}
            </PrimaryButton>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
