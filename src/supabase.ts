import { createClient } from '@supabase/supabase-js';
import { Vehicle, DriverScore, Ctrc, Ticket, CriticClient, AppUser, DeliveryOccurrence, CurvaAClient } from './types';
import { DEFAULT_OPERATIONAL_UNIT } from './constants/operationalUnits';

// Global configurations query hierarchy (Simplified)
export function getSavedCredentials(): { url: string; key: string; source: 'localStorage' | 'env' | 'none' } {
  // 1. Try local storage first
  const localUrl = localStorage.getItem('supabase_custom_url');
  const localKey = localStorage.getItem('supabase_custom_key');
  if (localUrl && localKey) {
    return { url: localUrl, key: localKey, source: 'localStorage' };
  }

  // 2. Try standard environment variables (Vite-supported)
  let envUrl = 
    ((import.meta as any).env)?.VITE_SUPABASE_URL || 
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_URL || 
    '';
  if (envUrl) {
    envUrl = envUrl.replace(/\/rest\/v1\/?$/, '').trim();
  }
  const envKey = 
    ((import.meta as any).env)?.VITE_SUPABASE_ANON_KEY || 
    ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    '';

  if (envUrl && envUrl !== 'https://your-supabase-project.supabase.co' && envKey && envKey !== 'your-supabase-anon-key') {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  return { url: '', key: '', source: 'none' };
}

// Active dynamic settings
const initialSettings = getSavedCredentials();
export const supabaseUrl = initialSettings.url;
export const supabaseAnonKey = initialSettings.key;
export let isSupabaseConfigured = initialSettings.source !== 'none';

// Live export initialized client references
export let supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Dynamic updater
export function updateActiveSupabaseClient(url: string, key: string): { success: boolean; source: string; url: string; key: string } {
  let cleanUrl = url.trim();
  if (cleanUrl) {
    cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '').trim();
  }
  const cleanKey = key.trim();

  if (cleanUrl && cleanKey) {
    localStorage.setItem('supabase_custom_url', cleanUrl);
    localStorage.setItem('supabase_custom_key', cleanKey);
    supabase = createClient(cleanUrl, cleanKey);
    isSupabaseConfigured = true;
    return { success: true, source: 'localStorage', url: cleanUrl, key: cleanKey };
  } else {
    // Clear custom settings
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_key');
    const defaultCred = getSavedCredentials();
    if (defaultCred.url && defaultCred.key) {
      supabase = createClient(defaultCred.url, defaultCred.key);
      isSupabaseConfigured = true;
    } else {
      supabase = null;
      isSupabaseConfigured = false;
    }
    return { success: true, source: defaultCred.source, url: defaultCred.url, key: defaultCred.key };
  }
}

// Helper to test if database credentials are responsive
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase não está configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' };
  }
  try {
    const { error } = await supabase.from('vehicles').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return { success: true, message: 'Conectado com sucesso! No entanto, as tabelas ainda não foram criadas. Execute o script SQL no console do Supabase.' };
      }
      return { success: false, message: `Erro de resposta: ${error.message} (Código ${error.code})` };
    }
    return { success: true, message: 'Conexão estabelecida com sucesso! Banco ativo e tabelas prontas para sincronização.' };
  } catch (err: any) {
    return { success: false, message: `Falha na requisição: ${err?.message || err}` };
  }
}

// Translate specific Supabase database errors into friendly Portuguese instructions
function formatSupabaseError(err: any, tableName: string): string {
  if (!err) return '';
  const code = err.code;
  const msg = err.message || String(err);
  if (code === '42P01' || msg.includes('relation') || msg.includes('does not exist')) {
    return `A tabela '${tableName}' não existe no banco Supabase. Por favor, copie o Script SQL no final desta página e execute-o no 'SQL Editor' do seu painel Supabase para criar as tabelas necessárias.`;
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('violates row-level security')) {
    return `Permissão negada na tabela '${tableName}' (Erro RLS). Certifique-se de que desativou o Row Level Security (RLS) ou configurou as políticas corretas conforme o script SQL abaixo.`;
  }
  return `${msg} (Código: ${code || 'sem-codigo'})`;
}

