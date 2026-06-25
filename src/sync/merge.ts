import type { Json } from '../lib/supabase/types';
import type { SyncDocument } from './types';

export function mergeDocuments(localDocuments: SyncDocument[], cloudDocuments: SyncDocument[]) {
  const byNamespace = new Map<string, SyncDocument>();
  [...cloudDocuments, ...localDocuments].forEach((document) => {
    const existing = byNamespace.get(document.namespace);
    if (!existing) {
      byNamespace.set(document.namespace, document);
      return;
    }

    byNamespace.set(document.namespace, {
      ...document,
      revision: Math.max(existing.revision, document.revision) + 1,
      updatedAt: new Date().toISOString(),
      payload: mergePayload(existing.payload, document.payload),
    });
  });
  return Array.from(byNamespace.values());
}

function mergePayload(left: unknown, right: unknown): Json {
  if (isPlainRecord(left) && isPlainRecord(right)) return { ...left, ...right } as Json;
  return (right ?? left ?? {}) as Json;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
