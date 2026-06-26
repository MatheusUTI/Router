import { getSupabaseClient } from '../client';

export interface ImportBatch {
  id: string;
  imported_at: string;
  imported_by: string;
  source_filename: string;
  total_rows: number;
  inserted_count: number;
  updated_count: number;
  rejected_count: number;
  notes?: string;
  created_at?: string;
}

export const importBatchSupabaseRepository = {
  async createBatch(batch: ImportBatch): Promise<{ success: boolean; error?: any }> {
    let client;
    try {
      client = getSupabaseClient();
    } catch {
      return { success: false, error: 'Supabase offline' };
    }

    try {
      const { error } = await client.from('import_batches').insert([batch]);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error creating import batch in Supabase:', err);
      return { success: false, error: err };
    }
  }
};
