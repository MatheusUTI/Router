-- Migração para CR-MESA-COLABORATIVA-01 / Etapa 1
-- Schema colaborativo Supabase para plano diário de roteirização compartilhado por filial/data

-- 1. Tabela de Planos de Roteirização (routing_plans)
CREATE TABLE IF NOT EXISTS public.routing_plans (
  id TEXT PRIMARY KEY,
  company_code TEXT NOT NULL,
  planning_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_MONTAGEM',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT routing_plans_company_date_unique UNIQUE(company_code, planning_date)
);

-- 2. Tabela de Itens de Planos de Roteirização (routing_plan_items)
CREATE TABLE IF NOT EXISTS public.routing_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES public.routing_plans(id) ON DELETE CASCADE,
  shipment_unique_key TEXT,
  ctrc_id TEXT NOT NULL,
  planning_date DATE NOT NULL,
  company_code TEXT NOT NULL,
  suggested_route TEXT,
  operational_route TEXT,
  vehicle_id TEXT,
  vehicle_plate TEXT,
  driver_name TEXT,
  helper_name TEXT,
  planning_status TEXT NOT NULL DEFAULT 'A_PLANEJAR',
  manual_priority TEXT,
  operational_note TEXT,
  locked_by_user TEXT,
  updated_by TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT routing_plan_items_plan_ctrc_unique UNIQUE(plan_id, ctrc_id)
);

