import { Ctrc } from "../types";
import { DEFAULT_OPERATIONAL_UNIT } from "../constants/operationalUnits";

/**
 * Normalizes the operational unit alias to its standard form.
 * E.g. VGS -> VGA, VAG -> VGA, BHS -> BHZ
 */
export function normalizeOperationalUnit(value: string | undefined): string {
  if (!value) return "";
  const clean = String(value).toUpperCase().substring(0, 3);

  // Aliases
  if (clean === "VGS" || clean === "VAG") return "VGA";
  if (clean === "BHS") return "BHZ";

  return clean;
}

/**
 * Extracts the origin unit from the CTRC ID or 'Serie/Numero CTRC' column.
 */
export function extractOriginUnitFromCtrc(ctrcId: string | undefined): string {
  if (!ctrcId) return "";
  // Usually the ID contains letters at the beginning like VGA123456
  const match = ctrcId.match(/^[A-Z]+/i);
  if (match) {
    return normalizeOperationalUnit(match[0]);
  }
  return "";
}

/**
 * Extracts the destination unit from 'Praca de Destino' or other fallback field.
 */
export function extractDestinationUnitFromCtrc(
  pracaDestino: string | undefined,
): string {
  return normalizeOperationalUnit(pracaDestino);
}

/**
 * Parses a date string safely to a JS Date.
 */
export function parseDateSafe(dateStr: string | undefined): Date | null {
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
    const parts = dateStr.split(" ")[0].split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const d = new Date(`${year}-${month}-${day}T12:00:00Z`);
      if (!isNaN(d.getTime())) return d;
    }
  } else if (dateStr.includes("-")) {
    const d = new Date(dateStr.split(" ")[0] + "T12:00:00Z");
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Classifies a CTRC based on its origin, destination, and the user's unit.
 * Populates flow-related fields in the CTRC object.
 */
export function classifyOperationalFlow(ctrc: Ctrc, userUnit: string): Ctrc {
  const normUserUnit =
    normalizeOperationalUnit(userUnit) || DEFAULT_OPERATIONAL_UNIT;

  // Extract or use existing
  const origin = ctrc.originUnit || extractOriginUnitFromCtrc(ctrc.id);
  const dest =
    ctrc.destinationUnit ||
    extractDestinationUnitFromCtrc(ctrc.pracaDestino || ctrc.localizacao); // fallback to localizacao if pracaDestino not set

  ctrc.originUnit = origin;
  ctrc.destinationUnit = dest;

  if (!origin || !dest) {
    ctrc.flowType = "UNKNOWN";
    return ctrc;
  }

  const isOriginSame = origin === normUserUnit;
  const isDestSame = dest === normUserUnit;

  if (isOriginSame && isDestSame) {
    ctrc.flowType = "LOCAL_DELIVERY";
    ctrc.isLocalDelivery = true;
    ctrc.isTransferOut = false;
    ctrc.isTransferIn = false;
  } else if (isOriginSame && !isDestSame) {
    ctrc.flowType = "TRANSFER_OUT";
    ctrc.isLocalDelivery = false;
    ctrc.isTransferOut = true;
    ctrc.isTransferIn = false;
  } else if (!isOriginSame && isDestSame) {
    ctrc.flowType = "TRANSFER_IN_DELIVERY";
    ctrc.isLocalDelivery = false;
    ctrc.isTransferOut = false;
    ctrc.isTransferIn = true;
  } else {
    ctrc.flowType = "OTHER_UNIT";
    ctrc.isLocalDelivery = false;
    ctrc.isTransferOut = false;
    ctrc.isTransferIn = false;
  }

  ctrc.isDeliveryForUserUnit = isDestSame;

  ctrc.lastOccurrenceDate = ctrc.data_ocorrencia || ctrc.data_ocorr;
  ctrc.forecastDeliveryDate = ctrc.prev_ent;
  ctrc.realDeliveryDate = undefined; // Set based on rules if delivered, need more info if delivered date exists

  return ctrc;
}