// Initial default app users for local/offline testing or initial seeds
export const DEFAULT_APP_USERS: AppUser[] = [
  {
    username: 'anderson',
    password: '123',
    name: 'Anderson Matheus',
    role: 'Supervisor Operacional',
    is_master: true,
    unid: 'VGA'
  },
  {
    username: 'master',
    password: '123',
    name: 'Anderson M. (Master)',
    role: 'Superintendente de Logística',
    is_master: true,
    unid: 'VGA'
  },
  {
    username: 'operador',
    password: '123',
    name: 'João Silva',
    role: 'Operador de Despacho',
    is_master: false,
    unid: 'VGA'
  },
  {
    username: 'auditor',
    password: '123',
    name: 'Maria Costa',
    role: 'Auditor de Contratos',
    is_master: false,
    unid: 'VGA'
  }
];

// Helper to get local app users from localstorage
function getLocalAppUsers(): AppUser[] {
  const local = localStorage.getItem('supabase_fallback_users');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      // Ignored
    }
  }
  localStorage.setItem('supabase_fallback_users', JSON.stringify(DEFAULT_APP_USERS));
  return DEFAULT_APP_USERS;
}

// Helper to save local app users to localstorage
function saveLocalAppUsers(users: AppUser[]) {
  localStorage.setItem('supabase_fallback_users', JSON.stringify(users));
}

// Helper to deduplicate arrays by ID for secure bulk updates without on conflict errors
function deduplicateById<T extends { id: any }>(arr: T[]): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const key = String(item.id).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper to deduplicate players/users by username
function deduplicateUsers(users: AppUser[]): AppUser[] {
  const seen = new Set();
  return users.filter(u => {
    const key = u.username.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Get all app users from Supabase or fallback
export async function getAppUsers(): Promise<AppUser[]> {
  // 1. Direct Web Supabase Query (Robust for Vercel/Static hosting)
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: true });
        
      if (!error && data) {
        const mapped: AppUser[] = data.map((u: any) => ({
          username: u.username,
          password: u.password,
          name: u.name,
          role: u.role,
          is_master: !!u.is_master,
          unid: u.unid,
          created_at: u.created_at
        }));
        
        const resultList: AppUser[] = [...mapped];
        DEFAULT_APP_USERS.forEach(fallback => {
          if (!resultList.some(u => u.username.toLowerCase() === fallback.username.toLowerCase())) {
            resultList.push(fallback);
          }
        });
        return resultList;
      } else if (error) {
        console.warn("Direct query for app_users returned error, falling back:", error.message);
      }
    }
  } catch (supErr) {
    console.warn("Error querying database directly for users, using backend/local:", supErr);
  }

  // 2. Query developer Express server `/api`
  try {
    const creds = getSavedCredentials();
    const headers: Record<string, string> = {};
    if (creds.url && creds.key) {
      headers["x-supabase-url"] = creds.url;
      headers["x-supabase-key"] = creds.key;
    }
    const res = await fetch("/api/auth/users", { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.users) {
        return data.users;
      }
    }
  } catch (e) {
    console.warn("Erro ao recuperar usuários do backend, usando dados locais:", e);
  }

  return getLocalAppUsers();
}

