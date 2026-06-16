-- Migração Inicial de Banco de Dados: RotaOperational
-- Destino: Supabase SQL Editor / CLI
-- Criado em: 2026-05-24

-- 1. Tabela de Veículos de Frota
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  driver_name TEXT NOT NULL,
  capacity TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Motoristas (Desempenho Geral)
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

-- 3. Documentos Operacionais / CTRCs
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

-- 4. Ocorrências Ativas / Tickets de Deserviço
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

-- 5. Clientes Críticos e Auditoria de Recorrência
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

-- 6. Gestão Corporativa de Usuários (Login e Níveis de Acesso)
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

-- 9. Planejamento de Rota (Route Planning Items)
CREATE TABLE IF NOT EXISTS public.route_planning_items (
  id TEXT PRIMARY KEY,
  ctrc_id TEXT,
  planning_date TEXT,
  suggested_route TEXT,
  operational_route TEXT,
  manual_priority TEXT,
  planning_status TEXT,
  operational_note TEXT,
  locked_by_user TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 10. Pré-Romaneios
CREATE TABLE IF NOT EXISTS public.pre_romaneios (
  id TEXT PRIMARY KEY,
  planning_date TEXT,
  route TEXT,
  gate TEXT,
  status TEXT,
  converted_romaneio_id TEXT,
  ctrc_ids JSONB,
  payload JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- 11. Romaneio Salvos (savedRomaneios)
CREATE TABLE IF NOT EXISTS public.saved_romaneios (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_id TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,
  helper_name TEXT,
  ctrc_ids JSONB,
  payload JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Desabilitar políticas RLS para permitir comunicação pública simplificada de demonstração e sync
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctrcs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.curva_a_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_planning_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_romaneios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_romaneios DISABLE ROW LEVEL SECURITY;

-- Inserir usuários iniciais padrões (Seeds) para evitar bloqueio no primeiro acesso
INSERT INTO public.app_users (username, password, name, role, is_master, unid)
VALUES 
  ('master', '123', 'Anderson M. (Master)', 'Superintendente de Logística', TRUE, 'MOC-01'),
  ('operador', '123', 'João Silva', 'Operador de Despacho', FALSE, 'MOC-01'),
  ('auditor', '123', 'Maria Costa', 'Auditor de Contratos', FALSE, 'MOC-01')
ON CONFLICT (username) DO NOTHING;

