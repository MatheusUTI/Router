import { supabase, isSupabaseConfigured } from '../../supabase';

let lastHealthStatus = false;
let lastHealthCheckTime = 0;
const HEALTH_CACHE_MS = 30000; // 30 seconds

export const checkSupabaseHealth = async (): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) return false;

  const now = Date.now();
  if (now - lastHealthCheckTime < HEALTH_CACHE_MS) {
    return lastHealthStatus;
  }

  try {
    // A very lightweight and fast query to test actual connectivity
    // Using an arbitrary table or a known empty result to minimize payload
    // A common technique is to query 1 row from a small/important table, 
    // or just invoke an edge function/rpc if available. We will use a limit(1) on vehicles.
    const { error } = await supabase.from('vehicles').select('id').limit(1).abortSignal(AbortSignal.timeout(3000));
    
    // As long as there's no network/fetch error, we assume it's up.
    // If it returns a PostgREST error (e.g., table not found), the connection is still alive.
    // However, if the error is a fetch failure, we catch it.
    if (error && error.code === 'FETCH_ERROR') {
      throw new Error('Fetch failed');
    }
    
    lastHealthStatus = true;
  } catch (err) {
    console.warn('[Supabase Health Check] Failed:', err);
    lastHealthStatus = false;
  } finally {
    lastHealthCheckTime = Date.now();
  }

  return lastHealthStatus;
};

export const getSupabaseClient = () => {
  return {
    client: supabase,
    isOnline: isSupabaseConfigured && supabase !== null
  };
};
