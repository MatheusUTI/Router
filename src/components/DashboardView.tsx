import React, { useMemo, useState, useEffect } from "react";
import { Ctrc, CriticClient, AppUser } from "../types";
import { calculateDashboardMetrics } from "../services/dashboardMetricsService";
import { shipmentSupabaseRepository } from "../infrastructure/supabase/repositories/shipmentSupabaseRepository";
import { DEFAULT_OPERATIONAL_UNIT } from "../constants/operationalUnits";
import { classifyOperationalFlow } from "../services/operationalFlowClassifier";

interface DashboardProps {
  onNavigateToView: (view: "importacao" | "frota" | "roteirizacao") => void;
  searchValue: string;
  allImportedCtrcs?: Ctrc[];
  criticClients?: CriticClient[];
  adminUser?: AppUser | null;
}

export default function DashboardView({
  onNavigateToView,
  searchValue,
  allImportedCtrcs = [],
  criticClients = [],
  adminUser,
}: DashboardProps) {
  const userUnit = (adminUser?.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
  const [supabaseCtrcs, setSupabaseCtrcs] = useState<Ctrc[] | null>(null);
  const [isFetchingSupabase, setIsFetchingSupabase] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchSupabaseData() {
      setIsFetchingSupabase(true);
      const result = await shipmentSupabaseRepository.getRecentShipments(31);

      console.group("[Dashboard Debug]");
      console.log(
        "Quantidade retornada pelo Supabase:",
        result.data?.length || 0,
      );
      console.log(
        "Quantidade no IndexedDB/props (allImportedCtrcs):",
        allImportedCtrcs.length,
      );
      console.log("Intervalo de datas consultado: Últimos 31 dias");

      if (mounted) {
        if (result.success && result.data) {
          const mapped: Ctrc[] = result.data.map((s) => {
            // Use fallback dates if issue_date is missing
            const dataOcorrencia =
              s.issue_date ||
              s.forecast_delivery_date ||
              (s as any).created_at ||
              undefined;
            const baseCtrc: Ctrc = {
              id: s.raw_payload?.id || `${s.ctrc_number}`,
              destinatario: s.recipient_name || "",
              cidade: s.destination_city || "",
              weight: s.weight || 0,
              volume: s.volume_count || 0,
              type: s.is_curve_a ? "CURVA A" : "NORMAL",
              status: (s.status as any) || "Pendente",
              remetente: s.sender_name || undefined,
              pagador: s.payer_name || undefined,
              data_ocorrencia: dataOcorrencia,
              prev_ent: s.forecast_delivery_date || undefined,
              valor: s.total_value || undefined,
              // Re-inject the raw payload safely
              ...(s.raw_payload || {}),
            };
            return classifyOperationalFlow(baseCtrc, userUnit);
          });

          console.log(
            "Quantidade após filtros / mapeamento e remoção de deletados:",
            mapped.length,
          );
          setSupabaseCtrcs(mapped);
        } else {
          console.log("Falha na consulta ao Supabase.");
          setSupabaseCtrcs(null);
        }
        console.groupEnd();
        setIsFetchingSupabase(false);
      }
    }
    fetchSupabaseData();
    return () => {
      mounted = false;
    };
  }, [allImportedCtrcs.length]); // Add dependency to catch if it updates

  const criticNames = useMemo(
    () => criticClients.map((c) => c.name),
    [criticClients],
  );

  const activeCtrcs = useMemo(() => {
    let ctrcsToUse = supabaseCtrcs !== null ? supabaseCtrcs : allImportedCtrcs;
    // If Supabase returned an empty array, but we have local data, fallback to local data.
    if (
      supabaseCtrcs &&
      supabaseCtrcs.length === 0 &&
      allImportedCtrcs.length > 0
    ) {
      console.log(
        "[Dashboard Debug] Fallback automático para IndexedDB acionado (Supabase vazio)",
      );
      ctrcsToUse = allImportedCtrcs;
    }

    // Ensure all are classified, especially if loaded from old cache
    return ctrcsToUse.map((c) =>
      c.flowType ? c : classifyOperationalFlow({ ...c }, userUnit),
    );
  }, [supabaseCtrcs, allImportedCtrcs, userUnit]);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(activeCtrcs, criticNames, { userUnit });
  }, [activeCtrcs, criticNames, userUnit]);

  const {
    operationToday,
    last31Days,
    slaReceipt,
    slaDelivery,
    backlog,
    alerts,
  } = metrics;

  if (isFetchingSupabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--router-text)] animate-fade-in">
        <span className="material-symbols-outlined text-[64px] text-primary animate-spin mb-4">
          sync
        </span>
        <h2 className="text-xl font-bold mb-2">Sincronizando BI...</h2>
        <p className="text-sm text-[var(--router-text-muted)] text-center max-w-md mb-6">
          Aguarde enquanto conectamos ao Supabase para trazer os dados mais
          recentes.
        </p>
      </div>
    );
  }

  if (activeCtrcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--router-text)] animate-fade-in">
        <span className="material-symbols-outlined text-[64px] text-[var(--router-text-muted)] opacity-50 mb-4 select-none">
          dashboard
        </span>
        <h2 className="text-xl font-bold mb-2">Dashboard Indisponível</h2>
        <p className="text-sm text-[var(--router-text-muted)] text-center max-w-md mb-6">
          Não há dados operacionais suficientes para gerar indicadores. Por
          favor, importe um arquivo de CTRCs primeiro.
        </p>
        <button
          onClick={() => onNavigateToView("importacao")}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            upload_file
          </span>
          Ir para Importação
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-[var(--router-text)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--router-border)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--router-text-muted)] text-xs font-mono mb-1">
            <span className="material-symbols-outlined text-[14px]">
              bar_chart
            </span>
            <span>BI OPERACIONAL</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Dashboard Gerencial
          </h1>
          <p className="text-xs text-[var(--router-text-muted)] mt-1 max-w-2xl">
            Visão consolidada da operação baseada no histórico de importação.
          </p>
        </div>
        <div className="flex items-center justify-center bg-[var(--router-surface-2)] border border-[var(--router-border)] px-4 py-2 rounded-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--router-text-muted)] mr-2">
            Filial Analisada:
          </span>
          <span className="text-sm font-mono font-bold text-[var(--router-primary)] bg-[var(--router-primary)]/10 px-2 py-0.5 rounded shadow-sm">
            {userUnit}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Seção 1 - Operação Atual */}
          <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                today
              </span>
              OPERAÇÃO ATUAL (HOJE)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-[var(--router-border)]">
                <p className="text-[10px] text-[var(--router-text-muted)] font-bold mb-1 uppercase tracking-wider">
                  Previstos
                </p>
                <p className="text-xl font-mono font-bold">
                  {operationToday.predicted}
                </p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-[var(--router-border)]">
                <p className="text-[10px] text-[var(--router-text-muted)] font-bold mb-1 uppercase tracking-wider">
                  Roteirizados
                </p>
                <p className="text-xl font-mono font-bold text-blue-400">
                  {operationToday.routed}
                </p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-[var(--router-border)]">
                <p className="text-[10px] text-[var(--router-text-muted)] font-bold mb-1 uppercase tracking-wider">
                  Entregues
                </p>
                <p className="text-xl font-mono font-bold text-emerald-400">
                  {operationToday.delivered}
                </p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-[var(--router-border)]">
                <p className="text-[10px] text-[var(--router-text-muted)] font-bold mb-1 uppercase tracking-wider">
                  Pendentes
                </p>
                <p className="text-xl font-mono font-bold text-amber-400">
                  {operationToday.pending}
                </p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider">
                  Vencidos
                </p>
                <p className="text-xl font-mono font-bold text-red-500">
                  {operationToday.overdue}
                </p>
              </div>
            </div>
          </section>

          {/* Seção 2 & 5 - Últimos 31 Dias & Backlog */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--router-text-muted)] text-[18px]">
                  calendar_month
                </span>
                ÚLTIMOS 31 DIAS
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    CTRCs Emitidos
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {last31Days.emitted}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    CTRCs Entregues
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {last31Days.delivered}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    CTRCs Não Entregues
                  </span>
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {last31Days.notDelivered}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--router-text-muted)] text-[18px]">
                  inventory_2
                </span>
                BACKLOG
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    Pendentes Dentro do Prazo
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {backlog.pendingOnTime}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    Pendentes Vencidos
                  </span>
                  <span className="text-sm font-bold font-mono text-red-500">
                    {backlog.pendingOverdue}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--router-text-muted)] font-medium">
                    Total Não Entregues
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {backlog.notDelivered}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Seção 3 & 4 - SLAs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  local_shipping
                </span>
                SLA RECEBIMENTO
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex shrink-0 items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      className="text-[var(--router-surface-3)]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        slaReceipt.slaPercentage >= 95
                          ? "text-emerald-400"
                          : slaReceipt.slaPercentage >= 85
                            ? "text-amber-400"
                            : "text-red-500"
                      }
                      strokeWidth="4"
                      strokeDasharray={`${slaReceipt.slaPercentage}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold font-mono">
                      {slaReceipt.slaPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--router-text-muted)]">
                      No Prazo
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {slaReceipt.onTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--router-text-muted)]">
                      Fora do Prazo
                    </span>
                    <span className="font-mono font-bold text-red-500">
                      {slaReceipt.late}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  verified
                </span>
                SLA ENTREGA
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex shrink-0 items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      className="text-[var(--router-surface-3)]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        slaDelivery.slaPercentage >= 95
                          ? "text-emerald-400"
                          : slaDelivery.slaPercentage >= 85
                            ? "text-amber-400"
                            : "text-red-500"
                      }
                      strokeWidth="4"
                      strokeDasharray={`${slaDelivery.slaPercentage}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold font-mono">
                      {slaDelivery.slaPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--router-text-muted)]">
                      No Prazo
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {slaDelivery.onTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--router-text-muted)]">
                      Fora do Prazo
                    </span>
                    <span className="font-mono font-bold text-red-500">
                      {slaDelivery.late}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Column - Alertas Operacionais */}
        <div className="xl:col-span-1">
          <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm h-full flex flex-col">
            <h2 className="text-sm font-bold text-[var(--router-text)] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">
                notification_important
              </span>
              ALERTAS OPERACIONAIS
            </h2>

            <div
              className="flex-1 overflow-y-auto pr-1 space-y-3"
              style={{ maxHeight: "calc(100vh - 280px)" }}
            >
              <div
                className="bg-[var(--router-surface-2)] p-3 rounded-lg border-l-4 border-l-red-500 border border-y-[var(--router-border)] border-r-[var(--router-border)] hover:bg-[var(--router-surface-3)] cursor-pointer transition-colors"
                onClick={() => onNavigateToView("roteirizacao")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    Clientes Críticos Pendentes
                  </span>
                  <span className="bg-red-500/10 text-red-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.criticPending.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Atenção máxima em entregas que impactam nível de serviço
                  corporativo.
                </p>
              </div>

              <div
                className="bg-[var(--router-surface-2)] p-3 rounded-lg border-l-4 border-l-amber-500 border border-y-[var(--router-border)] border-r-[var(--router-border)] hover:bg-[var(--router-surface-3)] cursor-pointer transition-colors"
                onClick={() => onNavigateToView("roteirizacao")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Curva A Pendentes
                  </span>
                  <span className="bg-amber-500/10 text-amber-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.curvaAPending.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Altos volumes aguardando roteirização no pátio.
                </p>
              </div>

              <div
                className="bg-[var(--router-surface-2)] p-3 rounded-lg border-l-4 border-l-red-500 border border-y-[var(--router-border)] border-r-[var(--router-border)] hover:bg-[var(--router-surface-3)] cursor-pointer transition-colors"
                onClick={() => onNavigateToView("roteirizacao")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    CTRCs Vencidos
                  </span>
                  <span className="bg-red-500/10 text-red-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.overdue.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Cargas cujo prazo de entrega já expirou e não foram entregues.
                </p>
              </div>

              <div
                className="bg-[var(--router-surface-2)] p-3 rounded-lg border-l-4 border-l-blue-400 border border-y-[var(--router-border)] border-r-[var(--router-border)] hover:bg-[var(--router-surface-3)] cursor-pointer transition-colors"
                onClick={() => onNavigateToView("roteirizacao")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Recebidos no Dia do Prazo
                  </span>
                  <span className="bg-blue-500/10 text-blue-400 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.receivedOnDeadlineDay.length}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Fora do SLA de Recebimento. Precisam ser expedidos com
                  urgência hoje.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
