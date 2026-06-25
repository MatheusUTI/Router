export type DashboardPeriodPreset =
  | 'TODAY'
  | 'CURRENT_WEEK'
  | 'CURRENT_MONTH'
  | 'LAST_31_DAYS'
  | 'CUSTOM';

export type DashboardPeriod = {
  preset: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
};

export function getStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

export function getEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

export function resolvePeriodDates(preset: DashboardPeriodPreset, customStart?: string, customEnd?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (preset) {
    case 'TODAY':
      return {
        startDate: getStartOfDay(now),
        endDate: getEndOfDay(now),
      };
    case 'CURRENT_WEEK':
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      weekStart.setDate(diff);
      return {
        startDate: getStartOfDay(weekStart),
        endDate: getEndOfDay(now),
      };
    case 'CURRENT_MONTH':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        endDate: getEndOfDay(now),
      };
    case 'LAST_31_DAYS':
      const past31 = new Date(now);
      past31.setDate(past31.getDate() - 31);
      return {
        startDate: getStartOfDay(past31),
        endDate: getEndOfDay(now),
      };
    case 'CUSTOM':
      return {
        startDate: customStart ? getStartOfDay(new Date(customStart)) : getStartOfDay(now),
        endDate: customEnd ? getEndOfDay(new Date(customEnd)) : getEndOfDay(now),
      };
    default:
      return {
        startDate: getStartOfDay(now),
        endDate: getEndOfDay(now),
      };
  }
}

export function formatDateToLocalString(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}
