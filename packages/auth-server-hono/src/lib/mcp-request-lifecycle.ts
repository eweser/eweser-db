/**
 * Purpose: Release request-owned MCP resources after streaming ends or aborts.
 * Exports: createMcpRequestLifecycle.
 * Touches: Response streams, request cancellation, and MCP resource cleanup.
 * Read before editing: packages/auth-server-hono/src/INDEX.md and routes/mcp.ts.
 */
export function createMcpRequestLifecycle(
  signal: AbortSignal,
  cleanup: () => Promise<void>
): {
  dispose: () => Promise<void>;
  wrap: (response: Response) => Promise<Response>;
} {
  let disposal: Promise<void> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let ended = false;

  const dispose = () => {
    if (!disposal) {
      signal.removeEventListener('abort', onAbort);
      disposal = Promise.resolve().then(cleanup);
    }
    return disposal;
  };
  const onAbort = () => {
    if (!ended) {
      ended = true;
      controller?.error(signal.reason);
    }
    // Closing the transport also unblocks pending reads/tool calls. Neither
    // upstream cancellation nor resource release must wait for the other.
    void Promise.allSettled([reader?.cancel(signal.reason), dispose()]).then(
      () => {
        reader?.releaseLock();
      }
    );
  };
  signal.addEventListener('abort', onAbort, { once: true });
  if (signal.aborted) onAbort();

  return {
    dispose,
    async wrap(response) {
      signal.throwIfAborted();
      if (!response.body) {
        await dispose();
        return response;
      }
      const sourceReader = response.body.getReader();
      reader = sourceReader;
      const body = new ReadableStream<Uint8Array>(
        {
          start(value) {
            controller = value;
          },
          async pull(value) {
            try {
              const chunk = await sourceReader.read();
              if (ended) return;
              if (chunk.done) {
                ended = true;
                sourceReader.releaseLock();
                await dispose();
                value.close();
              } else {
                value.enqueue(chunk.value);
              }
            } catch (error) {
              if (ended) return;
              ended = true;
              sourceReader.releaseLock();
              await dispose();
              value.error(error);
            }
          },
          async cancel(reason) {
            ended = true;
            await Promise.allSettled([sourceReader.cancel(reason), dispose()]);
            sourceReader.releaseLock();
          },
        },
        // Do not drain the SSE response ahead of the client. Returning headers
        // or enqueuing the final chunk does not mean the body was consumed.
        { highWaterMark: 0 }
      );
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
  };
}
