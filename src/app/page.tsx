import Link from "next/link";
import AppShell from "@/components/AppShell";
import PrimaryButton from "@/components/PrimaryButton";
import { GAME_NAME, GAME_SUBTITLE, ROUNDS } from "@/config/gameConfig";

export default function HomePage() {
  return (
    <AppShell hideNav>
      <div className="flex flex-col items-center justify-center flex-1 p-8 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Hero */}
        <div className="text-center mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-3">
            Automotive Engineering · AI Readiness
          </p>
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {GAME_NAME}
          </h1>
          <p className="mt-3 text-2xl font-semibold text-gray-300">
            {GAME_SUBTITLE}
          </p>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto leading-relaxed">
            An interactive department session exploring AI adoption, risk, and
            responsible engineering. Three rounds. Real-time sentiment. Zero
            wrong answers.
          </p>
        </div>

        {/* Role entry points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl mb-14">
          <Link href="/join" className="block">
            <div className="rounded-2xl bg-teal-900/30 border border-teal-700/40 p-6 text-center hover:bg-teal-900/50 transition cursor-pointer h-full">
              <p className="text-3xl mb-2">📱</p>
              <p className="font-bold text-teal-200">Participant</p>
              <p className="text-xs text-teal-500 mt-1">Join via mobile</p>
            </div>
          </Link>

          <Link href="/presenter" className="block">
            <div className="rounded-2xl bg-blue-900/30 border border-blue-700/40 p-6 text-center hover:bg-blue-900/50 transition cursor-pointer h-full">
              <p className="text-3xl mb-2">📽️</p>
              <p className="font-bold text-blue-200">Presenter</p>
              <p className="text-xs text-blue-500 mt-1">Projector dashboard</p>
            </div>
          </Link>

          <Link href="/admin" className="block">
            <div className="rounded-2xl bg-purple-900/30 border border-purple-700/40 p-6 text-center hover:bg-purple-900/50 transition cursor-pointer h-full">
              <p className="text-3xl mb-2">⚙️</p>
              <p className="font-bold text-purple-200">Admin</p>
              <p className="text-xs text-purple-500 mt-1">Control panel</p>
            </div>
          </Link>
        </div>

        {/* Game rounds overview */}
        <div className="w-full max-w-xl">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold text-center mb-4">
            Three Rounds
          </p>
          <div className="space-y-2">
            {ROUNDS.map((round) => (
              <div
                key={round.id}
                className="flex items-center gap-4 rounded-xl bg-gray-800/40 border border-gray-700/30 px-5 py-3"
              >
                <span className="text-lg font-extrabold text-gray-600">
                  {round.order}
                </span>
                <span className="text-sm font-medium text-gray-300">
                  {round.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/report">
            <PrimaryButton variant="secondary" size="sm">
              View Report
            </PrimaryButton>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
