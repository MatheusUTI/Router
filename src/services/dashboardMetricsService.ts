import { Ctrc } from "../types";
import { getStartOfDay, getEndOfDay, formatDateToLocalString } from "../constants/dashboardPeriods";

// Helper to parse DD/MM/YYYY or YYYY-MM-DD to Date object
function parseDate(dateStr?: string): Date | null {
  if (
    !dateStr ||
    dateStr.trim() === "" ||
    dateStr.toUpperCase().includes("SEM")
  )
    return null;

  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY
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

// Get start of day to compare dates without time
function startOfDay(d: Date): Date {
  const newDate = new Date(d.getTime());
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export interface DailyDeliveryPerformance {
  date: string;
  dateObj: Date;
  predicted: number;
  delivered: number;
  onTime: number;
  late: number;
  slaPercent: number | null;
}

export interface DashboardMetrics {
  periodPredicted: {
    total: number;
    delivered: number;
    pendingOnTime: number;
    pendingOverdue: number;
  };
  periodDelivered: {
    total: number;
    onTime: number;
    late: number;
    slaPercentage: number;
  };
  slaReceipt: {
    total: number;
    onTime: number;
    late: number;
    slaPercentage: number;
  };
  backlog: {
    pendingOnTime: number;
    pendingOverdue: number;
    notDelivered: number;
  };
  dailyEvolution: DailyDeliveryPerformance[];
  alerts: {
    criticPending: Ctrc[];
    curvaAPending: Ctrc[];
    overdue: Ctrc[];
    receivedOnDeadlineDay: Ctrc[];
  };
}

export function calculateDashboardMetrics(
  ctrcs: Ctrc[],
  criticClients: string[] = [],
  options?: { userUnit?: string; startDate?: Date; endDate?: Date },
): DashboardMetrics {
  const today = startOfDay(new Date());

  const startDateStr = options?.startDate ? options.startDate.toISOString() : getStartOfDay(new Date()).toISOString();
  const endDateStr = options?.endDate ? options.endDate.toISOString() : getEndOfDay(new Date()).toISOString();
  
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const metrics: DashboardMetrics = {
    periodPredicted: { total: 0, delivered: 0, pendingOnTime: 0, pendingOverdue: 0 },
    periodDelivered: { total: 0, onTime: 0, late: 0, slaPercentage: 0 },
    slaReceipt: { total: 0, onTime: 0, late: 0, slaPercentage: 0 },
    backlog: { pendingOnTime: 0, pendingOverdue: 0, notDelivered: 0 },
    dailyEvolution: [],
    alerts: {
      criticPending: [],
      curvaAPending: [],
      overdue: [],
      receivedOnDeadlineDay: [],
    },
  };

  const userUnit = options?.userUnit;

  let consideredCtrcs = 0;
  let localDeliveryCount = 0;
  let transferInCount = 0;
  let transferOutCount = 0;
  let otherUnitCount = 0;

  const dailyMap = new Map<string, DailyDeliveryPerformance>();
  
  let debugTotalBaseFilial = 0;
  let debugTotalWithRealDeliveryDate = 0;
  let debugTotalWithoutRealDeliveryDate = 0;
  let debugTotalConsideredDelivered = 0;
  let debugTotalPending = 0;

  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDateToLocalString(current);
    dailyMap.set(dateStr, {
      date: dateStr,
      dateObj: new Date(current),
      predicted: 0,
      delivered: 0,
      onTime: 0,
      late: 0,
      slaPercent: null,
    });
    current.setDate(current.getDate() + 1);
  }

  ctrcs.forEach((ctrc) => {
    // Flow analysis
    const isLocalDelivery = ctrc.flowType === "LOCAL_DELIVERY";
    const isTransferIn = ctrc.flowType === "TRANSFER_IN_DELIVERY";
    const isTransferOut = ctrc.flowType === "TRANSFER_OUT";
    const isOtherUnit = ctrc.flowType === "OTHER_UNIT";

    if (isLocalDelivery) localDeliveryCount++;
    if (isTransferIn) transferInCount++;
    if (isTransferOut) transferOutCount++;
    if (isOtherUnit) otherUnitCount++;

    // Only consider CTRCs destined to the user's unit for main KPIs
    // If we don't have userUnit or flowType is missing/UNKNOWN, we include it as a fallback
    const isDestinedToUser =
      !userUnit ||
      isLocalDelivery ||
      isTransferIn ||
      ctrc.flowType === "UNKNOWN" ||
      !ctrc.flowType;

    if (!isDestinedToUser) {
      return; // Skip TRANSFER_OUT and OTHER_UNIT from main KPIs
    }

    consideredCtrcs++;

    const prevEntDate = parseDate(ctrc.prev_ent) || parseDate(ctrc.forecastDeliveryDate);
    const prevEntStart = prevEntDate ? startOfDay(prevEntDate) : null;
    
    // Rule: Delivered only if realDeliveryDate or equivalent is present
    const isDelivered = !!(ctrc.realDeliveryDate || ctrc.dataEntregaRealizada || ctrc.deliveryDate || ctrc.delivery_date);

    // Update debug counters
    debugTotalBaseFilial++;
    if (isDelivered) {
      debugTotalWithRealDeliveryDate++;
      debugTotalConsideredDelivered++;
    } else {
      debugTotalWithoutRealDeliveryDate++;
      debugTotalPending++;
    }

    let dataEntrega = isDelivered
      ? parseDate(ctrc.realDeliveryDate) || parseDate(ctrc.dataEntregaRealizada) || parseDate(ctrc.deliveryDate) || parseDate(ctrc.delivery_date) || parseDate(ctrc.data_ocorrencia) || parseDate(ctrc.data_ocorr) || today
      : null;
    if (dataEntrega) dataEntrega = startOfDay(dataEntrega);

    let dataUltimaOcorrencia = parseDate(ctrc.lastOccurrenceDate) || parseDate(ctrc.data_ocorrencia) || parseDate(ctrc.data_ocorr) || today;
    dataUltimaOcorrencia = startOfDay(dataUltimaOcorrencia);

    // --- KPI 1: Predicted Portfolio ---
    if (prevEntStart && prevEntStart >= startDate && prevEntStart <= endDate) {
      metrics.periodPredicted.total++;
      if (isDelivered) {
        metrics.periodPredicted.delivered++;
      } else {
        if (prevEntStart.getTime() >= today.getTime()) {
          metrics.periodPredicted.pendingOnTime++;
        } else {
          metrics.periodPredicted.pendingOverdue++;
        }
      }
      
      const pDateStr = formatDateToLocalString(prevEntStart);
      if (dailyMap.has(pDateStr)) {
        dailyMap.get(pDateStr)!.predicted++;
      }
    }

    // --- KPI 2: Delivered in the period ---
    if (isDelivered && dataEntrega && dataEntrega >= startDate && dataEntrega <= endDate) {
      metrics.periodDelivered.total++;
      
      const dDateStr = formatDateToLocalString(dataEntrega);
      if (dailyMap.has(dDateStr)) {
        dailyMap.get(dDateStr)!.delivered++;
      }

      if (prevEntStart) {
        if (dataEntrega.getTime() <= prevEntStart.getTime()) {
          metrics.periodDelivered.onTime++;
          if (dailyMap.has(dDateStr)) dailyMap.get(dDateStr)!.onTime++;
        } else {
          metrics.periodDelivered.late++;
          if (dailyMap.has(dDateStr)) dailyMap.get(dDateStr)!.late++;
        }
      }
    }

    // --- KPI 3: Operational Receipt SLA ---
    if (isTransferIn && dataUltimaOcorrencia >= startDate && dataUltimaOcorrencia <= endDate) {
       metrics.slaReceipt.total++;
       if (prevEntStart) {
         if (dataUltimaOcorrencia.getTime() < prevEntStart.getTime()) {
           metrics.slaReceipt.onTime++;
         } else {
           metrics.slaReceipt.late++;
           if (dataUltimaOcorrencia.getTime() === prevEntStart.getTime()) {
             metrics.alerts.receivedOnDeadlineDay.push(ctrc);
           }
         }
       }
    }

    // --- KPI 4: Current Backlog (Snapshot) ---
    if (!isDelivered) {
      metrics.backlog.notDelivered++;
      if (prevEntStart) {
        if (prevEntStart.getTime() >= today.getTime()) {
          metrics.backlog.pendingOnTime++;
        } else {
          metrics.backlog.pendingOverdue++;
          metrics.alerts.overdue.push(ctrc);
        }
      }

      // Alerts
      if (ctrc.type === "CURVA A") {
        metrics.alerts.curvaAPending.push(ctrc);
      }
      if (
        ctrc.remetente &&
        criticClients.some((c) =>
          ctrc.remetente?.toLowerCase().includes(c.toLowerCase()),
        )
      ) {
        metrics.alerts.criticPending.push(ctrc);
      }
    }
  });

  metrics.periodDelivered.slaPercentage = metrics.periodDelivered.total > 0 
    ? (metrics.periodDelivered.onTime / metrics.periodDelivered.total) * 100 
    : 0;

  metrics.slaReceipt.slaPercentage = metrics.slaReceipt.total > 0 
    ? (metrics.slaReceipt.onTime / metrics.slaReceipt.total) * 100 
    : 0;

  metrics.dailyEvolution = Array.from(dailyMap.values()).map(d => {
    d.slaPercent = d.delivered > 0 ? (d.onTime / d.delivered) * 100 : null;
    return d;
  }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  console.group("[Dashboard Flow Debug]");
  console.log("User Unit:", userUnit || "Not provided");
  console.log("Total CTRCs before filter:", ctrcs.length);
  console.log("Total LOCAL_DELIVERY:", localDeliveryCount);
  console.log("Total TRANSFER_IN_DELIVERY:", transferInCount);
  console.log("Total TRANSFER_OUT:", transferOutCount);
  console.log("Total OTHER_UNIT:", otherUnitCount);
  console.log(
    "Total UNKNOWN:",
    ctrcs.length -
      (localDeliveryCount + transferInCount + transferOutCount + otherUnitCount),
  );
  console.log("Total considered in Dashboard KPIs:", consideredCtrcs);
  console.log("Period:", startDateStr, "to", endDateStr);
  console.groupEnd();

  console.group('[Dashboard Delivery Date Debug]');
  console.log('Total base da filial:', debugTotalBaseFilial);
  console.log('Total com realDeliveryDate:', debugTotalWithRealDeliveryDate);
  console.log('Total SEM realDeliveryDate:', debugTotalWithoutRealDeliveryDate);
  console.log('Total considerados entregues:', debugTotalConsideredDelivered);
  console.log('Total pendentes:', debugTotalPending);
  console.groupEnd();

  return metrics;
}
