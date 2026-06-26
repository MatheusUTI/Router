import { createClient } from '@supabase/supabase-js';
import { systemLogService } from '../../services/systemLogService';

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
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ((import.meta as any).env)?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    systemLogService.logError('Database', 'Credenciais do Supabase ausentes no momento da inicialização.');
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

  systemLogService.logSuccess('Database', 'Supabase Client inicializado com sucesso.');
  return supabaseInstance;
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const client = getSupabaseClient();

    const { error } = await client
      .from('app_users')
      .select('username')
      .limit(1);

    if (error) {
       systemLogService.logError('Network', 'Health Check do Supabase falhou.', error);
       return false;
    }
    
    return true;
  } catch (err: any) {
    systemLogService.logError('Network', 'Exceção durante Health Check do Supabase.', err);
    return false;
  }
}