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

import { eventBus } from "@/lib/eventBus";
import type { GameEvent } from "@/types/game";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send a comment immediately to flush headers and confirm connection
      controller.enqueue(encoder.encode(": connected\n\n"));

      const listener = (event: GameEvent) => {
        // If a sessionId filter is provided, only forward events for that session
        if (sessionId && event.sessionId !== sessionId) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Client disconnected — will be cleaned up by the abort handler
        }
      };

      eventBus.on("game:event", listener);

      // Send a heartbeat every 25 seconds to keep the connection alive through
      // proxies and load-balancers that close idle connections.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        eventBus.off("game:event", listener);
        try {
          controller.close();
        } catch {
          // already closed
        }
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
