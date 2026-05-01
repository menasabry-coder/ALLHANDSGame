# Engineering Pulse Arena

A live, interactive polling and trivia game for engineering all-hands meetings. Built with **Next.js 16**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Admin Panel** (`/admin`) — Create sessions, add multiple-choice questions, activate questions live, and finish sessions.
- **Player View** (`/play/[sessionId]`) — Participants join via a session ID and vote on the active question in real time.
- **Live Dashboard** (`/dashboard/[sessionId]`) — A presentation-ready view that auto-refreshes every 2 seconds showing live vote tallies with animated bar charts.
- **In-memory store** — No database required for local development. Swap in Supabase for production (client helper included).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  lib/
    types.ts        — Domain types (Session, Question, Vote)
    store.ts        — In-memory data store
    supabase.ts     — Supabase client (optional)
  components/
    ResultsChart.tsx — Animated bar chart for vote results
    VoteButtons.tsx  — Multiple-choice vote buttons
  app/
    page.tsx         — Home page with session list & quick join
    admin/page.tsx   — Admin dashboard
    play/[sessionId]/page.tsx      — Player voting view
    dashboard/[sessionId]/page.tsx — Live results dashboard
    api/
      sessions/route.ts                          — GET/POST sessions
      sessions/[sessionId]/questions/route.ts    — GET/POST questions
      sessions/[sessionId]/questions/[questionId]/vote/route.ts — POST vote
      sessions/[sessionId]/activate/route.ts     — POST activate question
```
