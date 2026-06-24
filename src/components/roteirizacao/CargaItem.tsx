import React, { useState, useEffect } from 'react';
import { RoteirizacaoItem, RoutePlanningItem, PlanningStatus, PlanningPriority, DensityMode } from '../../types';
import { MoreVertical, X, Calendar, AlertCircle, Star, PauseCircle, Ban, RefreshCw } from 'lucide-react';

interface CargaItemProps {
  key?: React.Key | string;
  item: RoteirizacaoItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onUpdatePlanning?: (ctrcId: string, patch: Partial<RoutePlanningItem>) => void;
  densityMode?: DensityMode;
}

const resolvePlanningStyle = (status: PlanningStatus | undefined) => {
  switch (status) {
    case 'URGENTE':
      return {
        label: 'URG',
        borderClass: 'border-l-[var(--router-danger)]',
        badgeBg: 'router-badge router-badge-danger font-black',
        textClass: 'text-[var(--router-danger)]',
        cardBg: 'route-row-urgent',
      };
    case 'PRIORIDADE':
      return {
        label: 'PRI',
        borderClass: 'border-l-[var(--router-warning)]',
        badgeBg: 'router-badge router-badge-warning font-bold',
        textClass: 'text-[var(--router-warning)]',
        cardBg: 'route-row-priority',
      };
    case 'SEGURAR':
      return {
        label: 'SEG',
        borderClass: 'border-l-[#F97316]',
        badgeBg: 'router-badge router-badge-warning font-black opacity-80',
        textClass: 'text-[#F97316]',
        cardBg: 'route-row-hold',
      };
    case 'NAO_SAI_HOJE':
      return {
        label: 'NÃO',
        borderClass: 'border-l-[var(--router-text-muted)]',
        badgeBg: 'router-badge router-badge-neutral',
        textClass: 'text-[var(--router-text-muted)] line-through',
        cardBg: 'route-row-disabled',
      };
    case 'AGENDADO':
      return {
        label: 'AGD',
        borderClass: 'border-l-[#06B6D4]',
        badgeBg: 'router-badge router-badge-info',
        textClass: 'text-[#06B6D4]',
        cardBg: 'route-row-scheduled',
      };
    case 'CONSOLIDADO':
      return {
        label: 'CONS',
        borderClass: 'border-l-[var(--router-success)]',
        badgeBg: 'router-badge router-badge-success font-black',
        textClass: 'text-[var(--router-success)]',
        cardBg: 'route-row-planned',
      };
    case 'PLANEJADO':
      return {
        label: 'PLAN',
        borderClass: 'border-l-emerald-400',
        badgeBg: 'router-badge router-badge-success',
        textClass: 'text-emerald-500',
        cardBg: 'route-row-planned',
      };
    case 'A_PLANEJAR':
    default:
      return {
        label: 'PEND',
        borderClass: 'border-l-transparent dark:border-l-transparent',
        badgeBg: 'router-badge router-badge-neutral',
        textClass: 'text-[var(--router-text-muted)]',
        cardBg: 'router-table-row',
      };
  }
};

const getFlowStatusLabel = (item: RoteirizacaoItem): string => {
  const pStatus = item.planningStatus;
  if (pStatus === 'CONSOLIDADO') return 'PROGRAMADO';
  if (pStatus === 'PLANEJADO') return 'PRÉ-ROMANEIO';
  if (pStatus === 'URGENTE') return 'URGENTE';
  if (pStatus === 'PRIORIDADE') return 'PRIORITÁRIO';
  if (pStatus === 'SEGURAR') return 'HOLD';
  if (pStatus === 'NAO_SAI_HOJE') return 'CORTE';

  const rawStatus = (item.availabilityLabel || item.status || '').toUpperCase();
  if (rawStatus.includes('AGUARDANDO') || rawStatus === 'DISPONÍVEL' || rawStatus === 'DISPONIVEL' || rawStatus === 'LIBERADO') {
    return 'DISPONÍVEL';
  }
  if (rawStatus.includes('EM ROTA') || rawStatus.includes('S SPO') || rawStatus.includes('TRÂNSITO') || rawStatus.includes('TRANSIT')) {
    return 'EM TRÂNSITO';
  }
  if (rawStatus.includes('RETIDO') || rawStatus.includes('PROBLEMA') || rawStatus.includes('AVERIGUA') || rawStatus.includes('VISTORIA')) {
    return 'RETIDO/AUDIT';
  }
  return rawStatus;
};

const getFlowStatusColor = (statusLabel: string): { bg: string; text: string; border: string } => {
  const norm = statusLabel.toUpperCase();
  if (norm === 'DISPONÍVEL' || norm === 'DISPONIVEL' || norm === 'NA MESA') {
    return { bg: 'bg-[var(--router-badge-available)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  if (norm === 'PRÉ-ROMANEIO') {
    return { bg: 'bg-[var(--router-badge-scheduled)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  if (norm === 'PROGRAMADO' || norm === 'CONSOLIDADO') {
    return { bg: 'bg-[var(--router-badge-scheduled)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  if (norm.includes('URGENTE') || norm.includes('PRIORITÁRIO') || norm.includes('RETIDO') || norm.includes('AUDIT') || norm.includes('PENDÊNCIA') || norm.includes('RETIDO/AUDIT')) {
    return { bg: 'bg-[var(--router-badge-critical)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  if (norm === 'HOLD') {
    return { bg: 'bg-[var(--router-badge-light-warning)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  if (norm === 'EM TRÂNSITO') {
    return { bg: 'bg-[var(--router-info)]', text: 'text-[#0F172A]', border: 'border-transparent' };
  }
  return { bg: 'bg-[var(--router-badge-neutral)]', text: 'text-[var(--router-badge-neutral-text)]', border: 'border-transparent' };
};


const SSW_SERIES_BY_UNIT: Record<string, string> = {
  'SPO': 'SPO',
  'VGA': 'BCA',
  'VGS': 'BCA',
  'BHZ': 'BHZ',
  'CWB': 'CWB',
  'TNE': 'TNE',
  'EXT': 'EXT',
  'POU': 'POU',
  'SJE': 'SJE',
  'VCP': 'VCP'
};

const parseSswCtrcCode = (rawId: string): { series: string | null; number: string | null } => {
  const value = String(rawId ?? '').trim().toUpperCase();

  if (!value) {
    return { series: null, number: null };
  }

  // Padrão principal do SSW/BI:
  // BCA217880-0
  // BCA217880
  // BCA 217880-0
  // BCA-217880-0
  const fullMatch = value.match(/^([A-Z]{2,5})[-\s]?(\d+)(?:-\d+)?$/);

  if (fullMatch) {
    return {
      series: fullMatch[1],
      number: fullMatch[2],
    };
  }

  // Fallback: se vier apenas número.
  const digitsOnly = value.replace(/\D/g, '');

  return {
    series: null,
    number: digitsOnly || null,
  };
};

const normalizeSswSeriesFromUnit = (rawUnit?: string): string | null => {
  const unit = String(rawUnit ?? '').trim().toUpperCase();

  if (!unit) return null;

  if (SSW_SERIES_BY_UNIT[unit]) {
    return SSW_SERIES_BY_UNIT[unit];
  }

  if (unit.includes('VGA') || unit.includes('VGS')) {
    return 'BCA';
  }

  return null;
};

const formatSswDate = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);

  return `${d}${m}${y}`;
};

const getSswSafeDateRange = (): { dataIni: string; dataFin: string } => {
  const today = new Date();

  const start = new Date(today);
  start.setMonth(start.getMonth() - 23);
  start.setDate(1);

  return {
    dataIni: formatSswDate(start),
    dataFin: formatSswDate(today),
  };
};

const buildSswLink = (ctrc: Pick<RoteirizacaoItem, 'id' | 'unid'>): string | null => {
  const rawId = String(ctrc.id ?? '').trim();

  const parsed = parseSswCtrcCode(rawId);

  const series = parsed.series || normalizeSswSeriesFromUnit(ctrc.unid);
  const number = parsed.number;

  if (!series || !number) {
    return null;
  }

  const { dataIni, dataFin } = getSswSafeDateRange();

  const params = new URLSearchParams({
    act: 'P1',
    t_ser_ctrc: series,
    t_nro_ctrc: number,
    t_data_ini: dataIni,
    t_data_fin: dataFin,
  });

  return `https://sistema.ssw.inf.br/bin/ssw0053?${params.toString()}`;
};

const getWeekdayShort = (prev_ent: string) => {
  if (!prev_ent) return '';
  const parts = prev_ent.split('/');
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts.length === 3 ? (parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10)) : new Date().getFullYear();
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return weekdays[date.getDay()];
    }
  }
  return '';
};

