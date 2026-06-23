export function calculateSuggestedGrLimit(tipo: 'PROPRIO' | 'AGREGADO' | 'APOIO', rastreado: boolean): number {
  if (tipo === 'PROPRIO' && rastreado) return 500000;
  return 300000;
}
