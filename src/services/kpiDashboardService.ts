import { Ctrc, KpiDashboardMetrics, DailyPerformance, BacklogDistribution, ExecutiveSummary, KpiAlerts } from "../types";
import { resolvePeriodDates, getStartOfDay, getEndOfDay, formatDateToLocalString } from "../constants/dashboardPeriods";

export const DEFAULT_OPERATIONAL_GOAL = 95;

function parseDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr.trim() === "" || dateStr.toUpperCase().includes("SEM")) return null;
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  } else if (dateStr.includes("-")) {
    const d = new Date(dateStr + "T12:00:00Z");
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function startOfDay(d: Date): Date {
  const newDate = new Date(d.getTime());
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function calculateKpiMetrics(
  ctrcs: Ctrc[],
  criticNames: Set<string>,
  userUnit: string,
  periodPreset: any,
  customStart?: string,
  customEnd?: string
): KpiDashboardMetrics {
  const { startDate, endDate } = resolvePeriodDates(periodPreset, customStart, customEnd);
  const startObj = startOfDay(startDate);
  const endObj = startOfDay(endDate);
  const today = startOfDay(new Date());

  const dailyMap = new Map<string, DailyPerformance>();

  let current = new Date(startObj);
  while (current <= endObj) {
    const dateStr = formatDateToLocalString(current);
    dailyMap.set(dateStr, {
      date: dateStr,
      previstas: 0,
      entreguesNoPrazo: 0,
      entreguesForaDoPrazo: 0,
      pendentes: 0,
      performance: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  const executiveSummary: ExecutiveSummary = {
    previstas: 0,
    entregues: 0,
    pendentes: 0,
    atrasadas: 0,
  };

  const backlogDistribution: BacklogDistribution = {
    acima15Dias: 0,
    ate15Dias: 0,
    ate7Dias: 0,
    ate2Dias: 0,
    dentroDoPrazo: 0,
    futuro: 0,
    total: 0,
  };

  const alerts: KpiAlerts = {
    curvaAPendentes: 0,
    clientesCriticosPendentes: 0,
    vencidos: 0,
    recebidosNoDiaDoPrazo: 0,
    entregasPrevistasHojeNaoRoteirizadas: 0,
  };

  let excludedSubcontracts = 0;
  
  let totalEntreguesNoPrazo = 0;
  let totalPendentesDentroDoPrazo = 0;
  let totalPendentesAtrasados = 0;
  let totalEntreguesForaDoPrazo = 0;

  for (const ctrc of ctrcs) {
    const destUnit = ctrc.destinationUnit || ctrc.unid || ctrc.setor;
    const isTargetUnit = destUnit && destUnit.toUpperCase() === userUnit.toUpperCase();
    
    // We only process if it's for user's unit
    if (!isTargetUnit) continue;

    if (ctrc.countsForDeliveryPerformance === false) {
      excludedSubcontracts++;
      continue;
    }

    const forecastDeliveryDate = parseDate(ctrc.forecastDeliveryDate) || parseDate(ctrc.prev_ent);
    if (!forecastDeliveryDate) continue; // If no forecast date, cannot be used for the base
    const forecastStart = startOfDay(forecastDeliveryDate);

    // Determine if delivered based on the rule
    const isDelivered = !!(ctrc.realDeliveryDate || ctrc.dataEntregaRealizada || ctrc.deliveryDate || ctrc.delivery_date);
    
    let realDeliveryStart: Date | null = null;
    if (isDelivered) {
      const realDel = parseDate(ctrc.realDeliveryDate) || parseDate(ctrc.dataEntregaRealizada) || parseDate(ctrc.deliveryDate) || parseDate(ctrc.delivery_date) || parseDate(ctrc.data_ocorrencia) || parseDate(ctrc.data_ocorr) || today;
      if (realDel) realDeliveryStart = startOfDay(realDel);
    }

    // Classifications
    const isEntregueNoPrazo = isDelivered && realDeliveryStart! <= forecastStart;
    const isEntregueForaDoPrazo = isDelivered && realDeliveryStart! > forecastStart;
    const isPendenteDentroDoPrazo = !isDelivered && forecastStart >= today;
    const isPendenteAtrasado = !isDelivered && forecastStart < today;

    // ----------------------------
    // 1. Performance KPIs (Filtered by period)
    // ----------------------------
    const isWithinPeriod = forecastStart >= startObj && forecastStart <= endObj;
    
    if (isWithinPeriod) {
      const dateStr = formatDateToLocalString(forecastStart);
      const dayData = dailyMap.get(dateStr);

      if (dayData) {
        dayData.previstas++;
        if (isEntregueNoPrazo) dayData.entreguesNoPrazo++;
        if (isEntregueForaDoPrazo) dayData.entreguesForaDoPrazo++;
        if (isPendenteDentroDoPrazo || isPendenteAtrasado) dayData.pendentes++;
      }

      executiveSummary.previstas++;
      if (isDelivered) executiveSummary.entregues++;
      if (!isDelivered) executiveSummary.pendentes++;
      if (isPendenteAtrasado) executiveSummary.atrasadas++;

      if (isEntregueNoPrazo) totalEntreguesNoPrazo++;
      if (isPendenteDentroDoPrazo) totalPendentesDentroDoPrazo++;
      if (isPendenteAtrasado) totalPendentesAtrasados++;
      if (isEntregueForaDoPrazo) totalEntreguesForaDoPrazo++;
    }

    // ----------------------------
    // 2. Backlog (All pending CTRCs)
    // ----------------------------
    if (!isDelivered) {
      backlogDistribution.total++;
      
      const timeDiff = today.getTime() - forecastStart.getTime();
      const diasAtraso = Math.floor(timeDiff / (1000 * 3600 * 24));

      if (diasAtraso > 15) {
        backlogDistribution.acima15Dias++;
      } else if (diasAtraso >= 8 && diasAtraso <= 15) {
        backlogDistribution.ate15Dias++;
      } else if (diasAtraso >= 3 && diasAtraso <= 7) {
        backlogDistribution.ate7Dias++;
      } else if (diasAtraso >= 1 && diasAtraso <= 2) {
        backlogDistribution.ate2Dias++;
      } else if (forecastStart.getTime() === today.getTime()) {
        backlogDistribution.dentroDoPrazo++;
      } else if (forecastStart > today) {
        backlogDistribution.futuro++;
      }

      // Alerts
      if (ctrc.type === "CURVA A") alerts.curvaAPendentes++;
      if (
        (ctrc.remetente && criticNames.has(ctrc.remetente.toUpperCase().trim())) ||
        (ctrc.destinatario && criticNames.has(ctrc.destinatario.toUpperCase().trim())) ||
        (ctrc.pagador && criticNames.has(ctrc.pagador.toUpperCase().trim()))
      ) {
        alerts.clientesCriticosPendentes++;
      }
      if (forecastStart.getTime() === today.getTime()) alerts.vencidos++;
      
      // Entregas previstas para hoje ainda não roteirizadas
      // A CTRC is active for routing if it hasn't been routed yet.
      if (forecastStart.getTime() === today.getTime() && ctrc.isActiveForRouting === true) {
        alerts.entregasPrevistasHojeNaoRoteirizadas++;
      }
    }
    
    // SLA Recebimento / Recebidos no dia do prazo
    if (ctrc.flowType === 'TRANSFER_IN_DELIVERY') {
      const lastOccurrenceDate = parseDate(ctrc.lastOccurrenceDate) || parseDate(ctrc.data_ocorrencia) || parseDate(ctrc.data_ocorr);
      if (lastOccurrenceDate) {
        const occStart = startOfDay(lastOccurrenceDate);
        if (occStart.getTime() === forecastStart.getTime()) {
          alerts.recebidosNoDiaDoPrazo++;
        }
      }
    }
  }

  // Calculate Operational Projection
  const currentPerformance = executiveSummary.previstas > 0 ? (totalEntreguesNoPrazo / executiveSummary.previstas) * 100 : 0;
  const projectedPerformance = executiveSummary.previstas > 0 ? ((totalEntreguesNoPrazo + totalPendentesDentroDoPrazo) / executiveSummary.previstas) * 100 : 0;
  const goalGap = projectedPerformance - DEFAULT_OPERATIONAL_GOAL;
  
  // deliveriesNeededForGoal: How many deliveries in total are needed to reach the goal
  const deliveriesNeededTotal = Math.ceil((DEFAULT_OPERATIONAL_GOAL / 100) * executiveSummary.previstas);
  const deliveriesNeededForGoal = Math.max(0, deliveriesNeededTotal - totalEntreguesNoPrazo);

  const operationalProjection = {
    currentPerformance,
    projectedPerformance,
    goalGap,
    deliveriesNeededForGoal,
    riskCtrcs: totalPendentesAtrasados,
  };

  const dailyPerformance = Array.from(dailyMap.values()).map(day => {
    if (day.previstas > 0) {
      day.performance = (day.entreguesNoPrazo / day.previstas) * 100;
    }
    return day;
  });

  // Sort daily
  dailyPerformance.sort((a, b) => new Date(a.date.split("/").reverse().join("-")).getTime() - new Date(b.date.split("/").reverse().join("-")).getTime());

  console.group('[Predictive KPI Debug]');
  console.log('Previstas:', executiveSummary.previstas);
  console.log('Entregues no Prazo:', totalEntreguesNoPrazo);
  console.log('Entregues Fora do Prazo:', totalEntreguesForaDoPrazo);
  console.log('Pendentes:', executiveSummary.pendentes);
  console.log('Pendentes Atrasados:', totalPendentesAtrasados);
  console.log('Performance Atual:', currentPerformance.toFixed(2) + '%');
  console.log('Performance Projetada:', projectedPerformance.toFixed(2) + '%');
  console.log('Gap da Meta:', goalGap.toFixed(2) + '%');
  console.log('CTRCs em Risco:', operationalProjection.riskCtrcs);
  console.groupEnd();

  return {
    executiveSummary,
    operationalProjection,
    dailyPerformance,
    backlogDistribution,
    alerts,
    periodStart: formatDateToLocalString(startObj),
    periodEnd: formatDateToLocalString(endObj),
    operationalGoal: DEFAULT_OPERATIONAL_GOAL
  };
}
