import { VehicleGrRule } from '../types';

export function calculateSuggestedGrLimit(tipo: string, rastreado: boolean, rules?: VehicleGrRule[]): number {
  const normTipo = (tipo || 'PROPRIO').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents like Ó
  
  if (rules && rules.length > 0) {
    const matchingRule = rules.find(r => r.id.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normTipo || r.vehicleType.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normTipo);
    if (matchingRule) {
      if (!rastreado && matchingRule.requiresTrackingAboveValue) {
        // If not tracked and rule requires tracking above some value, suggest standard sem-rastreio limit (max 300k or maxValue)
        return Math.min(matchingRule.maxValueWithoutGr, 300000);
      }
      return matchingRule.maxValueWithoutGr;
    }
  }

  // Legacy fallback static rules
  const isProprio = normTipo === 'PROPRIO';
  if (isProprio && rastreado) return 500000;
  return 300000;
}

