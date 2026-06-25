import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncDocument, SyncResult } from './types';

export class CloudDataAdapter {
  constructor(private readonly client: SupabaseClient | null) {}

  async readDocuments(userId: string): Promise<SyncResult<SyncDocument[]>> {
    if (!this.client) return { error: 'Supabase 尚未配置。' };
    const { data, error } = await this.client
      .from('user_data_documents')
      .select('namespace,schema_version,revision,payload,updated_at')
      .eq('user_id', userId);
    if (error) return { error: error.message };
    return {
      data: ((data || []) as Array<{ namespace: SyncDocument['namespace']; schema_version: number; revision: number; payload: SyncDocument['payload']; updated_at: string }>).map((row) => ({
        namespace: row.namespace,
        schemaVersion: row.schema_version,
        revision: row.revision,
        payload: row.payload,
        updatedAt: row.updated_at,
      })),
    };
  }

  async upsertDocuments(userId: string, documents: SyncDocument[]): Promise<SyncResult> {
    if (!this.client) return { error: 'Supabase 尚未配置。' };
    const { error } = await this.client.from('user_data_documents').upsert(
      documents.map((document) => ({
        user_id: userId,
        namespace: document.namespace,
        schema_version: document.schemaVersion,
        revision: document.revision,
        payload: document.payload,
        updated_at: document.updatedAt,
      })),
      { onConflict: 'user_id,namespace' },
    );
    return error ? { error: error.message } : { data: true };
  }
}
