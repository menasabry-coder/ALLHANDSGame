import React from "react";
import Link from "next/link";
import { GAME_NAME } from "@/config/gameConfig";

interface AppShellProps {
  children: React.ReactNode;
  /** Hide the top navigation bar (e.g. for full-screen presenter view) */
  hideNav?: boolean;
}

export default function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {!hideNav && (
        <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
          <Link
            href="/"
            className="text-sm font-bold tracking-wide text-gray-200 hover:text-white transition"
          >
            {GAME_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/join" className="hover:text-white transition">
              Join
            </Link>
            <Link href="/presenter" className="hover:text-white transition">
              Presenter
            </Link>
            <Link href="/admin" className="hover:text-white transition">
              Admin
            </Link>
          </nav>
        </header>
      )}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
