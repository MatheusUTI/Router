-- Migração para CR-MVP-SUPABASE-08
-- Correção de Consistência (Datas, Tipos, Índices)

-- 1. Corrigir tipo de requires_tracking_above_value
-- Como era NUMERIC, vamos converter para BOOLEAN
ALTER TABLE public.vehicle_gr_rules 
ALTER COLUMN requires_tracking_above_value TYPE BOOLEAN 
USING (
  CASE 
    WHEN requires_tracking_above_value > 0 THEN true 
    ELSE false 
  END
);
ALTER TABLE public.vehicle_gr_rules 
ALTER COLUMN requires_tracking_above_value SET DEFAULT FALSE;

-- 2. Converter datas principais de shipments para TIMESTAMPTZ
-- Vamos usar uma conversão segura. Como era TEXT, pode ter dados ruins.
ALTER TABLE public.shipments
ALTER COLUMN issue_date TYPE TIMESTAMPTZ USING (
  CASE WHEN issue_date IS NOT NULL AND issue_date != '' THEN issue_date::TIMESTAMPTZ ELSE NULL END
);

ALTER TABLE public.shipments
ALTER COLUMN forecast_delivery_date TYPE TIMESTAMPTZ USING (
  CASE WHEN forecast_delivery_date IS NOT NULL AND forecast_delivery_date != '' THEN forecast_delivery_date::TIMESTAMPTZ ELSE NULL END
);

ALTER TABLE public.shipments
ALTER COLUMN unit_arrival_date TYPE TIMESTAMPTZ USING (
  CASE WHEN unit_arrival_date IS NOT NULL AND unit_arrival_date != '' THEN unit_arrival_date::TIMESTAMPTZ ELSE NULL END
);

ALTER TABLE public.shipments
ALTER COLUMN delivery_date TYPE TIMESTAMPTZ USING (
  CASE WHEN delivery_date IS NOT NULL AND delivery_date != '' THEN delivery_date::TIMESTAMPTZ ELSE NULL END
);

-- 3. Índices de performance para BI e buscas
CREATE INDEX IF NOT EXISTS idx_shipments_issue_date ON public.shipments(issue_date);
CREATE INDEX IF NOT EXISTS idx_shipments_is_deleted ON public.shipments(is_deleted);
-- unique_key já possui índice implícito por ser UNIQUE Constraint, mas se precisar:
-- CREATE INDEX IF NOT EXISTS idx_shipments_unique_key ON public.shipments(unique_key);
