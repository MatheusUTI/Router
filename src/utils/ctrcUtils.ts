export const SUBCONTRACT_SERIES = ['VGS', 'BHS', 'SPS'];

export function parseCtrcSeries(ctrcId: string): string {
  // VGA123456 -> VGA
  // VGS123456 -> VGS
  const match = ctrcId.match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : '';
}

export function getOriginUnitFromSeries(series: string): string {
  const map: Record<string, string> = {
    'VGS': 'VGA',
    'BHS': 'BHZ',
    'SPS': 'SPO'
  };
  return map[series] || series;
}

export function checkIsSubcontract(series: string): boolean {
  return SUBCONTRACT_SERIES.includes(series);
}
