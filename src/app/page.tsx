"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Session } from "@/lib/types";

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Engineering Pulse Arena
        </h1>
        <p className="mt-3 text-gray-400 text-lg max-w-md mx-auto">
          Real-time polling &amp; trivia for your All-Hands meetings
        </p>
      </div>

      {/* Quick Join */}
      <div className="w-full max-w-sm mb-10">
        <label className="block text-sm text-gray-400 mb-1">
          Join a session by ID
        </label>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Paste session ID..."
            className="flex-1 rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <Link
            href={joinCode ? `/play/${joinCode}` : "#"}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              joinCode
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Join
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 mb-10">
        <Link
          href="/admin"
          className="rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-3 font-semibold transition"
        >
          Admin Panel
        </Link>
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <section className="w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4">Recent Sessions</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.id}</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.status === "active"
                        ? "bg-green-900 text-green-300"
                        : s.status === "finished"
                          ? "bg-gray-700 text-gray-400"
                          : "bg-yellow-900 text-yellow-300"
                    }`}
                  >
                    {s.status}
                  </span>
                  <Link
                    href={`/dashboard/${s.id}`}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Dashboard
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
