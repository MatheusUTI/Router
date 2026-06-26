import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl =
    ((import.meta as any).env)?.VITE_SUPABASE_URL ||
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    ((import.meta as any).env)?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase não configurado.');
  }

  supabaseInstance = createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );

  return supabaseInstance;
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabaseClient();

    const { error } = await client
      .from('app_users')
      .select('username')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}