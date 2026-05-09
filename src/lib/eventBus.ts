import { EventEmitter } from "events";
import type { GameEvent, GameEventType } from "@/types/game";

/**
 * In-process event bus for Server-Sent Events (SSE) realtime delivery.
 *
 * The global cache pattern prevents duplicate instances during Next.js HMR.
 * All API routes that mutate game state should call `emitGameEvent()`.
 *
 * Connected clients subscribe via `GET /api/events`.
 */

const globalForEvents = global as typeof globalThis & {
  _eventBus?: EventEmitter;
};

const DEFAULT_MAX_SSE_LISTENERS = 1_000;

function parseMaxSseListeners(rawValue: string | undefined): number {
  if (!rawValue) return DEFAULT_MAX_SSE_LISTENERS;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_SSE_LISTENERS;
  }
  return parsed;
}

export function gameEventChannel(sessionId: string): string {
  return `game:event:${sessionId}`;
}

if (!globalForEvents._eventBus) {
  const bus = new EventEmitter();
  bus.setMaxListeners(
    parseMaxSseListeners(process.env.SSE_MAX_LISTENERS)
  );
  globalForEvents._eventBus = bus;
}

export const eventBus = globalForEvents._eventBus!;

/** Emit a typed game event to all connected SSE clients. */
export function emitGameEvent<T = unknown>(
  type: GameEventType,
  sessionId: string,
  payload: T
): void {
  const event: GameEvent<T> = {
    type,
    sessionId,
    payload,
    timestamp: new Date().toISOString(),
  };
  eventBus.emit(gameEventChannel(sessionId), event);
  eventBus.emit("game:event", event);
}
