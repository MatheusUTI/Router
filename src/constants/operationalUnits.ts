import { OperationalUnit } from '../types';

export const DEFAULT_OPERATIONAL_UNIT = 'VGA';

const DEFAULT_UNITS: OperationalUnit[] = [
  { code: 'VGA', name: 'VGA - Varginha', active: true, createdAt: new Date().toISOString() },
  { code: 'SPO', name: 'SPO - São Paulo / Matriz', active: true, createdAt: new Date().toISOString() },
  { code: 'BHS', name: 'BHS - Belo Horizonte / Central', active: true, createdAt: new Date().toISOString() },
  { code: 'RIO', name: 'RIO - Rio de Janeiro / Sudeste', active: true, createdAt: new Date().toISOString() },
  { code: 'CWB', name: 'CWB - Curitiba / Sul', active: true, createdAt: new Date().toISOString() }
];

export function getOperationalUnits(): OperationalUnit[] {
  if (typeof window === 'undefined') return DEFAULT_UNITS;
  const stored = localStorage.getItem('custom_operational_units');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_UNITS;
    }
  }
  // Initialize
  localStorage.setItem('custom_operational_units', JSON.stringify(DEFAULT_UNITS));
  return DEFAULT_UNITS;
}

export function saveOperationalUnits(units: OperationalUnit[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_operational_units', JSON.stringify(units));
    window.dispatchEvent(new Event('operational_units_changed'));
  }
}

export const OPERATIONAL_UNITS = DEFAULT_UNITS;

