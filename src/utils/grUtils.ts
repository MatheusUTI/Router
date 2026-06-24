export function calculateSuggestedGrLimit(tipo: string, rastreado: boolean): number {
  const isProprio = tipo === 'PROPRIO' || tipo === 'PRÓPRIO';
  if (isProprio && rastreado) return 500000;
  return 300000;
}
