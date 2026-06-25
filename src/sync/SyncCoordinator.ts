import { supabase } from '../lib/supabase/client';
import { CloudDataAdapter } from './CloudDataAdapter';
import { LocalDataAdapter } from './LocalDataAdapter';
import { mergeDocuments } from './merge';
import type { MigrationChoice, SyncResult } from './types';

export class SyncCoordinator {
  private readonly local = new LocalDataAdapter();
  private readonly cloud = new CloudDataAdapter(supabase);

  readLocalDocuments() {
    return this.local.readDocuments();
  }

  async readCloudDocuments(userId: string) {
    return this.cloud.readDocuments(userId);
  }

  async uploadLocal(userId: string): Promise<SyncResult> {
    return this.cloud.upsertDocuments(userId, this.local.readDocuments());
  }

  async downloadCloud(userId: string): Promise<SyncResult> {
    const cloud = await this.cloud.readDocuments(userId);
    if (cloud.error || !cloud.data) return cloud;
    this.local.writeDocuments(cloud.data);
    return { data: true };
  }

  async mergeLocalAndCloud(userId: string): Promise<SyncResult> {
    const cloud = await this.cloud.readDocuments(userId);
    if (cloud.error || !cloud.data) return cloud;
    const merged = mergeDocuments(this.local.readDocuments(), cloud.data);
    const uploaded = await this.cloud.upsertDocuments(userId, merged);
    if (uploaded.error) return uploaded;
    this.local.writeDocuments(merged);
    return { data: true };
  }

  async applyMigrationChoice(userId: string, choice: MigrationChoice): Promise<SyncResult> {
    if (choice === 'upload-local') return this.uploadLocal(userId);
    if (choice === 'download-cloud') return this.downloadCloud(userId);
    if (choice === 'merge') return this.mergeLocalAndCloud(userId);
    if (choice === 'cancel' || choice === 'export-both' || choice === 'keep-local' || choice === 'keep-cloud') return { data: true };
    return { error: '未知的数据迁移选择。' };
  }
}