export default function CargaItem({
  item,
  isSelected,
  onToggle,
  onUpdatePlanning,
  densityMode = 'default',
}: CargaItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [typedRoute, setTypedRoute] = useState(item.operationalRoute || '');
  const [typedNote, setTypedNote] = useState(item.operationalNote || '');

  // Keep internal states synced with latest database items
  useEffect(() => {
    setTypedRoute(item.operationalRoute || '');
    setTypedNote(item.operationalNote || '');
  }, [item.operationalRoute, item.operationalNote]);

  const handleOpenSswCtrc = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const url = buildSswLink(item);

    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const pStyle = resolvePlanningStyle(item.planningStatus);

  // Dynamic density classes
  const padOuterY = densityMode === 'compact' ? 'py-0.5' : densityMode === 'comfortable' ? 'py-2.5' : 'py-1';
  const padBlock2 = densityMode === 'compact' ? 'py-0.5 pl-2 pr-1' : densityMode === 'comfortable' ? 'py-2.5 pl-3 pr-2' : 'py-1 pl-2.5 pr-1.5';
  const padBlock3 = densityMode === 'compact' ? 'py-0.5 px-2' : densityMode === 'comfortable' ? 'py-2.5 px-3' : 'py-1 px-2.5';
  const padBlock4 = densityMode === 'compact' ? 'py-0.5 px-2 gap-0' : densityMode === 'comfortable' ? 'py-2.5 px-3 gap-1.5' : 'py-1 px-2.5 gap-0.5';
  const padBlock5 = densityMode === 'compact' ? 'py-0.5 px-2 gap-0' : densityMode === 'comfortable' ? 'py-2.5 px-3 gap-1.5' : 'py-1 px-2.5 gap-0.5';

  const isCompact = densityMode === 'compact';
  const isComfortable = densityMode === 'comfortable';

  const dropWidth = isCompact ? 'w-[235px]' : isComfortable ? 'w-[305px]' : 'w-[270px]';
  const dropHeaderPad = isCompact ? 'px-2.5 py-2' : isComfortable ? 'px-3.5 py-3' : 'px-3 py-2.5';
  const dropHeaderText = isCompact ? 'text-[9.5px]' : isComfortable ? 'text-[11.5px]' : 'text-[10px]';
  const dropBlockPad = isCompact ? 'p-2.5 gap-1' : isComfortable ? 'p-4 gap-2' : 'p-3 gap-1.5';
  
  const labelTextSize = isCompact ? 'text-[8px]' : isComfortable ? 'text-[9.5px]' : 'text-[8.5px]';
  const inputPadY = isCompact ? 'py-1 px-2 text-[10px]' : isComfortable ? 'py-2 px-2.5 text-[11.5px]' : 'py-1.5 px-2 text-[10.5px]';
  const buttonPadY = isCompact ? 'px-2 py-1 text-[8.5px]' : isComfortable ? 'px-3.5 py-2 text-[10px]' : 'px-3 py-1.5 text-[9px]';
  
  const priorityHeaderLabel = isCompact ? 'px-2.5 py-1 text-[7.5px]' : isComfortable ? 'px-3.5 py-1 text-[9px]' : 'px-3 py-1 text-[8px]';
  const priorityBtnPad = isCompact ? 'px-2.5 py-1.5 text-[9px]' : isComfortable ? 'px-3.5 py-2.5 text-[11px]' : 'px-3 py-2 text-[10px]';
  const tagTextSize = isCompact ? 'text-[7px]' : isComfortable ? 'text-[8px]' : 'text-[7.5px]';

  const resetBtnPad = isCompact ? 'py-1 text-[8.5px]' : isComfortable ? 'py-2 text-[10px]' : 'py-1.5 text-[9px]';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setDropdownOpen(true);
  };

  const flowStatusLabel = getFlowStatusLabel(item);
  const flowStatusStyles = getFlowStatusColor(flowStatusLabel);

  return (
    <div
      onClick={() => {
        if (item.planningStatus !== 'CONSOLIDADO') {
          onToggle(item.id);
        }
      }}
      onContextMenu={handleContextMenu}
      className={`border-b border-[var(--router-border)] router-table-row grid items-stretch select-none transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'router-table-row-selected shadow-[inset_2.5px_0_0_var(--router-primary),inset_0_0_6px_rgba(99,102,241,0.035)]' 
          : pStyle.cardBg
      } group w-full ${dropdownOpen ? 'relative z-40 overflow-visible' : 'relative z-10 overflow-visible'} ${item.visualFlags?.rowClass || ''} ${densityMode === 'planilha_operacional' ? '' : 'grid-cols-[24px_minmax(180px,1fr)_minmax(310px,1.7fr)_minmax(360px,1.9fr)_minmax(110px,0.4fr)]'}`}
      style={{ 
        gridTemplateColumns: densityMode === 'planilha_operacional' ? '24px minmax(clamp(95px, calc(95px * var(--mesa-scale, 1)), 110px), 0.55fr) minmax(clamp(200px, calc(220px * var(--mesa-scale, 1)), 270px), 1.35fr) minmax(clamp(100px, calc(105px * var(--mesa-scale, 1)), 120px), 0.65fr) minmax(clamp(70px, calc(72px * var(--mesa-scale, 1)), 85px), 0.38fr) minmax(clamp(180px, calc(210px * var(--mesa-scale, 1)), 240px), 1.2fr) minmax(clamp(80px, calc(86px * var(--mesa-scale, 1)), 100px), 0.5fr) minmax(clamp(70px, calc(76px * var(--mesa-scale, 1)), 90px), 0.42fr) minmax(clamp(78px, calc(86px * var(--mesa-scale, 1)), 100px), 0.38fr)' : undefined,
        height: densityMode === 'planilha_operacional' ? 'calc(52px * var(--mesa-scale, 1))' : undefined,
      } as React.CSSProperties}
    >
      {densityMode === 'planilha_operacional' ? (
        <>
          {/* Col 1: Seleção */}
          <div 
            className={`shrink-0 flex items-center justify-center border-l-[3.5px] ${pStyle.borderClass} ${isSelected ? 'bg-transparent' : 'bg-transparent'}`}
            style={{ minWidth: '24px', maxWidth: '24px' }}
          >
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (item.planningStatus !== 'CONSOLIDADO') {
                  onToggle(item.id);
                }
              }} 
              className="flex items-center justify-center shrink-0 mt-0.5"
            >
              <input
                type="checkbox"
                id={`checkbox-carga-${item.id}`}
                checked={isSelected}
                disabled={item.planningStatus === 'CONSOLIDADO'}
                onChange={() => {}}
                className="w-3.5 h-3.5 cursor-pointer rounded-sm border-[var(--router-border)] dark:border-[var(--router-border)] bg-[var(--router-surface)] bg-[var(--router-surface-2)] focus:ring-0 accent-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Col 2: Cidade / Rota */}
          <div 
            className="min-w-0 flex flex-col justify-center text-left py-1 px-2.5 gap-0.5"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))' }}
          >
            <span className="text-[var(--router-text)] dark:text-white font-extrabold uppercase tracking-wide truncate block" style={{ fontSize: 'calc(12px * var(--mesa-scale, 1))' }} title={item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}>
              {item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}
            </span>
            <div className="flex items-center gap-1 font-sans leading-none" style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }}>
              <span className="text-[var(--router-primary)] font-extrabold uppercase">
                {item.effectiveRoute || 'SEM ROTA'}
              </span>
              {item.isManualRoute && (
                <span className="router-badge router-badge-warning font-black uppercase text-[8px] px-1 py-0.2 rounded shrink-0 leading-none select-none">
                  MANUAL
                </span>
              )}
              {item.planningStatus === 'URGENTE' && (
                <span className="router-badge router-badge-danger font-black uppercase rounded shrink-0 leading-none select-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))', padding: '1px 3px' }}>
                  P0
                </span>
              )}
              {item.planningStatus === 'PRIORIDADE' && (
                <span className="router-badge router-badge-warning font-black uppercase rounded shrink-0 leading-none select-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))', padding: '1px 3px' }}>
                  P1
                </span>
              )}
              {item.planningStatus === 'SEGURAR' && (
                <span className="router-badge router-badge-danger font-black uppercase rounded shrink-0 leading-none select-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))', padding: '1px 3px' }}>
                  SEGURAR
                </span>
              )}
              {item.planningStatus === 'NAO_SAI_HOJE' && (
                <span className="router-badge router-badge-neutral font-black uppercase rounded shrink-0 leading-none select-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))', padding: '1px 3px' }}>
                  NÃO SAI
                </span>
              )}
              {item.planningStatus === 'AGENDADO' && (
                <span className="router-badge router-badge-info font-black uppercase rounded shrink-0 leading-none select-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))', padding: '1px 3px' }}>
                  AGENDADO
                </span>
              )}
            </div>
          </div>

          {/* Col 3: Destinatário / Remetente */}
          <div 
            className="min-w-0 flex flex-col justify-center text-left py-1 px-2.5 gap-0.5 font-sans"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: Destinatário */}
            <div className="flex items-center gap-1 leading-none w-full min-w-0 select-text" style={{ fontSize: 'calc(11.5px * var(--mesa-scale, 1))' }}>
              <span className="text-[var(--router-text-muted)] font-bold select-none tracking-tight mr-0.5" style={{ fontSize: 'calc(9px * var(--mesa-scale, 1))' }}>DST:</span>
              <span 
                className={`font-bold uppercase truncate tracking-wide px-1 py-0.2 rounded border text-[var(--router-text)] border-transparent`}
                style={{ fontSize: 'calc(11.5px * var(--mesa-scale, 1))' }}
                title={`${item.destinatario || ''}${item.isFob ? ' [FOB]' : ''}${item.isCurvaA ? ' [CURVA A]' : ''}`}
              >
                {item.destinatario || 'SEM DESTINATÁRIO'}
              </span>
              {item.isFob && (
                <span className="router-badge router-badge-warning font-black uppercase tracking-wider select-none shrink-0 leading-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))' }}>
                  FOB
                </span>
              )}
              {(item.isDestinatarioCurvaA || (!item.isRemetenteCurvaA && item.isCurvaA)) && (
                <span className="router-badge router-badge-danger font-black uppercase tracking-wider select-none shrink-0 leading-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))' }}>
                  ★ CURVA A
                </span>
              )}
            </div>

            {/* Linha 2: Remetente */}
            <div className="flex items-center gap-1 leading-none w-full min-w-0 select-text text-[var(--router-text-muted)]" style={{ fontSize: 'calc(10.5px * var(--mesa-scale, 1))' }}>
              <span className="text-[var(--router-text-muted)] font-bold select-none" style={{ fontSize: 'calc(8.5px * var(--mesa-scale, 1))' }}>REM:</span>
              <span 
                className={`font-semibold truncate uppercase text-[var(--router-text-muted)]`}
                style={{ fontSize: 'calc(10.5px * var(--mesa-scale, 1))' }}
                title={item.remetente}
              >
                {item.remetente || 'S/ R'}
              </span>
              {item.isRemetenteCurvaA && (
                <span className="router-badge router-badge-danger font-black uppercase tracking-wider select-none shrink-0 leading-none" style={{ fontSize: 'calc(8px * var(--mesa-scale, 1))' }}>
                  ★ CURVA A
                </span>
              )}
            </div>
          </div>

          {/* Col 4: CTRC / NF */}
          <div 
            className="min-w-0 flex flex-col justify-center text-left py-1 px-2.5 gap-0.5 font-mono"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))', fontSize: 'calc(10.5px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: CTRC com link */}
            <div className="font-bold text-[var(--router-primary)] truncate leading-none">
              <span className="text-[var(--router-text-muted)] font-bold mr-0.5">CTRC:</span>
              {(() => {
                const sswUrl = buildSswLink(item);
                if (!sswUrl) return item.id;
                return (
                  <a
                    href={sswUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleOpenSswCtrc}
                    className="hover:underline hover:text-indigo-500 cursor-pointer font-bold inline"
                  >
                    {item.id}
                  </a>
                );
              })()}
            </div>

            {/* Linha 2: NF */}
            <div className="text-[var(--router-text-soft)] truncate leading-none mt-0.5">
              <span className="text-[var(--router-text-muted)] font-bold mr-0.5">NF:</span>
              <span className="font-semibold">{item.nf || 'S/N'}</span>
            </div>
          </div>

          {/* Col 5: Previsão */}
          <div 
            className="min-w-0 flex flex-col justify-center items-center py-1 px-2"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))' }}
          >
            {(() => {
              const hasNoPrev = !item.prev_ent || item.prev_ent.trim() === '' || item.prev_ent.toUpperCase() === 'SEM PREVISÃO' || item.prev_ent.toUpperCase() === 'S/PRAZO' || item.prev_ent.toUpperCase() === 'S/P' || item.prev_ent.toUpperCase() === 'SEM PREV';
              
              let prevStyles = 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] dark:bg-[var(--router-surface-3)]/30 dark:text-[var(--router-text-muted)] dark:border-[var(--router-border)]';
              let label = 'S/ PREV';
              let weekday = '';
              
              if (!hasNoPrev) {
                label = item.prev_ent;
                if (item.slaStatus?.isDelayed) {
                  prevStyles = 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40';
                } else if (item.slaStatus?.isToday) {
                  prevStyles = 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
                } else {
                  prevStyles = 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] dark:bg-amber-950/20 dark:text-amber-500 dark:border-amber-900/40';
                }
                
                // Clean-up date to DD/MM
                const cleanLabel = label.split(' ')[0] || '';
                const match = cleanLabel.match(/^(\d{2}\/\d{2})/);
                if (match) {
                  label = match[1];
                  weekday = getWeekdayShort(cleanLabel);
                }
              }

              return (
                <div className={`font-sans px-2 py-1 rounded border text-center font-bold flex flex-col items-center justify-center leading-none ${prevStyles}`} style={{ minWidth: '76px', fontSize: 'calc(10px * var(--mesa-scale, 1))' }}>
                  <span className="font-extrabold uppercase">{label}</span>
                  {weekday && <span className="mt-0.5 opacity-80" style={{ fontSize: 'calc(8.5px * var(--mesa-scale, 1))' }}>{weekday}</span>}
                </div>
              );
            })()}
          </div>

          {/* Col 6: Status / Localização */}
          <div 
            className="min-w-0 flex flex-col justify-center text-left py-1 px-2.5 gap-0.5"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: Status principal */}
            <div className="flex items-center gap-1 leading-none w-full min-w-0">
              {(() => {
                let statusText = flowStatusLabel;
                let statusStyles = flowStatusStyles;

                // Check if there is occurrence code
                if (item.occurrenceCode) {
                  const code = String(item.occurrenceCode);
                  let occName = item.occurrenceDescription === 'Ocorrência não mapeada' ? 'OCORRÊNCIA' : item.occurrenceDescription.toUpperCase();
                  statusText = `OC ${code} · ${occName}`;
                  
                  const sector = (item.occurrenceSector || '').toUpperCase();
                  if (sector === 'DISPONÍVEL' || sector === 'DISPONIVEL' || sector === 'DISPONÍVEL COBRANÇA' || sector === 'DISPONÍVEL TRANSFERÊNCIA' || sector === 'DISPONÍVEL PENDÊNCIA') {
                    statusStyles = { bg: 'router-badge router-badge-success', text: '', border: '' };
                  } else if (sector === 'EM ROTA') {
                    statusStyles = { bg: 'router-badge router-badge-info', text: '', border: '' };
                  } else if (sector === 'COBRANÇA' || sector === 'SOLUÇÃO' || sector === 'SOLUCAO' || sector === 'COBRANCA') {
                    statusStyles = { bg: 'router-badge router-badge-warning', text: '', border: '' };
                  } else if (sector === 'TRANSFERÊNCIA' || sector === 'TRANSFERENCIA') {
                    statusStyles = { bg: 'router-badge router-badge-neutral', text: '', border: '' };
                  } else if (sector === 'AGENDAMENTO') {
                    statusStyles = { bg: 'router-badge router-badge-info', text: '', border: '' };
                  } else if (sector === 'RETIDOS' || sector === 'RETIDO') {
                    statusStyles = { bg: 'router-badge router-badge-danger', text: '', border: '' };
                  } else {
                    statusStyles = { bg: 'router-badge router-badge-neutral', text: '', border: '' };
                  }
                } else if (statusText === 'DISPONÍVEL') {
                  statusStyles = { bg: '', text: 'text-[var(--router-text-muted)]', border: '' };
                  return (
                    <span className={`font-sans font-bold uppercase leading-none truncate max-w-full flex items-center gap-1 ${statusStyles.text}`} style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }} title={statusText}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--router-success)] opacity-70"></span> {statusText}
                    </span>
                  );
                } else if (statusText === 'AGENDAMENTO' || item.planningStatus === 'AGENDADO' || item.status === 'Agendamento') {
                  statusText = 'AGENDAMENTO';
                  statusStyles = { bg: 'router-badge router-badge-info', text: '', border: '' };
                } else if (statusText === 'RETIDO' || statusText === 'PENDÊNCIA' || statusText === 'AUDIT' || statusText === 'REBATE' || statusText === 'DEVOLUÇÃO') {
                  statusStyles = { bg: 'router-badge router-badge-danger', text: '', border: '' };
                }

                return (
                  <span className={`font-sans font-bold uppercase leading-none truncate max-w-full px-1.5 py-0.5 rounded border ${statusStyles.bg} ${statusStyles.text} ${statusStyles.border}`} style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }} title={statusText}>
                    {statusText}
                  </span>
                );
              })()}
            </div>

            {/* Linha 2: Localização */}
            <div className="flex items-center gap-1 leading-none w-full min-w-0 mt-0.5 text-[var(--router-text-muted)] font-sans" style={{ fontSize: 'calc(11px * var(--mesa-scale, 1))' }}>
              {(() => {
                const normLoc = item.locationLabel ? item.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
                let displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOC' : normLoc;
                
                // Safe abbreviation
                if (displayLoc.toUpperCase() === 'NO ARMAZEM DA UNIDADE VARGINHA' || displayLoc.toUpperCase() === 'NO ARMAZÉM DA UNIDADE VARGINHA') {
                  displayLoc = 'Armazém VGA';
                } else if (displayLoc.toUpperCase() === 'UNIDADE DESTINO') {
                  displayLoc = 'Unidade destino';
                } else if (displayLoc.toUpperCase() === 'COBRANCA' || displayLoc.toUpperCase() === 'COBRANÇA') {
                  displayLoc = 'Cobrança';
                } else {
                  // general titlecase/clean replacements
                  displayLoc = displayLoc
                    .replace(/NO ARMAZEM DA UNIDADE/ig, 'Armazém')
                    .replace(/NO ARMAZÉM DA UNIDADE/ig, 'Armazém')
                    .replace(/ARMAZEM/ig, 'Armazém')
                    .replace(/ARMAZÉM/ig, 'Armazém');
                }
                
                const sector = item.occurrenceSector || '';
                const fullTooltip = `${item.locationLabel || 'NÃO INFORMADO'}`;
                
                return (
                  <span className="truncate" title={fullTooltip}>
                    📍 {displayLoc}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Col 7: Valor / Frete */}
          <div 
            className="min-w-0 flex flex-col justify-center items-end text-right py-1 px-2.5 gap-0.5 font-sans"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))', fontSize: 'calc(11px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: Valor Mercadoria */}
            {(() => {
              const v = item.valor || 0;
              let vClass = 'text-[var(--router-text-soft)] font-medium';
              if (v >= 20000 && v < 100000) {
                vClass = 'text-emerald-700 dark:text-emerald-500 font-semibold';
              } else if (v >= 100000) {
                vClass = 'text-amber-600 dark:text-amber-500 font-bold';
              }
              return (
                <span className={vClass} title="Valor da Mercadoria">
                  R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              );
            })()}

            {/* Linha 2: Frete */}
            <span className="text-[var(--router-text-muted)] font-medium leading-none" style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }} title="Frete">
              Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Col 8: Peso / Volumes */}
          <div 
            className="min-w-0 flex flex-col justify-center items-end text-right py-1 px-2.5 gap-0.5 font-sans"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))', fontSize: 'calc(11px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: Peso */}
            {(() => {
              const p = item.peso_r || item.weight || 0;
              let pClass = 'text-[var(--router-text-soft)] font-bold';
              if (p > 10 && p <= 100) {
                pClass = 'text-[var(--router-text-soft)] font-semibold';
              } else if (p > 100 && p <= 500) {
                pClass = 'text-amber-600 dark:text-amber-500 font-semibold';
              } else if (p > 500) {
                pClass = 'text-orange-600 dark:text-orange-500 font-bold';
              }
              return (
                <span className={pClass} title="Peso">
                  {p.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} kg
                </span>
              );
            })()}

            {/* Linha 2: Volumes */}
            <span className="text-[var(--router-text-muted)] font-medium leading-none" style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }} title="Volumes">
              {item.volume || 1} {item.volume === 1 ? 'vol' : 'vols'}
            </span>
          </div>

          {/* Col 9: OBS / Disponível */}
          <div 
            className="min-w-0 flex flex-col justify-center items-center py-1 px-2.5 gap-0.5 font-sans"
            style={{ height: 'calc(52px * var(--mesa-scale, 1))' }}
          >
            {/* Linha 1: OBS */}
            <div className="w-full text-center">
              {item.operationalNote ? (
                <span 
                  className="bg-[var(--router-badge-light-warning)] text-[#0F172A] rounded px-1.5 py-0.2 font-medium block truncate max-w-full" 
                  style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }}
                  title={item.operationalNote}
                >
                  {item.operationalNote}
                </span>
              ) : (
                <span className="text-[var(--router-text-soft)]  font-bold">-</span>
              )}
            </div>

            {/* Linha 2: Disponibilidade */}
            <div className="flex items-center justify-center leading-none mt-0.5" style={{ fontSize: 'calc(10px * var(--mesa-scale, 1))' }}>
              {(() => {
                const sector = (item.occurrenceSector || '').toUpperCase();
                if (sector === 'DISPONÍVEL' || sector === 'DISPONIVEL' || sector === 'DISPONÍVEL COBRANÇA' || sector === 'DISPONÍVEL TRANSFERÊNCIA' || sector === 'DISPONÍVEL PENDÊNCIA') {
                  return <span className="text-emerald-700 dark:text-emerald-500 font-medium flex items-center gap-0.5 whitespace-nowrap" title={item.occurrenceSector || 'Disponível'}><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Disp.</span>;
                } else if (sector === 'EM ROTA') {
                  return <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 whitespace-nowrap" title="Em Rota"><span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Em Rota</span>;
                } else if (sector === 'TRANSFERÊNCIA' || sector === 'TRANSFERENCIA') {
                  return <span className="text-[var(--router-text-soft)] font-medium flex items-center gap-0.5 whitespace-nowrap" title="Transferência"><span className="h-1.5 w-1.5 rounded-full bg-[var(--router-border)]"></span> Transf.</span>;
                } else if (sector === 'AGENDAMENTO') {
                  return <span className="text-[var(--router-primary)] font-medium flex items-center gap-0.5 whitespace-nowrap" title="Agendamento"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span> Agend.</span>;
                } else if (sector === 'SOLUÇÃO' || sector === 'SOLUCAO') {
                  return <span className="text-amber-600 dark:text-amber-500 font-medium flex items-center gap-0.5 whitespace-nowrap" title="Solução"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Solução</span>;
                } else if (sector === 'RETIDOS' || sector === 'RETIDO') {
                  return <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5 whitespace-nowrap" title="Retido"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span> Retido</span>;
                } else if (sector === 'COBRANÇA' || sector === 'COBRANCA') {
                  return <span className="text-orange-600 dark:text-orange-500 font-medium flex items-center gap-0.5 whitespace-nowrap" title="Cobrança"><span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span> Cobrança</span>;
                } else if (sector === 'FRETE') {
                  return <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center gap-0.5 whitespace-nowrap" title="Frete"><span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span> Frete</span>;
                } else {
                  return <span className="text-[var(--router-text-muted)] font-bold flex items-center gap-0.5 whitespace-nowrap" title={item.occurrenceSector || 'Indefinido'}><span className="h-1.5 w-1.5 rounded-full bg-[var(--router-border)]"></span> Indef.</span>;
                }
              })()}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Block 1: [FAIXA LATERAL COMPACTA SEM TEXTO REDUNDANTE] (24px) */}
          <div 
            className={`shrink-0 flex items-center justify-center border-l-[3.5px] ${pStyle.borderClass} ${isSelected ? 'bg-transparent' : 'bg-transparent'}`}
            style={{ minWidth: '24px', maxWidth: '24px' }}
          >
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (item.planningStatus !== 'CONSOLIDADO') {
                  onToggle(item.id);
                }
              }} 
              className="flex items-center justify-center shrink-0 mt-0.5"
            >
              <input
                type="checkbox"
                id={`checkbox-carga-${item.id}`}
                checked={isSelected}
                disabled={item.planningStatus === 'CONSOLIDADO'}
                onChange={() => {}}
                className="w-3.5 h-3.5 cursor-pointer rounded-sm border-[var(--router-border)] dark:border-[var(--router-border)] bg-[var(--router-surface)] bg-[var(--router-surface-2)] focus:ring-0 accent-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>

      {/* Block 2: [BLOCO ROTA] - Cidade de Destaque e Linha Direcional */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock2} select-text leading-tight`}>
        <span className="text-[var(--router-text)] dark:text-white hover:text-indigo-600 dark:hover:text-indigo-200 font-extrabold text-[15px] uppercase tracking-wide truncate block" title={item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}>
          {item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}
        </span>
        
        <div className="flex flex-col gap-0.5 mt-0.5 leading-none">
          {/* Main Directing Route */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            <span className="text-[var(--router-primary)] font-black uppercase text-[14px]">
              {item.effectiveRoute || 'SEM ROTA'}
            </span>
            {item.isManualRoute && (
              <span className="bg-[var(--router-badge-operational-warning)] text-[#0F172A] font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                MANUAL
              </span>
            )}
            {item.planningStatus === 'URGENTE' && (
              <span className="bg-[var(--router-badge-critical)] text-[#0F172A] font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                P0
              </span>
            )}
            {item.planningStatus === 'PRIORIDADE' && (
              <span className="bg-[var(--router-badge-operational-warning)] text-[#0F172A] font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                P1
              </span>
            )}
            {item.planningStatus === 'SEGURAR' && (
              <span className="bg-[var(--router-badge-critical)] text-[#0F172A] font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                SEGURAR
              </span>
            )}
            {item.planningStatus === 'NAO_SAI_HOJE' && (
              <span className="bg-neutral-500/20 text-neutral-500 dark:text-neutral-400 font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none border border-neutral-500/30">
                NÃO SAI
              </span>
            )}
            {item.planningStatus === 'AGENDADO' && (
              <span className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none border border-cyan-500/30">
                AGENDADO
              </span>
            )}
          </div>

          {/* Suggested route if Manual overwrite is active */}
          {item.isManualRoute && item.suggestedRoute && (
            <span className="text-[var(--router-text-muted)] font-bold font-mono text-[11px] block truncate" title={`Sugestão: ${item.suggestedRoute}`}>
              Sug.: {item.suggestedRoute}
            </span>
          )}
        </div>
      </div>

      {/* Block 3: [BLOCO IDENTIDADE] - Destinatário, Remetente, CTRC e NF */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock3} gap-0.5 select-text`}>
        {/* Destinatário */}
        <div className="flex items-center gap-1 leading-none w-full min-w-0">
          <span className="text-[var(--router-text-muted)] font-black select-none shrink-0 text-[10.5px] tracking-tight">DST:</span>
          <span 
            className={`font-bold truncate block uppercase text-[13.5px] tracking-wide ${
              (item.isDestinatarioCurvaA || (!item.isRemetenteCurvaA && item.isCurvaA))
                ? 'text-[#9D174D] bg-[#FCE7F3] border-[#FBCFE8] dark:text-pink-300 dark:bg-pink-500/10 px-1 py-0.2 rounded border dark:border-pink-500/20 font-black text-[13px]'
                : 'text-[var(--router-text)]'
            }`} 
            title={item.destinatario || 'SEM DESTINATÁRIO'}
          >
            {item.destinatario || 'SEM DESTINATÁRIO'}
            {(item.isDestinatarioCurvaA || (!item.isRemetenteCurvaA && item.isCurvaA)) && (
              <span className="text-[10px] font-black text-[#9D174D] dark:text-pink-400 ml-1 select-none">★ CURVA A</span>
            )}
          </span>
        </div>

        {/* Remetente */}
        <div className="flex items-center gap-1 leading-none w-full min-w-0 mt-0.5">
          <span className="text-[var(--router-text-muted)] font-black select-none shrink-0 text-[10.5px] tracking-tight">REM:</span>
          <span 
            className={`font-semibold shrink truncate block uppercase text-[12.5px] tracking-wide ${
              item.isRemetenteCurvaA 
                ? 'text-[#9D174D] bg-[#FCE7F3] border-[#FBCFE8] dark:text-pink-300 dark:bg-pink-500/10 px-1 py-0.2 rounded border dark:border-pink-500/20 font-black text-[12px]' 
                : 'text-[var(--router-text-muted)]'
            }`}
            title={item.remetente || 'SEM REMETENTE'}
          >
            {item.remetente || 'SEM REMETENTE'}
            {item.isRemetenteCurvaA && (
              <span className="text-[10px] font-black text-[#9D174D] dark:text-pink-400 ml-1 select-none">★ CURVA A</span>
            )}
          </span>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-mono select-text font-bold mt-0.5 leading-none text-[var(--router-primary)]">
          <span>
            CTRC:{' '}
            {(() => {
              const sswUrl = buildSswLink(item);
              if (!sswUrl) return item.id;
              return (
                <a
                  href={sswUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenSswCtrc}
                  className="hover:underline text-[var(--router-primary)] hover:text-indigo-500 dark:hover:text-indigo-300 cursor-pointer font-bold inline"
                  title="Abrir CTRC no SSW"
                >
                  {item.id}
                </a>
              );
            })()}
          </span>
          <span className="text-[var(--router-text-muted)]">•</span>
          <span>NF: {item.nf || 'S/N'}</span>
          {item.isCriticClient && (
            <span 
              className="bg-[var(--router-primary)] text-[#0F172A] font-black text-[9.5px] px-1 py-0.2 rounded shrink-0 select-none leading-none flex items-center gap-0.5"
              title={`${item.criticClientPrefix || 'CD'}: ${item.criticClientName || ''} (${item.criticClientReason || ''})`}
            >
              👑 {item.criticClientPrefix === 'CD' ? 'DIRETORIA' : 'ESPECIAL'}
            </span>
          )}
          {item.isFob && (
            <span className="router-badge router-badge-warning px-1 py-0.2 rounded text-[10px] font-black uppercase tracking-wider shrink-0 leading-none">
              FOB
            </span>
          )}
        </div>
      </div>

      {/* Block 4: [BLOCO OPERACIONAL SIMPLIFICADO EM HIERARQUIA CLARA] */}
      <div className={`min-w-0 ${padBlock4} flex flex-col justify-center leading-tight`}>
        {/* Linha 1: Previsão (data, SLA) */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono text-[var(--router-text-muted)] leading-none flex-wrap">
          {(() => {
            const hasNoPrev = !item.prev_ent || item.prev_ent.trim() === '' || item.prev_ent.toUpperCase() === 'SEM PREVISÃO' || item.prev_ent.toUpperCase() === 'S/PRAZO' || item.prev_ent.toUpperCase() === 'S/P' || item.prev_ent.toUpperCase() === 'SEM PREV';
            if (hasNoPrev) {
              return <span>PREV: SEM PREVISÃO</span>;
            }
            return (
              <>
                <span>PREV: {item.prev_ent}</span>
                <span>•</span>
                <span className={`font-black rounded-sm border px-1 py-0.2 text-[9.5px] leading-none ${
                  item.slaStatus?.isDelayed
                    ? 'router-badge router-badge-critical'
                    : item.slaStatus?.isToday
                    ? 'router-badge router-badge-warning'
                    : 'router-badge router-badge-neutral'
                }`}>
                  {(() => {
                    if (!item.slaStatus) return 'S/ PRAZO';
                    if (item.slaStatus.isDelayed) {
                      return `ATRASADO ${Math.abs(item.slaStatus.daysDiff)}D`;
                    }
                    if (item.slaStatus.isToday) {
                      return 'HOJE';
                    }
                    return `D+${item.slaStatus.daysDiff}`;
                  })()}
                </span>
              </>
            );
          })()}
          {(item.status === 'Agendamento' || item.planningStatus === 'AGENDADO') && (
            <span className="router-badge router-badge-info px-1 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider shrink-0 leading-none">
              AGENDADO
            </span>
          )}
        </div>

        {/* Linha 2: Status / Ocorrência (badge principal, descrição) */}
        <div className="flex items-center gap-1.5 text-[11px] leading-none w-full min-w-0 mt-1 flex-wrap">
          {/* Custom flow status label as MAIN badge (or simple text if Available) */}
          {flowStatusLabel === 'DISPONÍVEL' ? (
            <span className="text-[var(--router-text-muted)] font-mono font-bold text-[10px] uppercase shrink-0 leading-none flex items-center gap-1 select-none">
              🟢 Disponível
            </span>
          ) : (
            <span className={`font-mono font-black uppercase px-1.5 py-0.5 rounded border text-[10px] shrink-0 leading-none ${flowStatusStyles.bg} ${flowStatusStyles.text} ${flowStatusStyles.border}`}>
              {flowStatusLabel}
            </span>
          )}

          {/* Occurrence details */}
          <div className="min-w-0 flex items-center gap-1">
            {item.occurrenceCode ? (
              (() => {
                const code = String(item.occurrenceCode);
                let badgeStyles = "router-badge router-badge-critical";
                
                if (code === '57') {
                  badgeStyles = "router-badge router-badge-success";
                } else if (code === '59') {
                  badgeStyles = "router-badge router-badge-scheduled";
                } else if (code === '70') {
                  badgeStyles = "router-badge router-badge-warning";
                }

                return (
                  <span className={`font-mono font-bold uppercase px-1 py-0.2 rounded border text-[9px] shrink-0 leading-none ${badgeStyles}`}>
                    OC {item.occurrenceCode}
                  </span>
                );
              })()
            ) : null}

            {item.occurrenceCode ? (
              <span className="text-[var(--router-text-soft)] font-bold truncate text-[11px]" title={item.occurrenceDescription}>
                {item.occurrenceDescription === 'Ocorrência não mapeada' ? 'não mapeada' : item.occurrenceDescription}
              </span>
            ) : (
              flowStatusLabel === 'DISPONÍVEL' ? null : (
                <span className="text-emerald-600 dark:text-emerald-500 font-bold uppercase text-[11px] tracking-wide inline-flex items-center gap-0.5 leading-none">
                  🟢 SEM OCORRÊNCIA
                </span>
              )
            )}
          </div>
        </div>

        {/* Linha 3: Localização e Notas */}
        <div className="flex items-center gap-1.5 text-[11px] leading-none w-full min-w-0 mt-1 flex-wrap">
          {/* Clean location details */}
          {(() => {
            const normLoc = item.locationLabel ? item.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
            const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLoc;
            return (
              <span className="text-teal-600 dark:text-teal-400 font-mono text-[11px] truncate max-w-[210px] flex items-center gap-0.5" title={item.locationLabel || 'NÃO INFORMADO'}>
                📍<span className="font-extrabold uppercase text-[var(--router-text)] text-[11px]">{displayLoc}</span>
              </span>
            );
          })()}

          {item.occurrenceSector && (
            item.occurrenceSector.toUpperCase() === 'DISPONÍVEL' || item.occurrenceSector.toUpperCase() === 'DISPONIVEL' ? (
              <span className="text-[var(--router-text-muted)] font-mono text-[10px] leading-none whitespace-nowrap select-none">
                Setor: Disponível
              </span>
            ) : (
              <span className="font-extrabold bg-[var(--router-badge-scheduled)] text-[#0F172A] px-1 rounded-sm text-[9.5px] leading-none whitespace-nowrap uppercase tracking-wider">
                Setor: {item.occurrenceSector}
              </span>
            )
          )}

          {/* Micro operational note banner */}
          {item.operationalNote && (
            <div className="text-[11px] font-medium text-[var(--router-warning)] italic truncate" title={item.operationalNote}>
              Obs: {item.operationalNote}
            </div>
          )}
        </div>
      </div>

      {/* Block 5: [BLOCO NÚMEROS] - Peso (kg), Volumes, Valor e Frete */}
      <div className={`min-w-0 flex flex-col items-end justify-center text-right leading-none ${padBlock5} shrink-0 whitespace-nowrap text-[12px] font-mono bg-[var(--router-surface-2)]`}>
        <span className="text-[var(--router-text)] font-black text-[13px] leading-none">
          {(item.peso_r || item.weight || 0).toLocaleString('pt-BR')} kg
        </span>
        <span className="text-[var(--router-warning)] font-bold text-[12px] leading-none mt-1">
          {item.volume || 1} {item.volume === 1 ? 'vol' : 'vols'}
        </span>
        <span className="text-[var(--router-text-muted)] text-[12px] mt-1">
          R$ {(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
        <span className="text-[var(--router-primary)] text-[11px] mt-1">
          Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
        </>
      )}

      {dropdownOpen && (
        <div className="absolute inset-0 z-50 pointer-events-none" onClick={(e) => e.stopPropagation()}>
          {/* Click-away overlay specific to this item's dropdown */}
          <div 
            className="fixed inset-0 z-40 bg-transparent pointer-events-auto" 
            onClick={() => {
              setDropdownOpen(false);
              setMenuPosition(null);
            }} 
            onContextMenu={(e) => {
              e.preventDefault();
              setDropdownOpen(false);
              setMenuPosition(null);
            }}
          />

          {/* Absolute/Fixed Dropdown body */}
          <div 
            className={`${
              menuPosition 
                ? 'fixed' 
                : 'absolute top-2 right-4'
            } bg-[var(--router-surface)] backdrop-blur-md border border-[var(--router-border)] ${dropWidth} rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.95)] z-50 flex flex-col text-[var(--router-text)] select-none pointer-events-auto ${isCompact ? 'text-[9.2px]' : isComfortable ? 'text-[11.2px]' : 'text-[10px]'}`}
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.05))',
              ...(menuPosition ? {
                left: `${Math.min(menuPosition.x, window.innerWidth - 305)}px`,
                top: `${Math.min(menuPosition.y, window.innerHeight - 440)}px`,
              } : {})
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Dropdown Header */}
            <div className={`${dropHeaderPad} bg-[var(--router-surface-2)] border-b border-[var(--router-border)] flex items-center justify-between rounded-t-xl`}>
              <span className={`${dropHeaderText} font-sans font-black text-[var(--router-primary)] uppercase tracking-widest flex items-center gap-1.5`}>
                🛡️ Parâmetros CTRC {item.id}
              </span>
              <button 
                onClick={() => {
                  setDropdownOpen(false);
                  setMenuPosition(null);
                }}
                className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            
            {/* Option block 1: Route overwrite */}
            <div className={`${dropBlockPad} border-b border-[var(--router-border)] flex flex-col`}>
              <span className={`${labelTextSize} font-sans font-black text-[var(--router-primary)] uppercase tracking-wider block`}>
                📍 Rota Operacional
              </span>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ex: ROTA 04"
                  value={typedRoute}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTypedRoute(e.target.value.toUpperCase())}
                  className={`bg-[var(--router-input-bg)] border border-[var(--router-input-border)] text-[var(--router-text)] placeholder-slate-400 dark:placeholder-slate-650 font-mono font-bold rounded-lg focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 flex-1 uppercase tracking-wide ${inputPadY}`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePlanning?.(item.id, { operationalRoute: typedRoute || undefined });
                    setDropdownOpen(false);
                  }}
                  className={`bg-indigo-600 dark:bg-indigo-650 hover:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-95 text-white font-extrabold rounded-lg transition-all cursor-pointer uppercase shrink-0 leading-none shadow-sm ${buttonPadY}`}
                >
                  OK
                </button>
              </div>
            </div>

            {/* Option block 2: Priority modifiers */}
            <div className="flex flex-col py-1 border-b border-[var(--router-border)] bg-[var(--router-surface)]/50 bg-[var(--router-surface-2)]">
              <div className={`${priorityHeaderLabel} font-mono font-black text-[var(--router-text-muted)] uppercase tracking-widest select-none`}>
                Definir Alerta Prioridade
              </div>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'URGENTE', planningStatus: 'URGENTE' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-[var(--router-surface-3)] text-[var(--router-text)] font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'URGENTE' ? 'bg-red-50 dark:bg-red-500/5 text-red-700 dark:text-red-300 border-l-2 border-red-500 pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-405 shrink-0"><AlertCircle size={12} className="stroke-[2.5]" /></span>
                  <span className="font-extrabold tracking-wide uppercase group-hover/btn:text-red-700 dark:group-hover/btn:text-red-300 w-full text-left">P0 / URGENTE</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold text-red-700 dark:text-red-500/60 bg-red-50 dark:bg-red-500/10 px-1 py-0.2 rounded border border-red-200 dark:border-red-500/15 uppercase`}>CRÍTICO</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'PRIORIDADE', planningStatus: 'PRIORIDADE' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-[var(--router-surface-3)] text-[var(--router-text)] font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'PRIORIDADE' ? 'bg-[var(--router-warning)]/10 text-[var(--router-warning)] border-l-2 border-[var(--router-warning)] pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--router-warning)] shrink-0"><Star size={12} className="opacity-70" /></span>
                  <span className="font-bold tracking-wide uppercase group-hover/btn:opacity-80 w-full text-left">P1 / PRIORIDADE</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold router-badge router-badge-warning px-1 py-0.2 rounded uppercase`}>ALTO</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'SEGURAR', planningStatus: 'SEGURAR' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-[var(--router-surface-3)] text-[var(--router-text)] font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'SEGURAR' ? 'bg-[var(--router-danger)]/10 text-[var(--router-danger)] border-l-2 border-[var(--router-danger)] pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--router-danger)] shrink-0"><PauseCircle size={12} /></span>
                  <span className="font-black tracking-wide uppercase group-hover/btn:opacity-80 w-full text-left">SEGURAR CARGA</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold router-badge router-badge-danger px-1 py-0.2 rounded uppercase`}>HOLD</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'NAO_SAI_HOJE', planningStatus: 'NAO_SAI_HOJE' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-[var(--router-surface-3)] text-[var(--router-text-muted)] font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'NAO_SAI_HOJE' ? 'bg-[var(--router-surface-3)] text-[var(--router-text)] border-l-2 border-[var(--router-text-muted)] pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--router-text-muted)] shrink-0"><Ban size={12} /></span>
                  <span className="font-semibold tracking-wide uppercase group-hover/btn:opacity-80 w-full text-left">NÃO SAI HOJE</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold router-badge router-badge-neutral px-1 py-0.2 rounded uppercase`}>CORTE</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'AGENDADO', planningStatus: 'AGENDADO' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-[var(--router-surface-3)] text-[var(--router-text)] font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'AGENDADO' ? 'bg-[var(--router-info)]/10 text-[var(--router-info)] border-l-2 border-[var(--router-info)] pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[var(--router-info)] shrink-0"><Calendar size={12} /></span>
                  <span className="font-bold tracking-wide uppercase group-hover/btn:opacity-80 w-full text-left">AGENDADO</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold router-badge router-badge-info px-1 py-0.2 rounded uppercase`}>DATA</span>
              </button>
            </div>

            {/* Option block 3: Note comment editor */}
            <div className={`${dropBlockPad} border-b border-[var(--router-border)] flex flex-col`}>
              <span className={`${labelTextSize} font-sans font-black text-[var(--router-primary)] uppercase tracking-wider block`}>
                📝 Observação Operacional
              </span>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ex: Aguardando docs..."
                  value={typedNote}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTypedNote(e.target.value)}
                  className={`bg-[var(--router-input-bg)] border border-[var(--router-border)] text-[var(--router-text)] placeholder-[var(--router-text-muted)] focus:outline-none focus:border-[var(--router-primary)] focus:ring-1 focus:ring-[var(--router-primary)] flex-1 ${inputPadY}`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePlanning?.(item.id, { operationalNote: typedNote || undefined });
                    setDropdownOpen(false);
                  }}
                  className={`bg-[var(--router-primary)] hover:opacity-90 active:scale-95 text-white font-extrabold rounded-lg transition-all cursor-pointer uppercase shrink-0 leading-none shadow-sm ${buttonPadY}`}
                >
                  OK
                </button>
              </div>
            </div>

            {/* Option block 4: Clean reset */}
            <div className="p-2 bg-[var(--router-surface-2)] rounded-b-xl flex justify-center">
              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'NORMAL', planningStatus: 'A_PLANEJAR', operationalRoute: undefined, operationalNote: undefined });
                  setDropdownOpen(false);
                }}
                className={`w-full bg-[var(--router-surface)] border border-[var(--router-border)] hover:border-[var(--router-danger)] hover:bg-[var(--router-danger)]/10 text-[var(--router-text-muted)] hover:text-[var(--router-danger)] hover:shadow-[0_0_8px_rgba(239,68,68,0.05)] font-sans font-black rounded-lg text-center uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${resetBtnPad}`}
              >
                <RefreshCw size={11} className="transition-transform duration-300 group-hover:rotate-180" />
                Restaurar planejamento automático
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
