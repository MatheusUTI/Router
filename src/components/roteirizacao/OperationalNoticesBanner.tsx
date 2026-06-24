import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, OperationalNotice } from '../../types';
import { OperationalCalendarRepository } from '../../infrastructure/localdb/repositories/operationalCalendarRepository';
import { AlertTriangle, Info, ChevronDown, ChevronUp, Calendar, MapPin, RefreshCw, X } from 'lucide-react';

interface OperationalNoticesBannerProps {
  planningDate: string;
  availableCtrcs: Ctrc[];
  isOpen: boolean;
  onClose: () => void;
  onNoticesChange?: (count: number, highestSeverity: 'INFO' | 'WARNING' | 'CRITICAL') => void;
}

export default function OperationalNoticesBanner({
  planningDate,
  availableCtrcs = [],
  isOpen,
  onClose,
  onNoticesChange
}: OperationalNoticesBannerProps) {
  const [notices, setNotices] = useState<OperationalNotice[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Recalculate upcoming notices dynamically
  const fetchNotices = async () => {
    setLoading(true);
    try {
      // Look 5 days ahead (since we want "próximos 5 dias")
      const upcoming = await OperationalCalendarRepository.getUpcomingNotices(
        5,
        planningDate,
        availableCtrcs
      );
      setNotices(upcoming);

      // Notify parent about loaded notices
      if (onNoticesChange) {
        if (upcoming.length === 0) {
          onNoticesChange(0, 'INFO');
        } else {
          let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
          if (upcoming.some(n => n.severity === 'CRITICAL')) severity = 'CRITICAL';
          else if (upcoming.some(n => n.severity === 'WARNING')) severity = 'WARNING';
          onNoticesChange(upcoming.length, severity);
        }
      }
    } catch (e) {
      console.error('[OperationalNoticesBanner] Erro ao recuperar avisos operacionais:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [planningDate, availableCtrcs]);

  // Determine highest severity active in upcoming notices
  const highestSeverity = useMemo(() => {
    if (notices.length === 0) return 'INFO';
    if (notices.some(n => n.severity === 'CRITICAL')) return 'CRITICAL';
    if (notices.some(n => n.severity === 'WARNING')) return 'WARNING';
    return 'INFO';
  }, [notices]);

  // If there are no notices, render nothing to avoid taking space
  if (notices.length === 0) {
    return null;
  }

  // Format date to short friendly string (DD/MM)
  const formatIsoDate = (isoStr: string) => {
    try {
      const parts = isoStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
      return isoStr;
    } catch {
      return isoStr;
    }
  };

  // Group cities in earliest holiday for quick inline collapsed summary
  // Example: "04/06 Corpus Christi em Alfenas, Varginha, Lavras..."
  const collapsedSummary = () => {
    if (notices.length === 0) return '';
    const firstNotice = notices[0];
    const sameEventNotices = notices.filter(
      n => n.date === firstNotice.date && n.title === firstNotice.title
    );
    const dateFormatted = formatIsoDate(firstNotice.date);
    
    // Check if it is a general holiday
    const isGeneral = sameEventNotices.some(n => n.city === 'GERAL');
    if (isGeneral) {
      return `${dateFormatted} — ${firstNotice.message}`;
    }

    // List unique matching cities
    const cities = Array.from(new Set(sameEventNotices.map(n => n.city)));
    const cleanDescription = firstNotice.message.split(':').slice(1).join(':').trim() || firstNotice.message;
    return `${dateFormatted} — ${cleanDescription} (${cities.join(', ')})`;
  };

  const getSeverityStyles = (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bannerBg: 'bg-[var(--router-surface)] border-red-200 dark:border-red-900 shadow-[var(--router-shadow)]',
          badgeBg: 'router-badge router-badge-danger',
          textColor: 'text-red-800 dark:text-red-400',
          iconColor: 'text-[var(--router-danger)]',
          borderL: 'border-l-[4px] border-l-[var(--router-danger)]'
        };
      case 'WARNING':
        return {
          bannerBg: 'bg-[var(--router-surface)] border-amber-200 dark:border-amber-900 shadow-[var(--router-shadow)]',
          badgeBg: 'router-badge router-badge-warning',
          textColor: 'text-amber-800 dark:text-amber-400',
          iconColor: 'text-[var(--router-warning)]',
          borderL: 'border-l-[4px] border-l-[var(--router-warning)]'
        };
      default:
        return {
          bannerBg: 'bg-[var(--router-surface)] border-blue-200 dark:border-blue-900 shadow-[var(--router-shadow)]',
          badgeBg: 'router-badge router-badge-info',
          textColor: 'text-blue-800 dark:text-blue-400',
          iconColor: 'text-[var(--router-info)]',
          borderL: 'border-l-[4px] border-l-[var(--router-info)]'
        };
    }
  };

  const styles = getSeverityStyles(highestSeverity);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`absolute top-[52px] right-4 z-[45] w-[360px] p-3 rounded-xl border ${styles.bannerBg} ${styles.borderL} transition-all duration-300 shadow-2xl flex flex-col font-sans mb-0`}
      id="operational-notices-banner"
    >
      {/* Toast header / control strip */}
      <div className="flex items-center justify-between gap-3 text-xs pb-1.5 border-b border-[var(--router-border)]">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {highestSeverity === 'CRITICAL' ? (
            <AlertTriangle className={`w-4 h-4 shrink-0 ${styles.iconColor} animate-pulse`} />
          ) : highestSeverity === 'WARNING' ? (
            <AlertTriangle className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
          ) : (
            <Info className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
          )}

          <span className="font-mono font-black uppercase tracking-wider text-[10px] bg-[var(--router-surface-2)] px-1.5 py-0.5 rounded border border-[var(--router-border)] shrink-0 text-[var(--router-text-muted)]">
            AVISOS ({notices.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {/* Quick Refresh trigger */}
          <button 
            type="button" 
            onClick={fetchNotices}
            disabled={loading}
            className="p-1 text-slate-405 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition"
            title="Recarregar Calendário"
            id="notices-refresh-button"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Close button (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-405 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition"
            title="Fechar"
            id="close-notices-toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Notice Content card */}
      <div className="mt-2 text-left">
        <p className={`font-sans ${styles.textColor} text-[11px] font-semibold leading-relaxed`}>
          {collapsedSummary()}
        </p>
        
        {notices.length > 1 && (
          <p className="mt-1 font-sans text-[10px] text-slate-500 dark:text-slate-400">
            e mais {notices.length - 1} alertas para os próximos 5 dias
          </p>
        )}
      </div>

      {/* Actions line */}
      <div className="mt-2.5 flex items-center justify-end gap-2 pt-2 border-t border-[var(--router-border)]">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-black text-[var(--router-primary)] px-2 py-1 bg-[var(--router-surface-3)] hover:bg-[var(--router-surface-3)] border border-[var(--router-border)] rounded transition cursor-pointer"
          id="toggle-notices-expansion"
        >
          {isExpanded ? (
            <>
              <span>Ocultar Lista</span>
              <ChevronUp className="w-3" />
            </>
          ) : (
            <>
              <span>Ver Todos ({notices.length})</span>
              <ChevronDown className="w-3" />
            </>
          )}
        </button>
      </div>

      {/* Expanded list overlay inside the toast (doesn't push content below toast!) */}
      {isExpanded && (
        <div className="mt-2.5 border-t border-[var(--router-border)] pt-2 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
          {notices.map((notice) => {
            const itemStyles = getSeverityStyles(notice.severity);
            const daysText = notice.daysUntil === 0 
              ? 'hoje' 
              : notice.daysUntil === 1 
                ? 'amanhã' 
                : `em ${notice.daysUntil} dias`;

            return (
              <div 
                key={notice.id} 
                className={`p-2 rounded-lg border ${itemStyles.bannerBg} flex flex-col gap-0.5 transition`}
                id={`notice-item-${notice.id}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-wide flex items-center gap-1 px-1 py-0.5 rounded ${itemStyles.badgeBg} border`}>
                    <Calendar className="w-2.5 h-2.5 shrink-0" />
                    {formatIsoDate(notice.date)} ({daysText})
                  </span>

                  {notice.route && (
                    <span className="font-mono text-[8px] font-bold text-[var(--router-primary)] bg-[var(--router-surface-2)] border border-[var(--router-border)] px-1 py-0.5 rounded uppercase">
                      {notice.route}
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-1 min-w-0 mt-0.5">
                  {!notice.route && notice.city !== 'GERAL' ? (
                    <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" />
                  ) : null}
                  <p className="font-sans text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                    {notice.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
