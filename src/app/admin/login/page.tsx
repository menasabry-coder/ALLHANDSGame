"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";
import PrimaryButton from "@/components/PrimaryButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get("next") || "/admin";
    setNextPath(candidate.startsWith("/") ? candidate : "/admin");
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell hideNav>
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full max-w-sm">
          <Panel title="Admin Login" subtitle="Enter admin password to continue">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                autoFocus
              />
              {error ? <p className="text-red-400 text-xs">{error}</p> : null}
              <PrimaryButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking…" : "Unlock Admin"}
              </PrimaryButton>
            </form>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
