/**
 * Purpose: Hocuspocus onChange extension that forwards EweserDB rooms to the aggregator.
 * Exports: createAggregatorWebhookExtension.
 * Touches: Public search indexing webhook payloads.
 * Read before editing: packages/sync-server/INDEX.md and packages/aggregator/src/INDEX.md.
 */
import { createHmac } from 'node:crypto';
import type { Extension, onChangePayload } from '@hocuspocus/server';
import * as Y from 'yjs';
import { yDocSharedTypesToJson } from './webhook-transformer.js';

type AggregatorWebhookOptions = {
  debounceMs?: number;
  onError?: (error: unknown) => void;
  secret?: string;
  url: string;
};

function createSignature(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function isEmptyDocumentsOnlyJson(json: Record<string, unknown>): boolean {
  return (
    Object.keys(json).length === 1 &&
    typeof json.documents === 'object' &&
    json.documents !== null &&
    !Array.isArray(json.documents) &&
    Object.keys(json.documents).length === 0
  );
}

function serializeYDocument(document: Y.Doc): Record<string, unknown> {
  const documents = document.getMap('documents').toJSON();
  if (Object.keys(documents).length > 0) {
    return { documents };
  }

  const json = yDocSharedTypesToJson(document);
  if (isEmptyDocumentsOnlyJson(json)) {
    return {};
  }

  if (Object.keys(json).length > 0) {
    return json;
  }

  return json;
}

async function postAggregatorWebhook(
  data: onChangePayload,
  document: Record<string, unknown>,
  options: AggregatorWebhookOptions
) {
  const body = JSON.stringify({
    event: 'change',
    payload: {
      context: data.context,
      document,
      documentName: data.documentName,
      requestHeaders: data.requestHeaders,
      requestParameters: Object.fromEntries(data.requestParameters.entries()),
    },
  });
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (options.secret) {
    headers['x-hocuspocus-signature-256'] = createSignature(
      body,
      options.secret
    );
  }

  const response = await fetch(options.url, {
    body,
    headers,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Aggregator webhook failed with HTTP ${response.status}`);
  }
}

export function createAggregatorWebhookExtension(
  options: AggregatorWebhookOptions
): Extension {
  const debounceMs = options.debounceMs ?? 1000;
  const pendingByDocument = new Map<string, NodeJS.Timeout>();
  const mirrorsByDocument = new Map<string, Y.Doc>();
  const latestJsonByDocument = new Map<string, Record<string, unknown>>();

  return {
    extensionName: 'AggregatorWebhook',
    async onChange(data) {
      let mirror = mirrorsByDocument.get(data.documentName);
      if (!mirror) {
        mirror = new Y.Doc();
        mirrorsByDocument.set(data.documentName, mirror);
      }

      let documentJson = serializeYDocument(data.document);
      try {
        Y.applyUpdate(mirror, data.update);
      } catch (error) {
        options.onError?.(error);
        return;
      }

      if (Object.keys(documentJson).length === 0) {
        documentJson = serializeYDocument(mirror);
      }

      latestJsonByDocument.set(data.documentName, documentJson);

      const existing = pendingByDocument.get(data.documentName);
      if (existing) clearTimeout(existing);

      pendingByDocument.set(
        data.documentName,
        setTimeout(() => {
          pendingByDocument.delete(data.documentName);
          const document =
            latestJsonByDocument.get(data.documentName) ??
            yDocSharedTypesToJson(data.document);
          void postAggregatorWebhook(data, document, options).catch(
            (error: unknown) => {
              options.onError?.(error);
            }
          );
        }, debounceMs)
      );
    },
    async afterUnloadDocument({ documentName }) {
      const pending = pendingByDocument.get(documentName);
      if (pending) clearTimeout(pending);
      pendingByDocument.delete(documentName);
      mirrorsByDocument.get(documentName)?.destroy();
      mirrorsByDocument.delete(documentName);
      latestJsonByDocument.delete(documentName);
    },
  };
}
