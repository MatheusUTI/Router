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
      noPrazo: 0,
      atrasadas: 0,
      performance: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  const executiveSummary: ExecutiveSummary = {
    previstas: 0,
    noPrazo: 0,
    atrasadas: 0,
    performance: 0,
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
  };

  let excludedSubcontracts = 0;

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

    // ----------------------------
    // 1. Performance KPIs (Filtered by period)
    // ----------------------------
    const isWithinPeriod = forecastStart >= startObj && forecastStart <= endObj;
    
    if (isWithinPeriod) {
      const dateStr = formatDateToLocalString(forecastStart);
      const dayData = dailyMap.get(dateStr);
      
      let wasOnTime = false;
      let wasOverdue = false;

      if (isDelivered && realDeliveryStart) {
        if (realDeliveryStart <= forecastStart) {
          wasOnTime = true;
        } else {
          wasOverdue = true;
        }
      } else {
        if (forecastStart < today) {
          wasOverdue = true;
        }
      }

      if (dayData) {
        dayData.previstas++;
        if (wasOnTime) dayData.noPrazo++;
        if (wasOverdue) dayData.atrasadas++;
      }

      executiveSummary.previstas++;
      if (wasOnTime) executiveSummary.noPrazo++;
      if (wasOverdue) executiveSummary.atrasadas++;
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
      } else if (diasAtraso > 7 && diasAtraso <= 15) {
        backlogDistribution.ate15Dias++;
      } else if (diasAtraso > 2 && diasAtraso <= 7) {
        backlogDistribution.ate7Dias++;
      } else if (diasAtraso > 0 && diasAtraso <= 2) {
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
      if (forecastStart < today) alerts.vencidos++;
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

  // Calculate percentages
  if (executiveSummary.previstas > 0) {
    executiveSummary.performance = (executiveSummary.noPrazo / executiveSummary.previstas) * 100;
  }

  const dailyPerformance = Array.from(dailyMap.values()).map(day => {
    if (day.previstas > 0) {
      day.performance = (day.noPrazo / day.previstas) * 100;
    }
    return day;
  });

  // Sort daily
  dailyPerformance.sort((a, b) => new Date(a.date.split("/").reverse().join("-")).getTime() - new Date(b.date.split("/").reverse().join("-")).getTime());

  console.group('[KPI Dashboard Debug]');
  console.log('Filial:', userUnit);
  console.log('Período:', formatDateToLocalString(startObj), 'até', formatDateToLocalString(endObj));
  console.log('Previstas:', executiveSummary.previstas);
  console.log('No Prazo:', executiveSummary.noPrazo);
  console.log('Atrasadas:', executiveSummary.atrasadas);
  console.log('Performance:', executiveSummary.performance.toFixed(2) + '%');
  console.log('Backlog:', backlogDistribution.total);
  console.log('Subcontratos Excluídos:', excludedSubcontracts);
  console.groupEnd();

  return {
    executiveSummary,
    dailyPerformance,
    backlogDistribution,
    alerts,
    periodStart: formatDateToLocalString(startObj),
    periodEnd: formatDateToLocalString(endObj),
    operationalGoal: DEFAULT_OPERATIONAL_GOAL
  };
}
