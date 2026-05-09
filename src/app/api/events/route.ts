/**
 * GET /api/events
 *
 * Server-Sent Events (SSE) endpoint.
 * Clients subscribe here to receive real-time game events without polling.
 *
 * Protocol: each message is a JSON-encoded `GameEvent` preceded by "data: ".
 *
 * Usage (browser):
 *   const es = new EventSource('/api/events?sessionId=xxx');
 *   es.onmessage = (e) => { const event = JSON.parse(e.data); ... };
 */

import { eventBus, gameEventChannel } from "@/lib/eventBus";
import type { GameEvent } from "@/types/game";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const channel = sessionId ? gameEventChannel(sessionId) : "game:event";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let listener: ((event: GameEvent) => void) | null = null;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (listener) {
          eventBus.off(channel, listener);
          listener = null;
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const safeEnqueue = (data: string): boolean => {
        if (closed) return false;
        const desired = controller.desiredSize;
        if (desired !== null && desired <= 0) {
          cleanup();
          return false;
        }
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      // Send a comment immediately to flush headers and confirm connection
      safeEnqueue(": connected\n\n");

      listener = (event: GameEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      };

      eventBus.on(channel, listener);

      // Send a heartbeat every 25 seconds to keep the connection alive through
      // proxies and load-balancers that close idle connections.
      heartbeat = setInterval(() => {
        safeEnqueue(": heartbeat\n\n");
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx: disable proxy buffering
    },
  });
}
