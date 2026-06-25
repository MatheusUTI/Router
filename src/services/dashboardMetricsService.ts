import { Ctrc } from "../types";

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

export interface DashboardMetrics {
  operationToday: {
    predicted: number;
    routed: number;
    delivered: number;
    pending: number;
    overdue: number;
  };
  last31Days: {
    emitted: number;
    delivered: number;
    notDelivered: number;
  };
  slaReceipt: {
    onTime: number;
    late: number;
    slaPercentage: number;
  };
  slaDelivery: {
    onTime: number;
    late: number;
    slaPercentage: number;
  };
  backlog: {
    pendingOnTime: number;
    pendingOverdue: number;
    notDelivered: number;
  };
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
  options?: { userUnit?: string },
): DashboardMetrics {
  const today = startOfDay(new Date());

  const metrics: DashboardMetrics = {
    operationToday: {
      predicted: 0,
      routed: 0,
      delivered: 0,
      pending: 0,
      overdue: 0,
    },
    last31Days: { emitted: 0, delivered: 0, notDelivered: 0 },
    slaReceipt: { onTime: 0, late: 0, slaPercentage: 0 },
    slaDelivery: { onTime: 0, late: 0, slaPercentage: 0 },
    backlog: { pendingOnTime: 0, pendingOverdue: 0, notDelivered: 0 },
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

    // Basic date parsing
    const prevEntDate = parseDate(ctrc.prev_ent);
    const isDelivered = ctrc.status === "Entregue" || ctrc.ocorrencia === "01";

    // DataChegadaUnidade: fallback to planningDate, data_ocorr, or today if missing
    let dataChegadaUnidade =
      parseDate(ctrc.planningDate) ||
      parseDate(ctrc.data_ocorr) ||
      parseDate(ctrc.data_ocorrencia) ||
      today;
    dataChegadaUnidade = startOfDay(dataChegadaUnidade);

    // DataEntrega: we assume data_ocorrencia/data_ocorr has it if delivered
    let dataEntrega = isDelivered
      ? parseDate(ctrc.data_ocorrencia) || parseDate(ctrc.data_ocorr) || today
      : null;
    if (dataEntrega) dataEntrega = startOfDay(dataEntrega);

    const prevEntStart = prevEntDate ? startOfDay(prevEntDate) : null;

    // --- Section 1: Operation Today ---
    // Predicted today: PrevisaoEntrega == Today
    if (prevEntStart && prevEntStart.getTime() === today.getTime()) {
      metrics.operationToday.predicted++;
    }
    // Routed today: has planningDate == Today and is in route or separated
    const planningStart = parseDate(ctrc.planningDate)
      ? startOfDay(parseDate(ctrc.planningDate)!)
      : null;
    if (planningStart && planningStart.getTime() === today.getTime()) {
      metrics.operationToday.routed++; // All planned today? Or only status == Em Rota? The requirement says "Roteirizados Hoje". We assume planningDate == today means it was routed today.
    }
    // Delivered today
    if (
      isDelivered &&
      dataEntrega &&
      dataEntrega.getTime() === today.getTime()
    ) {
      metrics.operationToday.delivered++;
    }
    // Pending today (in backlog for today)
    if (
      !isDelivered &&
      prevEntStart &&
      prevEntStart.getTime() === today.getTime()
    ) {
      metrics.operationToday.pending++;
    }
    // Overdue today (pending and prev_ent < today)
    if (
      !isDelivered &&
      prevEntStart &&
      prevEntStart.getTime() < today.getTime()
    ) {
      metrics.operationToday.overdue++;
    }

    // --- Section 2: Last 31 Days ---
    if (isDelivered) {
      metrics.last31Days.delivered++;
    } else {
      metrics.last31Days.notDelivered++;
    }

    // --- Section 3: SLA Receipt ---
    // Only calculate for TRANSFER_IN_DELIVERY, local deliveries are not penalized for receipt
    if (prevEntStart && isTransferIn) {
      // Received on time: DataChegadaUnidade < DataPrevisaoEntrega
      if (dataChegadaUnidade.getTime() < prevEntStart.getTime()) {
        metrics.slaReceipt.onTime++;
      } else {
        metrics.slaReceipt.late++;
        // Alert: Received on deadline day (DataChegadaUnidade == DataPrevisaoEntrega)
        if (dataChegadaUnidade.getTime() === prevEntStart.getTime()) {
          metrics.alerts.receivedOnDeadlineDay.push(ctrc);
        }
      }
    }

    // --- Section 4: SLA Delivery ---
    // Delivery SLA only applies to deliveries done by the user's unit
    if (isDelivered && prevEntStart && dataEntrega) {
      if (dataEntrega.getTime() <= prevEntStart.getTime()) {
        metrics.slaDelivery.onTime++;
      } else {
        metrics.slaDelivery.late++;
      }
    }

    // --- Section 5: Backlog ---
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
      // We assume isClienteCritico and CurvaA logic.
      // Curva A pending:
      if (ctrc.type === "CURVA A") {
        metrics.alerts.curvaAPending.push(ctrc);
      }

      // Critical pending
      const isCritical = criticClients.some(
        (c) =>
          ctrc.destinatario.toUpperCase().includes(c.toUpperCase()) ||
          (ctrc.remetente &&
            ctrc.remetente.toUpperCase().includes(c.toUpperCase())),
      );
      if (isCritical) {
        metrics.alerts.criticPending.push(ctrc);
      }
    }
  });

  metrics.last31Days.emitted = consideredCtrcs;

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
      (localDeliveryCount +
        transferInCount +
        transferOutCount +
        otherUnitCount),
  );
  console.log("Total considered in Dashboard KPIs:", consideredCtrcs);
  console.groupEnd();

  const totalReceipt = metrics.slaReceipt.onTime + metrics.slaReceipt.late;
  metrics.slaReceipt.slaPercentage =
    totalReceipt > 0 ? (metrics.slaReceipt.onTime / totalReceipt) * 100 : 0;

  const totalDelivery = metrics.slaDelivery.onTime + metrics.slaDelivery.late;
  metrics.slaDelivery.slaPercentage =
    totalDelivery > 0 ? (metrics.slaDelivery.onTime / totalDelivery) * 100 : 0;

  return metrics;
}
