/**
 * Purpose: Webhook transformer for EweserDB Yjs documents.
 * Exports: eweserWebhookTransformer.
 * Touches: Aggregator webhook payload shape.
 * Read before editing: packages/sync-server/INDEX.md and packages/aggregator/src/INDEX.md.
 */
type JsonSerializableYType = {
  toJSON: () => unknown;
};

type HocuspocusWebhookDocument = {
  getMap?: (name: string) => JsonSerializableYType;
  share?: Map<string, unknown>;
  toJSON?: () => unknown;
};

function hasJsonSerializer(value: unknown): value is JsonSerializableYType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toJSON' in value &&
    typeof value.toJSON === 'function'
  );
}

function hasDefinedJsonValues(json: Record<string, unknown>): boolean {
  return Object.values(json).every((value) => value !== undefined);
}

export function yDocSharedTypesToJson(
  document: HocuspocusWebhookDocument
): Record<string, unknown> {
  if (typeof document.toJSON === 'function') {
    const json = document.toJSON();
    if (
      typeof json === 'object' &&
      json !== null &&
      !Array.isArray(json) &&
      (Object.keys(json).length > 0 ||
        !document.share ||
        document.share.size === 0) &&
      hasDefinedJsonValues(json as Record<string, unknown>)
    ) {
      return json as Record<string, unknown>;
    }
  }

  if (!document.share) {
    return {};
  }

  if (
    document.share.has('documents') &&
    typeof document.getMap === 'function'
  ) {
    const documents = document.getMap('documents').toJSON();
    if (
      documents !== undefined &&
      typeof documents === 'object' &&
      documents !== null &&
      Object.keys(documents).length > 0
    ) {
      return { documents };
    }
  }

  const json: Record<string, unknown> = {};

  for (const [fieldName, sharedType] of document.share.entries()) {
    if (hasJsonSerializer(sharedType)) {
      const serialized = sharedType.toJSON();
      if (serialized !== undefined) {
        json[fieldName] = serialized;
        continue;
      }
    }

    if (typeof document.getMap === 'function') {
      const serialized = document.getMap(fieldName).toJSON();
      if (serialized !== undefined) {
        json[fieldName] = serialized;
      }
    }
  }

  return json;
}

export const eweserWebhookTransformer = {
  fromYdoc: yDocSharedTypesToJson,
  toYdoc(): never {
    throw new Error('EweserDB webhook transformer is one-way.');
  },
};