// Create or update app user in database and fallback
export async function saveAppUser(user: AppUser): Promise<{ success: boolean; message: string }> {
  // Update local list first
  const localUsers = getLocalAppUsers();
  const cleanUsername = user.username.toLowerCase().trim();
  const existingIndex = localUsers.findIndex(u => u.username.toLowerCase() === cleanUsername);
  
  const updatedUser = {
    ...user,
    username: cleanUsername,
    password: user.password || "123"
  };

  if (existingIndex > -1) {
    localUsers[existingIndex] = { ...localUsers[existingIndex], ...updatedUser };
  } else {
    localUsers.push(updatedUser);
  }
  saveLocalAppUsers(localUsers);

  // 1. Write to Supabase DB public.app_users directly (Highly resilient for Vercel)
  if (supabase) {
    try {
      const { error: dbError } = await supabase
        .from("app_users")
        .upsert({
          username: cleanUsername,
          password: updatedUser.password,
          name: updatedUser.name,
          role: updatedUser.role,
          is_master: updatedUser.is_master,
          unid: updatedUser.unid
        });

      if (!dbError) {
        // Optimistically try standard email sign-up/creation, but don't crash if restricted
        try {
          const email = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@rotaoperational.com`;
          await supabase.auth.signUp({
            email,
            password: updatedUser.password,
            options: {
              data: {
                name: updatedUser.name,
                role: updatedUser.role,
                is_master: updatedUser.is_master
              }
            }
          });
        } catch (suErr) {
          console.warn("Optional Supabase Auth registration failed:", suErr);
        }
        return { success: true, message: "Usuário salvo e sincronizado diretamente no banco Supabase com sucesso!" };
      } else {
        console.warn("Direct app_users upsert failed, trying API route...", dbError.message);
      }
    } catch (directErr: any) {
      console.warn("Direct write exception, trying API route...", directErr);
    }
  }

  // 2. Query fallback Express server API route
  try {
    const creds = getSavedCredentials();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (creds.url && creds.key) {
      headers["x-supabase-url"] = creds.url;
      headers["x-supabase-key"] = creds.key;
    }
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers,
      body: JSON.stringify(updatedUser)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: data.success, message: data.message || "Usuário salvo e sincronizado com o Supabase com sucesso!" };
    }
  } catch (err: any) {
    console.warn("Backend router returned error, using local save:", err);
  }

  return { success: true, message: "Gravado em seu navegador local para sincronização posterior." };
}

// Delete user from database and fallback
export async function deleteAppUser(username: string): Promise<{ success: boolean; message: string }> {
  const localUsers = getLocalAppUsers().filter(u => u.username.toLowerCase() !== username.toLowerCase());
  saveLocalAppUsers(localUsers);

  // 1. Direct Web Supabase Delete
  if (supabase) {
    try {
      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("username", username.toLowerCase().trim());
      if (!error) {
        return { success: true, message: "Usuário excluído com sucesso do banco de dados Supabase." };
      }
      console.warn("Direct app_users deletion failed, trying API fallback:", error.message);
    } catch (directDeletionErr) {
      console.warn("Direct deletion exception, trying API fallback:", directDeletionErr);
    }
  }

  // 2. Fallback to API router
  try {
    const creds = getSavedCredentials();
    const headers: Record<string, string> = {};
    if (creds.url && creds.key) {
      headers["x-supabase-url"] = creds.url;
      headers["x-supabase-key"] = creds.key;
    }
    const res = await fetch(`/api/auth/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers
    });
    if (res.ok) {
      const data = await res.json();
      return { success: data.success, message: data.message || "Usuário excluído com sucesso do Supabase." };
    }
  } catch (err: any) {
    console.warn("Direct API deletion error, executing local-only removal:", err);
  }

  return { success: true, message: "Excluído localmente em cache offline." };
}

// --- SINGLE RECORD BACKEND / SUPABASE REAL-TIME PERSISTENCE HANDLERS ---

export async function syncVehicleToSupabase(v: Vehicle): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('vehicles').upsert({
      id: v.id,
      driver_name: v.driverName,
      capacity: v.capacity,
      type: v.type,
      status: v.status
    });
    return !error;
  } catch (err) {
    console.warn("syncVehicleToSupabase failed:", err);
    return false;
  }
}

export async function removeVehicleFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.warn("removeVehicleFromSupabase failed:", err);
    return false;
  }
}

