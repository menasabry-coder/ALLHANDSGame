import AppShell from "@/components/AppShell";
import Panel from "@/components/Panel";

export default function JoinPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1">Join a Session</h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter your meeting code to participate.
          </p>

          <Panel>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">
                  Meeting Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ARENA-2026"
                  className="w-full rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
              <button
                disabled
                className="w-full rounded-xl bg-blue-600 opacity-50 cursor-not-allowed text-white font-semibold py-2.5 text-sm"
              >
                Join
              </button>
            </div>
          </Panel>

          <p className="mt-6 text-center text-xs text-gray-500">
            ℹ️ Registration will be implemented in Phase 3.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
