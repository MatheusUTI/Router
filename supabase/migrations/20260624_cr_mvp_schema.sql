-- Migração para CR-MVP-SUPABASE-06
-- Adição e ajuste das tabelas para Sincronização Supabase 

-- 1. Tabela de Lotes de Importação (import_batches)
CREATE TABLE IF NOT EXISTS public.import_batches (
  id TEXT PRIMARY KEY,
  imported_at TIMESTAMPTZ NOT NULL,
  imported_by TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL,
  updated_count INTEGER NOT NULL,
  rejected_count INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.import_batches DISABLE ROW LEVEL SECURITY;

-- 2. Tabela de Shipments (CTRCs Importados)
CREATE TABLE IF NOT EXISTS public.shipments (
  id TEXT PRIMARY KEY,
  company_code TEXT NOT NULL,
  ctrc_number TEXT NOT NULL,
  ctrc_series TEXT NOT NULL,
  unique_key TEXT NOT NULL UNIQUE,
  issue_date TEXT,
  forecast_delivery_date TEXT,
  unit_arrival_date TEXT,
  delivery_date TEXT,
  sender_name TEXT,
  recipient_name TEXT,
  payer_name TEXT,
  destination_city TEXT,
  destination_state TEXT,
  total_value NUMERIC,
  weight NUMERIC,
  volume_count INTEGER,
  status TEXT,
  is_delivered BOOLEAN DEFAULT FALSE,
  is_curve_a BOOLEAN DEFAULT FALSE,
  is_critical_client BOOLEAN DEFAULT FALSE,
  last_import_batch_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;

-- 3. Ajuste/Criação Tabela de Veículos (vehicles_v2 para não conflitar com a existente, ou altera a existente)
-- Como a tabela vehicles já existe com colunas diferentes, vamos adicionar as colunas necessárias se não existirem
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS plate TEXT,
ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Tabela de Regras GR (vehicle_gr_rules)
CREATE TABLE IF NOT EXISTS public.vehicle_gr_rules (
  id TEXT PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  max_value_without_gr NUMERIC NOT NULL,
  requires_tracking_above_value NUMERIC NOT NULL,
  requires_authorization_above_limit BOOLEAN DEFAULT FALSE,
  blocks_routing_above_limit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vehicle_gr_rules DISABLE ROW LEVEL SECURITY;

-- 5. Tabela de Clientes Críticos (critical_clients)
CREATE TABLE IF NOT EXISTS public.critical_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  score NUMERIC NOT NULL,
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.critical_clients DISABLE ROW LEVEL SECURITY;

-- 6. Tabela de Logs de Auditoria (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_name TEXT NOT NULL,
  profile TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