export async function syncDriverToSupabase(d: DriverScore): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('drivers').upsert({
      id: d.id,
      name: d.name,
      score: d.score,
      best_route: d.bestRoute,
      status: d.status,
      vehicle: d.vehicle,
      avg_time: d.avgTime,
      error_rate: d.errorRate,
      success_rate: d.successRate,
      avatar: d.avatar
    });
    return !error;
  } catch (err) {
    console.warn("syncDriverToSupabase failed:", err);
    return false;
  }
}

export async function removeDriverFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.warn("removeDriverFromSupabase failed:", err);
    return false;
  }
}

export async function syncOccurrenceToSupabase(o: DeliveryOccurrence): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('occurrences').upsert({
      codigo: o.codigo,
      descricao: o.descricao,
      responsabilidade: o.responsabilidade,
      tipo: o.tipo,
      setor_ocorr: o.setor_ocorr,
      setor_ocorrencia: o.setor_ocorr,
      retorno_rota: o.retorno_rota,
      tratativa_solucao: o.tratativa_solucao
    });
    return !error;
  } catch (err) {
    console.warn("syncOccurrenceToSupabase failed:", err);
    return false;
  }
}

export async function removeOccurrenceFromSupabase(codigo: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('occurrences').delete().eq('codigo', codigo);
    return !error;
  } catch (err) {
    console.warn("removeOccurrenceFromSupabase failed:", err);
    return false;
  }
}

export async function syncCurvaAClientToSupabase(c: CurvaAClient): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('curva_a_clients').upsert({
      cnpj_remetente: c.cnpj_remetente,
      curva_a: c.curva_a,
      cliente_remetente: c.cliente_remetente
    });
    return !error;
  } catch (err) {
    console.warn("syncCurvaAClientToSupabase failed:", err);
    return false;
  }
}

export async function removeCurvaAClientFromSupabase(cnpj: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('curva_a_clients').delete().eq('cnpj_remetente', cnpj);
    return !error;
  } catch (err) {
    console.warn("removeCurvaAClientFromSupabase failed:", err);
    return false;
  }
}

