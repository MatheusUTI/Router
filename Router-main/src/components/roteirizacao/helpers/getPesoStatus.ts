/**
 * Helper to determine weight formatting classes and categories
 */
export interface PesoStatus {
  textClass: string;
  badgeClass: string;
  category: 'LEVE' | 'MÉDIO' | 'PESADO' | 'CRÍTICO';
  label: string;
}

export function getPesoStatus(weight: number): PesoStatus {
  if (weight < 300) {
    return {
      textClass: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9.5px]',
      category: 'LEVE',
      label: `${weight} kg`
    };
  }
  if (weight <= 600) {
    return {
      textClass: 'text-yellow-400',
      badgeClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9.5px]',
      category: 'MÉDIO',
      label: `${weight} kg`
    };
  }
  if (weight <= 1500) {
    return {
      textClass: 'text-orange-400',
      badgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9.5px]',
      category: 'PESADO',
      label: `${weight} kg`
    };
  }
  return {
    textClass: 'text-red-400 font-bold',
    badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/25 font-bold text-[9.5px]',
    category: 'CRÍTICO',
    label: `${weight} kg`
  };
}
