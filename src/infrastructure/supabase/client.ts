import { supabase, isSupabaseConfigured } from '../../supabase';

export const getSupabaseClient = () => {
  return {
    client: supabase,
    isOnline: isSupabaseConfigured && supabase !== null
  };
};