// Export local states to Supabase (Upload Seed Data / Local Records)
export async function exportStateToSupabase(data: {
  vehicles: Vehicle[];
  drivers: DriverScore[];
  ctrcs: Ctrc[];
  tickets: Ticket[];
  clients: CriticClient[];
  users?: AppUser[];
  occurrences?: DeliveryOccurrence[];
  curvaAClients?: CurvaAClient[];
}): Promise<{ success: boolean; results: string[] }> {
  if (!supabase) throw new Error('Supabase client is not configured.');
  
  const results: string[] = [];
  let hasErrors = false;

  // 1. Vehicles
  try {
    const formattedVehicles = data.vehicles.map(v => ({
      id: v.id,
      driver_name: v.driverName,
      capacity: v.capacity,
      type: v.type,
      status: v.status
    }));
    const uniqueVehicles = deduplicateById(formattedVehicles);
    const { error } = await supabase.from('vehicles').upsert(uniqueVehicles);
    if (error) throw error;
    results.push(`✓ ${uniqueVehicles.length} veículos exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Veículos: ${formatSupabaseError(err, 'vehicles')}`);
  }

  // 2. Drivers
  try {
    const formattedDrivers = data.drivers.map(d => ({
      id: d.id,
      name: d.name,
      score: d.score,
      best_route: d.bestRoute,
      status: d.status,
      vehicle: d.vehicle,
      avg_time: d.avgTime,
      error_rate: d.errorRate,
      success_rate: d.successRate,
      avatar: d.avatar
    }));
    const uniqueDrivers = deduplicateById(formattedDrivers);
    const { error } = await supabase.from('drivers').upsert(uniqueDrivers);
    if (error) throw error;
    results.push(`✓ ${uniqueDrivers.length} motoristas exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Motoristas: ${formatSupabaseError(err, 'drivers')}`);
  }

  // 3. CTRCs
  try {
    const formattedCtrcs = data.ctrcs.map(c => ({
      id: c.id,
      destinatario: c.destinatario,
      cidade: c.cidade,
      weight: c.weight,
      volume: c.volume,
      type: c.type,
      status: c.status,
      // Optional ones
      cidade_ent: c.cidade_ent || null,
      setor: c.setor || null,
      prev_ent: c.prev_ent || null,
      remetente: c.remetente || null,
      ocorrencia: c.ocorrencia || null,
      data_ocorr: c.data_ocorr || null,
      nf: c.nf || null,
      valor: c.valor || null,
      frete: c.frete || null,
      unid: c.unid || null,
      pagador: c.pagador || null,
      cod: c.cod || null,
      descricao_ocorr: c.descricao_ocorr || null,
      data_ocorrencia: c.data_ocorrencia || null,
      peso_r: c.peso_r || null,
      obs: c.obs || null,
      disponibilidade: c.disponibilidade || null,
      localizacao: c.localizacao || null
    }));
    const uniqueCtrcs = deduplicateById(formattedCtrcs);
    const { error } = await supabase.from('ctrcs').upsert(uniqueCtrcs);
    if (error) throw error;
    results.push(`✓ ${uniqueCtrcs.length} documentos CTRC exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ CTRCs: ${formatSupabaseError(err, 'ctrcs')}`);
  }

  // 4. Tickets
  try {
    const formattedTickets = data.tickets.map(t => ({
      id: t.id,
      title: t.title,
      destinatario: t.destinatario,
      address: t.address,
      age_minutes: t.ageMinutes,
      priority: t.priority || null,
      status: t.status,
      icon: t.icon
    }));
    const uniqueTickets = deduplicateById(formattedTickets);
    const { error } = await supabase.from('tickets').upsert(uniqueTickets);
    if (error) throw error;
    results.push(`✓ ${uniqueTickets.length} chamados críticos exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Chamados: ${formatSupabaseError(err, 'tickets')}`);
  }

  // 5. Clients
  try {
    const formattedClients = data.clients.map(c => ({
      id: c.id,
      prefix: c.prefix,
      name: c.name,
      score: c.score,
      rejections_30d: c.rejections30d,
      avg_queue_time: c.avgQueueTime,
      address: c.address,
      recurrent_issues_json: JSON.stringify(c.recurrentIssues),
      audit_user: c.auditUser || '',
      audit_avatar: c.auditAvatar || '',
      audit_time: c.auditTime || '',
      audit_detail: c.auditDetail || ''
    }));
    const uniqueClients = deduplicateById(formattedClients);
    const { error } = await supabase.from('clients').upsert(uniqueClients);
    if (error) throw error;
    results.push(`✓ ${uniqueClients.length} clientes auditados exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Clientes: ${formatSupabaseError(err, 'clients')}`);
  }

  // 6. Users (Auth & app_users table)
  if (data.users && data.users.length > 0) {
    try {
      let syncedUsersCount = 0;
      let failedUsersCount = 0;
      const uniqueUsers = deduplicateUsers(data.users);
      
      for (const u of uniqueUsers) {
        try {
          const syncRes = await saveAppUser(u);
          if (syncRes.success) {
            syncedUsersCount++;
          } else {
            failedUsersCount++;
          }
        } catch (uErr) {
          failedUsersCount++;
        }
      }
      results.push(`✓ ${syncedUsersCount} usuários persistidos no banco corporativo (${failedUsersCount} falhas).`);
    } catch (err: any) {
      hasErrors = true;
      results.push(`❌ Usuários: ${err.message || err}`);
    }
  }

  // 7. Occurrences
  if (data.occurrences && data.occurrences.length > 0) {
    try {
      const formattedOccs = data.occurrences.map(o => ({
        codigo: o.codigo,
        descricao: o.descricao,
        responsabilidade: o.responsabilidade,
        tipo: o.tipo,
        setor_ocorr: o.setor_ocorr,
        retorno_rota: o.retorno_rota,
        tratativa_solucao: o.tratativa_solucao
      }));
      const { error } = await supabase.from('occurrences').upsert(formattedOccs);
      if (error) throw error;
      results.push(`✓ ${formattedOccs.length} tipos de ocorrência exportados.`);
    } catch (err: any) {
      hasErrors = true;
      results.push(`❌ Ocorrências: ${formatSupabaseError(err, 'occurrences')}`);
    }
  }

  // 8. Curva A Clients
  if (data.curvaAClients && data.curvaAClients.length > 0) {
    try {
      const formattedCurvas = data.curvaAClients.map(c => ({
        cnpj_remetente: c.cnpj_remetente,
        curva_a: c.curva_a,
        cliente_remetente: c.cliente_remetente
      }));
      const { error } = await supabase.from('curva_a_clients').upsert(formattedCurvas);
      if (error) throw error;
      results.push(`✓ ${formattedCurvas.length} clientes Curva A exportados.`);
    } catch (err: any) {
      hasErrors = true;
      results.push(`❌ Clientes Curva A: ${formatSupabaseError(err, 'curva_a_clients')}`);
    }
  }

  return { success: !hasErrors, results };
}

