import React, { useState, useEffect, useMemo } from 'react';
import { Ctrc, OperationalNotice } from '../../types';
import { OperationalCalendarRepository } from '../../infrastructure/localdb/repositories/operationalCalendarRepository';
import { AlertTriangle, Info, ChevronDown, ChevronUp, Calendar, MapPin, RefreshCw } from 'lucide-react';

interface OperationalNoticesBannerProps {
  planningDate: string;
  availableCtrcs: Ctrc[];
}

export default function OperationalNoticesBanner({
  planningDate,
  availableCtrcs = []
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
          bannerBg: 'bg-[#1a0e12] border-red-700/50',
          badgeBg: 'bg-red-950/40 text-red-400 border-red-800/50',
          textColor: 'text-red-300',
          iconColor: 'text-red-400',
          borderL: 'border-l-4 border-l-red-500'
        };
      case 'WARNING':
        return {
          bannerBg: 'bg-[#1c140e] border-amber-700/40',
          badgeBg: 'bg-amber-950/30 text-amber-400 border-amber-800/40',
          textColor: 'text-amber-300',
          iconColor: 'text-amber-400',
          borderL: 'border-l-4 border-l-amber-500'
        };
      default:
        return {
          bannerBg: 'bg-[#0f1422] border-blue-900/40',
          badgeBg: 'bg-blue-950/30 text-blue-400 border-blue-900/40',
          textColor: 'text-blue-300',
          iconColor: 'text-blue-400',
          borderL: 'border-l-4 border-l-blue-500'
        };
    }
  };

  const styles = getSeverityStyles(highestSeverity);

  return (
    <div 
      className={`mx-3 mt-1.5 p-3 rounded-xl border ${styles.bannerBg} ${styles.borderL} transition-all duration-300 shadow-lg`}
      id="operational-notices-banner"
    >
      {/* Collapsed view header / control strip */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {highestSeverity === 'CRITICAL' ? (
            <AlertTriangle className={`w-4 h-4 shrink-0 ${styles.iconColor} animate-pulse`} />
          ) : highestSeverity === 'WARNING' ? (
            <AlertTriangle className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
          ) : (
            <Info className={`w-4 h-4 shrink-0 ${styles.iconColor}`} />
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold uppercase tracking-wider text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
              AVISOS OPERACIONAIS ({notices.length})
            </span>
            <p className={`font-sans truncate ${styles.textColor} text-[11px] font-medium`}>
              {collapsedSummary()}
              {notices.length > 1 && (
                <span className="ml-1 text-[10px] text-slate-400 underline font-normal cursor-pointer" onClick={() => setIsExpanded(true)}>
                  e mais {notices.length - 1} alertas para os próximos 5 dias
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 select-none">
          {/* Quick Refresh trigger */}
          <button 
            type="button" 
            onClick={fetchNotices}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition"
            title="Recarregar Calendário"
            id="notices-refresh-button"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase font-bold text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-900 border border-slate-800 rounded transition"
            id="toggle-notices-expansion"
          >
            {isExpanded ? (
              <>
                <span>Recolher</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Ver Todos</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded list grid */}
      {isExpanded && (
        <div className="mt-3 border-t border-[#1e294b]/30 pt-3 flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  className={`p-2.5 rounded-lg border ${itemStyles.bannerBg} flex flex-col gap-1 transition`}
                  id={`notice-item-${notice.id}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 px-1.5 py-0.5 rounded ${itemStyles.badgeBg} border`}>
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatIsoDate(notice.date)} ({daysText})
                    </span>

                    {notice.route && (
                      <span className="font-mono text-[9px] font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-900 px-1.5 py-0.5 rounded uppercase">
                        {notice.route}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 min-w-0 mt-1">
                    {!notice.route && notice.city !== 'GERAL' ? (
                      <MapPin className="w-3 h-3 shrink-0 text-slate-500 mt-0.5" />
                    ) : null}
                    <p className="font-sans text-[11px] leading-relaxed text-slate-300 font-medium">
                      {notice.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
