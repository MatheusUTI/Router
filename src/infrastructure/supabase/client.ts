import { createClient } from '@supabase/supabase-js';
import { systemLogService } from '../../services/systemLogService';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function normalizeSupabaseUrl(url: string): string {
  if (!url) return url;
  let normalized = url.trim();
  // Remove /rest/v1 and anything after it
  normalized = normalized.replace(/\/rest\/v1\/?$/, '');
  normalized = normalized.replace(/\/auth\/v1\/?$/, '');
  normalized = normalized.replace(/\/realtime\/v1\/?$/, '');
  normalized = normalized.replace(/\/$/, ''); // remover barra final
  return normalized;
}

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const rawUrl =
    ((import.meta as any).env)?.VITE_SUPABASE_URL ||
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);

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
  let url = 'desconhecida';
  let source = 'desconhecida';

  try {
    const rawUrlLocal = localStorage.getItem('supabase_custom_url');
    if (rawUrlLocal) {
      url = normalizeSupabaseUrl(rawUrlLocal);
      source = 'localStorage';
    } else {
      const rawUrlEnv = ((import.meta as any).env)?.VITE_SUPABASE_URL || ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_URL;
      if (rawUrlEnv) {
        url = normalizeSupabaseUrl(rawUrlEnv);
        source = 'env';
      }
    }
  } catch (e) {
    //
  }

  const maskedUrl = url.replace(/(https?:\/\/)([^.]+)(\..+)/, '$1***$3');

  try {
    const client = getSupabaseClient();

    const { error: errorUsers } = await client
      .from('app_users')
      .select('username')
      .limit(1);

    if (errorUsers) {
      if (errorUsers.code === 'PGRST125' || errorUsers.code === '42P01' || errorUsers.code === '42703' || errorUsers.message?.includes('schema cache')) {
        systemLogService.logWarn('Network', `Health Check (app_users): Erro de schema ou tabela. Rede ativa. URL: ${maskedUrl} | Source: ${source}`, errorUsers);
        return true;
      }
      
      // Attempt vehicles
      const { error: errorVehicles } = await client
        .from('vehicles')
        .select('id')
        .limit(1);

      if (errorVehicles) {
        if (errorVehicles.code === 'PGRST125' || errorVehicles.code === '42P01' || errorVehicles.code === '42703' || errorVehicles.message?.includes('schema cache')) {
          systemLogService.logWarn('Network', `Health Check (vehicles): Erro de schema ou tabela. Rede ativa. URL: ${maskedUrl} | Source: ${source}`, errorVehicles);
          return true;
        }

        systemLogService.logError('Network', `Health Check do Supabase falhou na tabela vehicles. Offline. URL: ${maskedUrl} | Source: ${source}`, errorVehicles);
        return false;
      }
    }
    
    return true;
  } catch (err: any) {
    // Determine if it is a fetch/network error
    if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
      systemLogService.logError('Network', `Erro de rede ou Fetch durante Health Check do Supabase. Offline. URL: ${maskedUrl} | Source: ${source}`, err);
      return false;
    }
    systemLogService.logWarn('Network', `Exceção não-crítica durante Health Check do Supabase. Assumindo online. URL: ${maskedUrl} | Source: ${source}`, err);
    return true; // assume active if not explicit network error
  }
}