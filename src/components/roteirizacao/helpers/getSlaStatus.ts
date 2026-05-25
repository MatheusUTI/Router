/**
 * Helper to calculate and style SLA status relative to June/May 25, 2026 (15:50 UTC context)
 */
export interface SlaStatus {
  label: string;
  bgClass: string;
  textClass: string;
  daysDiff: number;
  isToday: boolean;
  isDelayed: boolean;
  isTomorrow: boolean;
}

export function getSlaStatus(prevEnt: string | undefined, referenceDateStr = '2026-05-25'): SlaStatus {
  if (!prevEnt) {
    return {
      label: 'S/ PRAZO',
      bgClass: 'bg-slate-900 border-slate-800',
      textClass: 'text-slate-500',
      daysDiff: 99,
      isToday: false,
      isDelayed: false,
      isTomorrow: false
    };
  }

  // Parse DD/MM/AAAA or DD/MM
  const parts = prevEnt.split('/');
  if (parts.length < 2) {
    return {
      label: prevEnt,
      bgClass: 'bg-slate-900 border-slate-800',
      textClass: 'text-slate-300',
      daysDiff: 99,
      isToday: false,
      isDelayed: false,
      isTomorrow: false
    };
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parts.length >= 3 ? parseInt(parts[2], 10) : 2026;

  const itemDate = new Date(year, month, day);
  const refDate = new Date(referenceDateStr + 'T12:00:00'); // set intermediate hour to safe check timezone shifts

  // Calculate difference in days
  const diffTime = itemDate.getTime() - refDate.getTime();
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return {
      label: `ATRASADO (${Math.abs(daysDiff)}d)`,
      bgClass: 'bg-red-550/20 text-red-400 border border-red-500/35',
      textClass: 'font-bold text-[10px]',
      daysDiff,
      isToday: false,
      isDelayed: true,
      isTomorrow: false
    };
  }

  if (daysDiff === 0) {
    return {
      label: 'HOJE (D+0)',
      bgClass: 'bg-blue-500/10 text-blue-300 border border-blue-500/25',
      textClass: 'font-semibold text-[10px]',
      daysDiff,
      isToday: true,
      isDelayed: false,
      isTomorrow: false
    };
  }

  if (daysDiff === 1) {
    return {
      label: 'AMANHÃ (D+1)',
      bgClass: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
      textClass: 'font-semibold text-[10px]',
      daysDiff,
      isToday: false,
      isDelayed: false,
      isTomorrow: true
    };
  }

  // Future (D+2 or later)
  return {
    label: `D+${daysDiff} (${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')})`,
    bgClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    textClass: 'font-semibold text-[10px]',
    daysDiff,
    isToday: false,
    isDelayed: false,
    isTomorrow: false
  };
}
