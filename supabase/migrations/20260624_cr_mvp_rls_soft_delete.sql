-- Migração para CR-MVP-SUPABASE-07
-- Adição de Soft Delete, Padronização e RLS

-- 1. Soft Delete para Shipments
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Ativação de RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_gr_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies Básicas (MVP com anon key - risco assumido e documentado)
-- Para o MVP sem auth real, permitimos Select e operações de alteração seguras.

-- Shipments: Leitura e Escrita (Insert/Update). Sem permissão de DELETE.
CREATE POLICY "Enable read access for all on shipments" ON public.shipments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on shipments" ON public.shipments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on shipments" ON public.shipments FOR UPDATE USING (true);

-- Import Batches: Leitura e Insert. Sem permissão de UPDATE/DELETE.
CREATE POLICY "Enable read access for all on import_batches" ON public.import_batches FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on import_batches" ON public.import_batches FOR INSERT WITH CHECK (true);

-- Vehicles: Leitura e Escrita (Insert/Update).
CREATE POLICY "Enable read access for all on vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on vehicles" ON public.vehicles FOR UPDATE USING (true);

-- Vehicle GR Rules: Leitura e Escrita.
CREATE POLICY "Enable read access for all on vehicle_gr_rules" ON public.vehicle_gr_rules FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on vehicle_gr_rules" ON public.vehicle_gr_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on vehicle_gr_rules" ON public.vehicle_gr_rules FOR UPDATE USING (true);

-- Critical Clients: Leitura e Escrita.
CREATE POLICY "Enable read access for all on critical_clients" ON public.critical_clients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on critical_clients" ON public.critical_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all on critical_clients" ON public.critical_clients FOR UPDATE USING (true);

-- Audit Logs: Leitura e Insert apenas. Sem permissão de UPDATE/DELETE.
CREATE POLICY "Enable read access for all on audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
