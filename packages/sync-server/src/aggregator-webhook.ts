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
  maxDocuments?: number;
  maxPayloadBytes?: number;
  maxTextChars?: number;
  onError?: (error: unknown) => void;
  secret?: string;
  url: string;
};

type WebhookContext = {
  collectionKey?: string;
  publicAccess?: string;
  userId?: string;
};

const DEFAULT_MAX_DOCUMENTS = 25;
const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_MAX_TEXT_CHARS = 2000;

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
      documentData: document,
      documentName: data.documentName,
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

function readContext(context: unknown): WebhookContext {
  if (
    typeof context !== 'object' ||
    context === null ||
    Array.isArray(context)
  ) {
    return {};
  }
  const record = context as Record<string, unknown>;
  const output: WebhookContext = {};
  if (typeof record.collectionKey === 'string') {
    output.collectionKey = record.collectionKey;
  }
  if (typeof record.publicAccess === 'string') {
    output.publicAccess = record.publicAccess;
  }
  if (typeof record.userId === 'string') {
    output.userId = record.userId;
  }
  return output;
}

function isPublicContext(context: WebhookContext): boolean {
  return context.publicAccess === 'read' || context.publicAccess === 'write';
}

function truncateText(
  value: unknown,
  maxTextChars: number
): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.length > maxTextChars
    ? `${value.slice(0, maxTextChars)}...`
    : value;
}

function summarizeDocument(
  value: unknown,
  maxTextChars: number
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const key of [
    '_deleted',
    '_id',
    '_updated',
    'aliases',
    'filename',
    'folderIds',
    'frontmatter',
    'sourcePath',
    'sourceVault',
    'tags',
    'title',
    'type',
  ]) {
    if (record[key] !== undefined) {
      summary[key] = record[key];
    }
  }

  const text = truncateText(record.text, maxTextChars);
  if (text !== undefined) {
    summary.text = text;
  }

  return summary;
}

function summarizeDocuments(params: {
  documentJson: Record<string, unknown>;
  maxDocuments: number;
  maxPayloadBytes: number;
  maxTextChars: number;
}): Record<string, unknown> {
  const documents =
    typeof params.documentJson.documents === 'object' &&
    params.documentJson.documents !== null &&
    !Array.isArray(params.documentJson.documents)
      ? (params.documentJson.documents as Record<string, unknown>)
      : params.documentJson;

  const summarizedEntries: [string, Record<string, unknown>][] = [];
  for (const [id, value] of Object.entries(documents).slice(
    0,
    params.maxDocuments
  )) {
    summarizedEntries.push([id, summarizeDocument(value, params.maxTextChars)]);
  }

  let maxEntries = summarizedEntries.length;
  let summarized = Object.fromEntries(summarizedEntries.slice(0, maxEntries));
  while (
    maxEntries > 0 &&
    Buffer.byteLength(JSON.stringify(summarized), 'utf8') >
      params.maxPayloadBytes
  ) {
    maxEntries -= 1;
    summarized = Object.fromEntries(summarizedEntries.slice(0, maxEntries));
  }

  return summarized;
}

export function createAggregatorWebhookExtension(
  options: AggregatorWebhookOptions
): Extension {
  const debounceMs = options.debounceMs ?? 1000;
  const maxDocuments = options.maxDocuments ?? DEFAULT_MAX_DOCUMENTS;
  const maxPayloadBytes = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  const maxTextChars = options.maxTextChars ?? DEFAULT_MAX_TEXT_CHARS;
  const pendingByDocument = new Map<string, NodeJS.Timeout>();
  const mirrorsByDocument = new Map<string, Y.Doc>();
  const latestJsonByDocument = new Map<string, Record<string, unknown>>();

  return {
    extensionName: 'AggregatorWebhook',
    async onChange(data) {
      const context = readContext(data.context);
      if (!context.collectionKey) {
        return;
      }

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
          const documentData = isPublicContext(context)
            ? summarizeDocuments({
                documentJson: document,
                maxDocuments,
                maxPayloadBytes,
                maxTextChars,
              })
            : {};
          void postAggregatorWebhook(
            {
              ...data,
              context,
            },
            documentData,
            options
          ).catch((error: unknown) => {
            options.onError?.(error);
          });
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
