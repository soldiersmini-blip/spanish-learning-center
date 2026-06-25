import type { SyncDocument } from './types';
import { getOwnedLocalStorageSnapshot } from './localDataRegistry';

export class LocalDataAdapter {
  readDocuments(): SyncDocument[] {
    const now = new Date().toISOString();
    const snapshot = getOwnedLocalStorageSnapshot();
    return [
      {
        namespace: 'settings',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pick(snapshot, ['spanish-locale', 'spanish-theme']),
      },
      {
        namespace: 'training_preferences',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pick(snapshot, ['spanish-learning-center:training-mode-preferences:v1']),
      },
      {
        namespace: 'learning_progress',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pickByPrefix(snapshot, ['spanish-progress-']),
      },
      {
        namespace: 'mistakes',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pickByPrefix(snapshot, ['spanish-vocab-training-wrong-']),
      },
      {
        namespace: 'test_history',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pickByPrefix(snapshot, ['spanish-vocab-test-records-']),
      },
      {
        namespace: 'neural_state',
        schemaVersion: 1,
        revision: 1,
        updatedAt: now,
        payload: pick(snapshot, ['spanish-neural-learning-progress']),
      },
    ];
  }

  writeDocuments(documents: SyncDocument[]) {
    documents.forEach((document) => {
      if (!document.payload || typeof document.payload !== 'object' || Array.isArray(document.payload)) return;
      Object.entries(document.payload).forEach(([key, value]) => {
        if (typeof value === 'string') localStorage.setItem(key, value);
      });
    });
  }
}

function pick(source: Record<string, string>, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

function pickByPrefix(source: Record<string, string>, prefixes: string[]) {
  return Object.fromEntries(Object.entries(source).filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix))));
}