-- 3. Tabela de Pré-Romaneios (pre_romaneios) - Se já existir, apenas adicionar colunas faltantes de forma segura
CREATE TABLE IF NOT EXISTS public.pre_romaneios (
  id TEXT PRIMARY KEY,
  planning_date DATE NOT NULL DEFAULT CURRENT_DATE,
  company_code TEXT NOT NULL DEFAULT 'DEFAULT',
  route TEXT NOT NULL DEFAULT 'ROTA 01',
  gate TEXT,
  status TEXT NOT NULL DEFAULT 'RASCUNHO',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a tabela pre_romaneios e suas colunas existentes sejam do tipo correto de forma segura
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pre_romaneios' 
      AND column_name = 'planning_date' 
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.pre_romaneios ALTER COLUMN planning_date TYPE DATE USING (
      CASE 
        WHEN planning_date IS NOT NULL AND planning_date ~ '^\d{4}-\d{2}-\d{2}' THEN planning_date::DATE
        ELSE CURRENT_DATE
      END
    );
  END IF;
END $$;

ALTER TABLE public.pre_romaneios ALTER COLUMN planning_date SET NOT NULL;

-- Garantir company_code
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS company_code TEXT;
UPDATE public.pre_romaneios SET company_code = 'DEFAULT' WHERE company_code IS NULL;
ALTER TABLE public.pre_romaneios ALTER COLUMN company_code SET DEFAULT 'DEFAULT';
ALTER TABLE public.pre_romaneios ALTER COLUMN company_code SET NOT NULL;

-- Garantir route
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS route TEXT;
UPDATE public.pre_romaneios SET route = 'ROTA 01' WHERE route IS NULL;
ALTER TABLE public.pre_romaneios ALTER COLUMN route SET NOT NULL;

-- Garantir status
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS status TEXT;
UPDATE public.pre_romaneios SET status = 'RASCUNHO' WHERE status IS NULL;
ALTER TABLE public.pre_romaneios ALTER COLUMN status SET DEFAULT 'RASCUNHO';
ALTER TABLE public.pre_romaneios ALTER COLUMN status SET NOT NULL;

-- Adicionar colunas adicionais faltantes
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS helper_name TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS total_weight NUMERIC DEFAULT 0;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS total_volumes INTEGER DEFAULT 0;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS total_frete NUMERIC DEFAULT 0;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.pre_romaneios ADD COLUMN IF NOT EXISTS import_batch_id TEXT;

-- Ajustar defaults de timestamps
ALTER TABLE public.pre_romaneios ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.pre_romaneios ALTER COLUMN updated_at SET DEFAULT NOW();


-- 4. Tabela de Itens de Pré-Romaneios (pre_romaneio_items)
CREATE TABLE IF NOT EXISTS public.pre_romaneio_items (
  id TEXT PRIMARY KEY,
  pre_romaneio_id TEXT NOT NULL REFERENCES public.pre_romaneios(id) ON DELETE CASCADE,
  ctrc_id TEXT NOT NULL,
  shipment_unique_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pre_romaneio_items_unique UNIQUE(pre_romaneio_id, ctrc_id)
);


-- 5. Índices de Performance para as Novas Tabelas e Consultas Colaborativas
CREATE INDEX IF NOT EXISTS idx_routing_plans_company_date ON public.routing_plans(company_code, planning_date);
CREATE INDEX IF NOT EXISTS idx_routing_plan_items_plan ON public.routing_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_routing_plan_items_company_date ON public.routing_plan_items(company_code, planning_date);
CREATE INDEX IF NOT EXISTS idx_routing_plan_items_ctrc ON public.routing_plan_items(ctrc_id);
CREATE INDEX IF NOT EXISTS idx_pre_romaneios_company_date ON public.pre_romaneios(company_code, planning_date);
CREATE INDEX IF NOT EXISTS idx_pre_romaneio_items_pre_romaneio ON public.pre_romaneio_items(pre_romaneio_id);


-- 6. Ativação de Row Level Security (RLS) e Políticas Simples MVP
ALTER TABLE public.routing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_romaneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_romaneio_items ENABLE ROW LEVEL SECURITY;

-- Políticas para routing_plans
DROP POLICY IF EXISTS "Enable read access for all on routing_plans" ON public.routing_plans;
DROP POLICY IF EXISTS "Enable insert access for all on routing_plans" ON public.routing_plans;
DROP POLICY IF EXISTS "Enable update access for all on routing_plans" ON public.routing_plans;

CREATE POLICY "Enable read access for all on routing_plans" ON public.routing_plans FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on routing_plans" ON public.routing_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on routing_plans" ON public.routing_plans FOR UPDATE USING (true);

-- Políticas para routing_plan_items
DROP POLICY IF EXISTS "Enable read access for all on routing_plan_items" ON public.routing_plan_items;
DROP POLICY IF EXISTS "Enable insert access for all on routing_plan_items" ON public.routing_plan_items;
DROP POLICY IF EXISTS "Enable update access for all on routing_plan_items" ON public.routing_plan_items;

CREATE POLICY "Enable read access for all on routing_plan_items" ON public.routing_plan_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on routing_plan_items" ON public.routing_plan_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on routing_plan_items" ON public.routing_plan_items FOR UPDATE USING (true);

-- Políticas para pre_romaneios
DROP POLICY IF EXISTS "Enable read access for all on pre_romaneios" ON public.pre_romaneios;
DROP POLICY IF EXISTS "Enable insert access for all on pre_romaneios" ON public.pre_romaneios;
DROP POLICY IF EXISTS "Enable update access for all on pre_romaneios" ON public.pre_romaneios;

CREATE POLICY "Enable read access for all on pre_romaneios" ON public.pre_romaneios FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on pre_romaneios" ON public.pre_romaneios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on pre_romaneios" ON public.pre_romaneios FOR UPDATE USING (true);

-- Políticas para pre_romaneio_items
DROP POLICY IF EXISTS "Enable read access for all on pre_romaneio_items" ON public.pre_romaneio_items;
DROP POLICY IF EXISTS "Enable insert access for all on pre_romaneio_items" ON public.pre_romaneio_items;
DROP POLICY IF EXISTS "Enable update access for all on pre_romaneio_items" ON public.pre_romaneio_items;

CREATE POLICY "Enable read access for all on pre_romaneio_items" ON public.pre_romaneio_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on pre_romaneio_items" ON public.pre_romaneio_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on pre_romaneio_items" ON public.pre_romaneio_items FOR UPDATE USING (true);