// Import data from Supabase to update local state
export async function importStateFromSupabase(): Promise<{
  success: boolean;
  message: string;
  data?: {
    vehicles: Vehicle[];
    drivers: DriverScore[];
    ctrcs: Ctrc[];
    tickets: Ticket[];
    clients: CriticClient[];
    occurrences: DeliveryOccurrence[];
    curvaAClients: CurvaAClient[];
  };
}> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  try {
    // 1. Fetch Vehicles
    const vehiclesFetch = await supabase.from('vehicles').select('*');
    if (vehiclesFetch.error) throw new Error(`Falha nos Veículos: ${formatSupabaseError(vehiclesFetch.error, 'vehicles')}`);

    // 2. Fetch Drivers
    const driversFetch = await supabase.from('drivers').select('*');
    if (driversFetch.error) throw new Error(`Falha nos Motoristas: ${formatSupabaseError(driversFetch.error, 'drivers')}`);

    // 3. Fetch CTRCs
    const ctrcsFetch = await supabase.from('ctrcs').select('*');
    if (ctrcsFetch.error) throw new Error(`Falha nos CTRCs: ${formatSupabaseError(ctrcsFetch.error, 'ctrcs')}`);

    // 4. Fetch Tickets
    const ticketsFetch = await supabase.from('tickets').select('*');
    if (ticketsFetch.error) throw new Error(`Falha nos Chamados: ${formatSupabaseError(ticketsFetch.error, 'tickets')}`);

    // 5. Fetch Clients
    const clientsFetch = await supabase.from('clients').select('*');
    if (clientsFetch.error) throw new Error(`Falha nos Clientes: ${formatSupabaseError(clientsFetch.error, 'clients')}`);

    // 6. Fetch Occurrences (Graceful fallback if table is not active yet)
    let occurrencesRaw: any[] = [];
    try {
      const occurrencesFetch = await supabase.from('occurrences').select('*');
      if (!occurrencesFetch.error && occurrencesFetch.data) {
        occurrencesRaw = occurrencesFetch.data;
      }
    } catch (e) {
      console.warn("Tabela de occurrences não ativada ainda:", e);
    }

    // 7. Fetch Curva A Clients (Graceful fallback)
    let curvaAClientsRaw: any[] = [];
    try {
      const curvaAClientsFetch = await supabase.from('curva_a_clients').select('*');
      if (!curvaAClientsFetch.error && curvaAClientsFetch.data) {
        curvaAClientsRaw = curvaAClientsFetch.data;
      }
    } catch (e) {
      console.warn("Tabela de curva_a_clients não ativada ainda:", e);
    }

    // Safe extraction with default array fallbacks
    const vehiclesRaw = vehiclesFetch.data || [];
    const driversRaw = driversFetch.data || [];
    const ctrcsRaw = ctrcsFetch.data || [];
    const ticketsRaw = ticketsFetch.data || [];
    const clientsRaw = clientsFetch.data || [];

    // Check if the database is completely empty (no rows in any of the operational tables)
    if (
      vehiclesRaw.length === 0 &&
      driversRaw.length === 0 &&
      ctrcsRaw.length === 0 &&
      ticketsRaw.length === 0 &&
      clientsRaw.length === 0
    ) {
      throw new Error("Seu banco de dados Supabase foi alcançado com sucesso, mas está totalmente vazio (as tabelas existem mas não têm dados). Por favor, execute a 'Carga Semente' primeiro para enviar os registros locais da sua tela para a nuvem.");
    }

    // Map database formats back to internal React component types
    const vehicles: Vehicle[] = vehiclesRaw.map(v => ({
      id: v.id,
      driverName: v.driver_name,
      capacity: v.capacity,
      type: v.type,
      status: v.status as any
    }));

    const drivers: DriverScore[] = driversRaw.map(d => ({
      id: d.id,
      name: d.name,
      score: Number(d.score),
      bestRoute: d.best_route,
      status: d.status as any,
      vehicle: d.vehicle,
      avgTime: Number(d.avg_time),
      errorRate: Number(d.error_rate),
      successRate: Number(d.success_rate),
      avatar: d.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(d.name)}`
    }));

    const ctrcs: Ctrc[] = ctrcsRaw.map(c => ({
      id: c.id,
      destinatario: c.destinatario,
      cidade: c.cidade,
      weight: Number(c.weight),
      volume: Number(c.volume),
      type: c.type as any,
      status: c.status as any,
      // Optional ones
      cidade_ent: c.cidade_ent || undefined,
      setor: c.setor || undefined,
      prev_ent: c.prev_ent || undefined,
      remetente: c.remetente || undefined,
      ocorrencia: c.ocorrencia || undefined,
      data_ocorr: c.data_ocorr || undefined,
      nf: c.nf || undefined,
      valor: c.valor ? Number(c.valor) : undefined,
      frete: c.frete ? Number(c.frete) : undefined,
      unid: c.unid || undefined,
      pagador: c.pagador || undefined,
      cod: c.cod || undefined,
      descricao_ocorr: c.descricao_ocorr || undefined,
      data_ocorrencia: c.data_ocorrencia || undefined,
      peso_r: c.peso_r ? Number(c.peso_r) : undefined,
      obs: c.obs || undefined,
      disponibilidade: c.disponibilidade || undefined,
      localizacao: c.localizacao || undefined
    }));

    const tickets: Ticket[] = ticketsRaw.map(t => ({
      id: t.id,
      title: t.title,
      destinatario: t.destinatario,
      address: t.address,
      ageMinutes: Number(t.age_minutes),
      priority: t.priority || undefined,
      status: t.status as any,
      icon: t.icon || 'warning'
    }));

    const clients: CriticClient[] = clientsRaw.map(c => {
      let recurrentIssues = [];
      try {
        if (c.recurrent_issues_json) {
          recurrentIssues = JSON.parse(c.recurrent_issues_json);
        }
      } catch (e) {
        recurrentIssues = [
          { title: 'Reclamação Operacional', description: 'Problema na recepção de doc', icon: 'error' }
        ];
      }

      return {
        id: c.id,
        prefix: c.prefix,
        name: c.name,
        score: Number(c.score),
        rejections30d: Number(c.rejections_30d),
        avgQueueTime: c.avg_queue_time || '15 min',
        address: c.address || 'Não cadastrado',
        recurrentIssues,
        auditUser: c.audit_user || '',
        auditAvatar: c.audit_avatar || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(c.name)}`,
        auditTime: c.audit_time || '',
        auditDetail: c.audit_detail || ''
      };
    });

    const occurrences: DeliveryOccurrence[] = occurrencesRaw.map(o => ({
      codigo: o.codigo,
      descricao: o.descricao,
      responsabilidade: o.responsabilidade,
      tipo: o.tipo,
      setor_ocorr: o.setor_ocorr || '',
      retorno_rota: o.retorno_rota as any,
      tratativa_solucao: o.tratativa_solucao
    }));

    const curvaAClients: CurvaAClient[] = curvaAClientsRaw.map(c => ({
      cnpj_remetente: c.cnpj_remetente,
      curva_a: c.curva_a,
      cliente_remetente: c.cliente_remetente
    }));

    return {
      success: true,
      message: 'Dados recuperados e sincronizados do Supabase com sucesso!',
      data: { vehicles, drivers, ctrcs, tickets, clients, occurrences, curvaAClients }
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro inesperado ao buscar dados do Supabase.'
    };
  }
}

