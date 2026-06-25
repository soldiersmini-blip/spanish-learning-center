import type { Json, UserDataNamespace } from '../lib/supabase/types';

export type SyncDocument = {
  namespace: UserDataNamespace;
  schemaVersion: number;
  revision: number;
  payload: Json;
  updatedAt: string;
};

export type SyncResult<T = unknown> = {
  data?: T;
  error?: string;
};

export type MigrationChoice =
  | 'upload-local'
  | 'download-cloud'
  | 'merge'
  | 'keep-local'
  | 'keep-cloud'
  | 'export-both'
  | 'cancel';
