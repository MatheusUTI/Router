import React, { useMemo, useState, useEffect } from "react";
import { Ctrc, CriticClient, AppUser } from "../types";
import { calculateKpiMetrics, DEFAULT_OPERATIONAL_GOAL } from "../services/kpiDashboardService";
import { shipmentSupabaseRepository } from "../infrastructure/supabase/repositories/shipmentSupabaseRepository";
import { DEFAULT_OPERATIONAL_UNIT } from "../constants/operationalUnits";
import { classifyOperationalFlow } from "../services/operationalFlowClassifier";
import { DashboardPeriodPreset, resolvePeriodDates, formatDateToLocalString } from "../constants/dashboardPeriods";


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

  // Period Selection State
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>("TODAY");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const periodDates = useMemo(() => resolvePeriodDates(periodPreset, customStart, customEnd), [periodPreset, customStart, customEnd]);


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
              status: s.delivery_date ? "Entregue" : ((s.status as any) || "Pendente"),
              remetente: s.sender_name || undefined,
              pagador: s.payer_name || undefined,
              data_ocorrencia: dataOcorrencia,
              prev_ent: s.forecast_delivery_date || undefined,
              valor: s.total_value || undefined,
              realDeliveryDate: s.delivery_date || s.raw_payload?.realDeliveryDate || undefined,
              isSubcontract: s.is_subcontract || s.raw_payload?.isSubcontract || false,
              originSeries: s.origin_series || s.raw_payload?.originSeries || "",
              countsForDeliveryPerformance: s.counts_for_performance ?? s.raw_payload?.countsForDeliveryPerformance ?? true,
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
    () => new Set(criticClients.map((c) => c.name.toUpperCase().trim())),
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
    return calculateKpiMetrics(
      activeCtrcs,
      criticNames,
      userUnit,
      periodPreset,
      customStart,
      customEnd
    );
  }, [activeCtrcs, criticNames, userUnit, periodPreset, customStart, customEnd]);

  const {
    executiveSummary,
    dailyPerformance,
    backlogDistribution,
    alerts,
    periodStart,
    periodEnd,
    operationalGoal
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
      {/* Header Controls */}
      <div className="flex flex-col gap-6 border-b border-[var(--router-border)] pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Visão consolidada da operação baseada no histórico de importação.{" "}
              <span className="text-[var(--router-primary)] font-medium">Subcontratos não compõem os KPIs operacionais.</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center bg-[var(--router-surface-2)] border border-[var(--router-border)] px-4 py-2 rounded-lg">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--router-text-muted)] mr-2">
                  Filial Analisada:
                </span>
                <span className="text-sm font-mono font-bold text-[var(--router-primary)] bg-[var(--router-primary)]/10 px-2 py-0.5 rounded shadow-sm">
                  {userUnit}
                </span>
              </div>
              <div className="flex items-center justify-center bg-[var(--router-surface-2)] border border-[var(--router-border)] px-4 py-2 rounded-lg">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--router-text-muted)] mr-2">
                  Meta Operacional:
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded shadow-sm">
                  {operationalGoal}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters/Period Selectors */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[var(--router-surface)] border border-[var(--router-border)] p-4 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-bold text-[var(--router-text-muted)] mr-2 uppercase tracking-wider">Período:</span>
            {(['TODAY', 'CURRENT_WEEK', 'CURRENT_MONTH', 'LAST_31_DAYS', 'CUSTOM'] as const).map((preset) => {
              const labels: Record<string, string> = {
                TODAY: 'Hoje',
                CURRENT_WEEK: 'Esta Semana',
                CURRENT_MONTH: 'Este Mês',
                LAST_31_DAYS: 'Últimos 31 Dias',
                CUSTOM: 'Personalizado',
              };
              const active = periodPreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setPeriodPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-[var(--router-surface-2)] text-[var(--router-text-muted)] border-[var(--router-border)] hover:bg-[var(--router-surface-3)]'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {periodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto text-[var(--router-text)]"
                />
                <span className="text-xs text-[var(--router-text-muted)]">a</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto text-[var(--router-text)]"
                />
              </div>
            )}
            <div className="text-xs font-mono font-medium text-[var(--router-text-muted)] bg-[var(--router-surface-2)] border border-[var(--router-border)] px-3 py-1.5 rounded-lg w-full lg:w-auto text-center flex items-center gap-2">
              <span>Período analisado: <span className="font-bold text-[var(--router-text)]">{periodStart}</span> até <span className="font-bold text-[var(--router-text)]">{periodEnd}</span></span>
              <span className="bg-[var(--router-primary)]/10 text-[var(--router-primary)] px-2 py-0.5 rounded font-bold">{dailyPerformance.length} dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--router-text-muted)] uppercase tracking-wider">Previstas</span>
            <span className="material-symbols-outlined text-[18px] text-blue-400">calendar_today</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold tracking-tight">
              {executiveSummary.previstas}
            </div>
            <p className="text-[10px] text-[var(--router-text-muted)] mt-1">Total de entregas previstas no período</p>
          </div>
        </div>

        <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--router-text-muted)] uppercase tracking-wider">No Prazo</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold tracking-tight">
              {executiveSummary.noPrazo}
            </div>
            <p className="text-[10px] text-[var(--router-text-muted)] mt-1">Entregas realizadas até a previsão</p>
          </div>
        </div>

        <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--router-text-muted)] uppercase tracking-wider">Atrasadas</span>
            <span className="material-symbols-outlined text-[18px] text-red-500">warning</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-bold tracking-tight">
              {executiveSummary.atrasadas}
            </div>
            <p className="text-[10px] text-[var(--router-text-muted)] mt-1">Entregues fora do prazo ou vencidas</p>
          </div>
        </div>

        <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--router-text-muted)] uppercase tracking-wider">Performance %</span>
            <span className="material-symbols-outlined text-[18px] text-purple-400">speed</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-3xl font-mono font-bold tracking-tight">
                {executiveSummary.performance.toFixed(2)}%
              </div>
              <p className="text-[10px] text-[var(--router-text-muted)] mt-1">
                Meta: {operationalGoal}%
              </p>
            </div>
            <div className="relative w-12 h-12 flex shrink-0 items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[var(--router-surface-3)]"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    executiveSummary.performance >= operationalGoal
                      ? "text-emerald-400"
                      : executiveSummary.performance >= operationalGoal - 5
                        ? "text-amber-400"
                        : "text-red-500"
                  }
                  strokeWidth="4"
                  strokeDasharray={`${executiveSummary.performance}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Daily Evolution and Backlog */}
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--router-text)] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  trending_up
                </span>
                EVOLUÇÃO DIÁRIA DO PERÍODO
              </h2>
              <span className="text-[10px] font-mono text-[var(--router-text-muted)] uppercase">
                Base: Previstas para o dia
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--router-border)] text-[10px] text-[var(--router-text-muted)] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3 text-right">Previstas</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">No Prazo</th>
                    <th className="py-2.5 px-3 text-right text-red-400">Atrasadas</th>
                    <th className="py-2.5 px-3 text-right">Performance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--router-border)] font-mono text-xs">
                  {dailyPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--router-text-muted)] font-sans">
                        Nenhum dado para exibir no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    dailyPerformance.map((day) => (
                      <tr key={day.date} className="hover:bg-[var(--router-surface-2)] transition-colors">
                        <td className="py-2.5 px-3 font-sans text-[var(--router-text-muted)] font-medium">{day.date}</td>
                        <td className="py-2.5 px-3 text-right font-bold">{day.previstas}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">{day.noPrazo}</td>
                        <td className="py-2.5 px-3 text-right text-red-400">{day.atrasadas}</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {day.previstas > 0 ? (
                            <span className={day.performance >= operationalGoal ? "text-emerald-400" : day.performance >= operationalGoal - 5 ? "text-amber-400" : "text-red-500"}>
                              {day.performance.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[var(--router-text-muted)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {dailyPerformance.length > 0 && (
                  <tfoot>
                    <tr className="bg-[var(--router-surface-2)] border-t-2 border-[var(--router-border)] font-bold text-xs">
                      <td className="py-3 px-3 font-sans text-[var(--router-text)]">Consolidado ({dailyPerformance.length} dias)</td>
                      <td className="py-3 px-3 text-right text-[var(--router-text)]">{executiveSummary.previstas}</td>
                      <td className="py-3 px-3 text-right text-emerald-400">{executiveSummary.noPrazo}</td>
                      <td className="py-3 px-3 text-right text-red-500">{executiveSummary.atrasadas}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={executiveSummary.performance >= operationalGoal ? "text-emerald-400" : executiveSummary.performance >= operationalGoal - 5 ? "text-amber-400" : "text-red-500"}>
                          {executiveSummary.performance.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <section className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[var(--router-text)] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  inventory_2
                </span>
                BACKLOG OPERACIONAL
              </h2>
              <span className="text-[10px] font-mono text-[var(--router-text-muted)] uppercase">
                CTRCs Pendentes (Total: {backlogDistribution.total})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Acima de 15 Dias</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.acima15Dias}</p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Até 15 Dias</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.ate15Dias}</p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Até 7 Dias</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.ate7Dias}</p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Até 2 Dias</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.ate2Dias}</p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Dentro do Prazo</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.dentroDoPrazo}</p>
              </div>
              <div className="bg-[var(--router-surface-2)] p-4 rounded-lg border border-[var(--router-border)] text-center">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Futuro</p>
                <p className="text-2xl font-mono font-bold text-[var(--router-text)]">{backlogDistribution.futuro}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Operational Alerts */}
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
                className="bg-[var(--router-surface-2)] p-3 rounded-lg border-l-4 border-l-amber-500 border border-y-[var(--router-border)] border-r-[var(--router-border)] hover:bg-[var(--router-surface-3)] cursor-pointer transition-colors"
                onClick={() => onNavigateToView("roteirizacao")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Curva A Pendentes
                  </span>
                  <span className="bg-amber-500/10 text-amber-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.curvaAPendentes}
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
                    Clientes Críticos Pendentes
                  </span>
                  <span className="bg-red-500/10 text-red-500 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {alerts.clientesCriticosPendentes}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Atenção máxima em entregas que impactam nível de serviço.
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
                    {alerts.vencidos}
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
                    {alerts.recebidosNoDiaDoPrazo}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--router-text-muted)]">
                  Recebidos no último dia do SLA. Expedição urgente necessária.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