// Table schema helpers which provide SQL setup instructions for Supabase
export const SUPABASE_SQL_SCHEMA = `-- Copie e cole este script SQL no SQL Editor do seu painel do Supabase
-- para criar as tabelas compatíveis com o RotaOperational.

-- 1. Veículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  driver_name TEXT NOT NULL,
  capacity TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Motoristas (Desempenho)
CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  best_route TEXT NOT NULL,
  status TEXT NOT NULL,
  vehicle TEXT NOT NULL,
  avg_time INTEGER NOT NULL,
  error_rate NUMERIC NOT NULL,
  success_rate NUMERIC NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documentos Operacionais CTRC
CREATE TABLE IF NOT EXISTS public.ctrcs (
  id TEXT PRIMARY KEY,
  destinatario TEXT NOT NULL,
  cidade TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  volume INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  cidade_ent TEXT,
  setor TEXT,
  prev_ent TEXT,
  remetente TEXT,
  ocorrencia TEXT,
  data_ocorr TEXT,
  nf TEXT,
  valor NUMERIC,
  frete NUMERIC,
  unid TEXT,
  pagador TEXT,
  cod TEXT,
  descricao_ocorr TEXT,
  data_ocorrencia TEXT,
  peso_r NUMERIC,
  obs TEXT,
  disponibilidade TEXT,
  localizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ocorrências / Tickets de Deserviço
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  address TEXT NOT NULL,
  age_minutes INTEGER NOT NULL,
  priority TEXT,
  status TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clientes Críticos
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rejections_30d INTEGER NOT NULL,
  avg_queue_time TEXT NOT NULL,
  address TEXT NOT NULL,
  recurrent_issues_json TEXT NOT NULL,
  audit_user TEXT,
  audit_avatar TEXT,
  audit_time TEXT,
  audit_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Gestão de Usuários
CREATE TABLE IF NOT EXISTS public.app_users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_master BOOLEAN DEFAULT FALSE,
  unid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Dicionário de Ocorrências Operacionais
CREATE TABLE IF NOT EXISTS public.occurrences (
  codigo TEXT PRIMARY KEY,
  descricao TEXT NOT NULL,
  responsabilidade TEXT NOT NULL,
  tipo TEXT NOT NULL,
  setor_ocorr TEXT NOT NULL,
  retorno_rota TEXT NOT NULL,
  tratativa_solucao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Clientes Curva A (Base de Dados)
CREATE TABLE IF NOT EXISTS public.curva_a_clients (
  cnpj_remetente TEXT PRIMARY KEY,
  curva_a TEXT NOT NULL,
  cliente_remetente TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- IMPORTANTE: Para que o sistema sincronize livremente sem erros de política (RLS),
-- execute estes comandos para liberar o acesso público de leitura e escrita:
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctrcs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.curva_a_clients DISABLE ROW LEVEL SECURITY;
`;
