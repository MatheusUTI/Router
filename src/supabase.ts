import { createClient } from '@supabase/supabase-js';
import { Vehicle, DriverScore, Ctrc, Ticket, CriticClient } from './types';

const supabaseUrl = 
  ((import.meta as any).env)?.VITE_SUPABASE_URL || 
  ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  ((import.meta as any).env)?.VITE_SUPABASE_ANON_KEY || 
  ((import.meta as any).env)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  '';

// Clean helpers to check if they are set to valid values
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  supabaseUrl !== 'https://your-supabase-project.supabase.co' && 
  !!supabaseAnonKey && 
  supabaseAnonKey !== 'your-supabase-anon-key';

// Client initialization
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

// Export local states to Supabase (Upload Seed Data / Local Records)
export async function exportStateToSupabase(data: {
  vehicles: Vehicle[];
  drivers: DriverScore[];
  ctrcs: Ctrc[];
  tickets: Ticket[];
  clients: CriticClient[];
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
    const { error } = await supabase.from('vehicles').upsert(formattedVehicles);
    if (error) throw error;
    results.push(`✓ ${formattedVehicles.length} veículos exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Veículos: ${err.message || err}`);
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
    const { error } = await supabase.from('drivers').upsert(formattedDrivers);
    if (error) throw error;
    results.push(`✓ ${formattedDrivers.length} motoristas exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Motoristas: ${err.message || err}`);
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
    const { error } = await supabase.from('ctrcs').upsert(formattedCtrcs);
    if (error) throw error;
    results.push(`✓ ${formattedCtrcs.length} documentos CTRC exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ CTRCs: ${err.message || err}`);
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
    const { error } = await supabase.from('tickets').upsert(formattedTickets);
    if (error) throw error;
    results.push(`✓ ${formattedTickets.length} chamados críticos exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Chamados: ${err.message || err}`);
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
    const { error } = await supabase.from('clients').upsert(formattedClients);
    if (error) throw error;
    results.push(`✓ ${formattedClients.length} clientes auditados exportados com sucesso.`);
  } catch (err: any) {
    hasErrors = true;
    results.push(`❌ Clientes: ${err.message || err}`);
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
  };
}> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  try {
    // 1. Fetch Vehicles
    const vehiclesFetch = await supabase.from('vehicles').select('*');
    if (vehiclesFetch.error) throw new Error(`Falha nos Veículos: ${vehiclesFetch.error.message}`);

    // 2. Fetch Drivers
    const driversFetch = await supabase.from('drivers').select('*');
    if (driversFetch.error) throw new Error(`Falha nos Motoristas: ${driversFetch.error.message}`);

    // 3. Fetch CTRCs
    const ctrcsFetch = await supabase.from('ctrcs').select('*');
    if (ctrcsFetch.error) throw new Error(`Falha nos CTRCs: ${ctrcsFetch.error.message}`);

    // 4. Fetch Tickets
    const ticketsFetch = await supabase.from('tickets').select('*');
    if (ticketsFetch.error) throw new Error(`Falha nos Chamados: ${ticketsFetch.error.message}`);

    // 5. Fetch Clients
    const clientsFetch = await supabase.from('clients').select('*');
    if (clientsFetch.error) throw new Error(`Falha nos Clientes: ${clientsFetch.error.message}`);

    // Map database formats back to internal React component types
    const vehicles: Vehicle[] = vehiclesFetch.data.map(v => ({
      id: v.id,
      driverName: v.driver_name,
      capacity: v.capacity,
      type: v.type,
      status: v.status as any
    }));

    const drivers: DriverScore[] = driversFetch.data.map(d => ({
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

    const ctrcs: Ctrc[] = ctrcsFetch.data.map(c => ({
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

    const tickets: Ticket[] = ticketsFetch.data.map(t => ({
      id: t.id,
      title: t.title,
      destinatario: t.destinatario,
      address: t.address,
      ageMinutes: Number(t.age_minutes),
      priority: t.priority || undefined,
      status: t.status as any,
      icon: t.icon || 'warning'
    }));

    const clients: CriticClient[] = clientsFetch.data.map(c => {
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

    return {
      success: true,
      message: 'Dados recuperados e sincronizados do Supabase com sucesso!',
      data: { vehicles, drivers, ctrcs, tickets, clients }
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
`;
