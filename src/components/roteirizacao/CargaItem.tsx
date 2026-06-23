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
        borderClass: 'border-l-red-500',
        badgeBg: 'bg-[#FFE4E6] dark:bg-red-500/10 text-[#BE123C] dark:text-red-400 border-[#FECDD3] dark:border-red-500/15 font-black',
        textClass: 'text-[#BE123C] dark:text-red-400',
        cardBg: 'bg-red-50/20 dark:bg-[#1a0e12]/15 hover:bg-red-50/50 dark:hover:bg-[#1a0e12]/30',
      };
    case 'PRIORIDADE':
      return {
        label: 'PRI',
        borderClass: 'border-l-amber-500',
        badgeBg: 'bg-[#FEF3C7] dark:bg-amber-500/10 text-[#92400E] dark:text-amber-300 border-[#FDE68A] dark:border-amber-500/15 font-bold',
        textClass: 'text-[#92400E] dark:text-amber-400',
        cardBg: 'bg-amber-50/15 dark:bg-[#1c140e]/15 hover:bg-amber-50/40 dark:hover:bg-[#1c140e]/30',
      };
    case 'SEGURAR':
      return {
        label: 'SEG',
        borderClass: 'border-l-orange-500',
        badgeBg: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 font-black',
        textClass: 'text-orange-700 dark:text-orange-450',
        cardBg: 'bg-orange-50/20 dark:bg-orange-950/[0.018] hover:bg-orange-50/50 dark:hover:bg-orange-950/[0.045]',
      };
    case 'NAO_SAI_HOJE':
      return {
        label: 'NÃO',
        borderClass: 'border-l-slate-400 dark:border-slate-700',
        badgeBg: 'bg-slate-100 dark:bg-slate-900/35 text-slate-500 border-slate-200 dark:border-slate-705/20',
        textClass: 'text-slate-400 dark:text-slate-500 line-through',
        cardBg: 'bg-slate-100/30 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-900/15 opacity-55 saturate-[45%]',
      };
    case 'AGENDADO':
      return {
        label: 'AGD',
        borderClass: 'border-l-cyan-500',
        badgeBg: 'bg-[#E0E7FF] dark:bg-cyan-500/10 text-[#3730A3] dark:text-cyan-300 border-[#C7D2FE] dark:border-cyan-500/15',
        textClass: 'text-[#3730A3] dark:text-cyan-300',
        cardBg: 'bg-cyan-50/15 dark:bg-cyan-950/[0.008] hover:bg-cyan-50/40 dark:hover:bg-cyan-950/[0.03]',
      };
    case 'CONSOLIDADO':
      return {
        label: 'CONS',
        borderClass: 'border-l-emerald-500',
        badgeBg: 'bg-[#DCFCE7] dark:bg-emerald-500/10 text-[#166534] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-500/15 font-black',
        textClass: 'text-[#166534] dark:text-emerald-400',
        cardBg: 'bg-emerald-50/15 dark:bg-emerald-950/[0.01] hover:bg-emerald-50/45 dark:hover:bg-emerald-950/[0.03]',
      };
    case 'PLANEJADO':
      return {
        label: 'PLAN',
        borderClass: 'border-l-emerald-400',
        badgeBg: 'bg-[#DCFCE7] dark:bg-emerald-400/10 text-[#166534] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-400/15',
        textClass: 'text-[#166534] dark:text-emerald-405',
        cardBg: 'bg-emerald-50/10 dark:bg-emerald-950/[0.005] hover:bg-emerald-50/30 dark:hover:bg-emerald-950/[0.018]',
      };
    case 'A_PLANEJAR':
    default:
      return {
        label: 'PEND',
        borderClass: 'border-l-slate-200 dark:border-indigo-500/15',
        badgeBg: 'bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
        textClass: 'text-slate-500 dark:text-slate-400',
        cardBg: 'bg-white dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/18',
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
    return { bg: 'bg-[#F1F5F9] dark:bg-slate-850/40', text: 'text-[#475569] dark:text-slate-300', border: 'border-[#E2E8F0] dark:border-slate-700/30' };
  }
  if (norm === 'PRÉ-ROMANEIO') {
    return { bg: 'bg-[#E0E7FF] dark:bg-indigo-950/40', text: 'text-[#3730A3] dark:text-indigo-300', border: 'border-[#C7D2FE] dark:border-indigo-500/20' };
  }
  if (norm === 'PROGRAMADO' || norm === 'CONSOLIDADO') {
    return { bg: 'bg-[#DBEAFE] dark:bg-blue-950/40', text: 'text-[#1D4ED8] dark:text-blue-300', border: 'border-[#BFDBFE] dark:border-blue-500/20' };
  }
  if (norm.includes('URGENTE') || norm.includes('PRIORITÁRIO') || norm.includes('RETIDO') || norm.includes('AUDIT') || norm.includes('PENDÊNCIA') || norm.includes('RETIDO/AUDIT')) {
    return { bg: 'bg-[#FFE4E6] dark:bg-red-950/40', text: 'text-[#BE123C] dark:text-red-400', border: 'border-[#FECDD3] dark:border-red-500/20' };
  }
  if (norm === 'HOLD') {
    return { bg: 'bg-[#FEF3C7] dark:bg-amber-950/40', text: 'text-[#92400E] dark:text-amber-300', border: 'border-[#FDE68A] dark:border-amber-500/20' };
  }
  if (norm === 'EM TRÂNSITO') {
    return { bg: 'bg-[#DBEAFE] dark:bg-blue-950/40', text: 'text-[#1D4ED8] dark:text-blue-300', border: 'border-[#BFDBFE] dark:border-blue-500/20' };
  }
  return { bg: 'bg-[#F1F5F9] dark:bg-[#101a2e]', text: 'text-[#475569] dark:text-slate-350', border: 'border-[#E2E8F0] dark:border-slate-800' };
};

const SSW_SERIES_BY_UNIT: Record<string, string> = {
  'RCS - VGA': 'BCA',
  'RCS - VGS': 'BCA',
  VGA: 'BCA',
  VGS: 'BCA',
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
      className={`border-b border-slate-200 dark:border-[#14203a]/45 grid grid-cols-[24px_minmax(180px,1fr)_minmax(310px,1.7fr)_minmax(360px,1.9fr)_minmax(110px,0.4fr)] items-stretch select-none transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-indigo-50/50 dark:bg-indigo-650/[0.07] shadow-[inset_2.5px_0_0_#4f46e5,inset_0_0_6px_rgba(99,102,241,0.035)]' 
          : pStyle.cardBg
      } hover:shadow-[0_1px_5px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_1px_5px_rgba(0,0,0,0.3)] group w-full ${dropdownOpen ? 'relative z-40 overflow-visible' : 'relative z-10 overflow-visible'} ${item.visualFlags?.rowClass || ''}`}
    >
      {/* Block 1: [FAIXA LATERAL COMPACTA SEM TEXTO REDUNDANTE] (24px) */}
      <div 
        className={`shrink-0 flex items-center justify-center border-l-[3.5px] ${pStyle.borderClass} ${isSelected ? 'bg-indigo-100/30 dark:bg-indigo-600/10' : 'bg-slate-100 dark:bg-slate-900/10'}`}
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
            className="w-3.5 h-3.5 cursor-pointer rounded-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070c14] focus:ring-0 accent-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Block 2: [BLOCO ROTA] - Cidade de Destaque e Linha Direcional */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock2} select-text leading-tight border-r border-slate-200 dark:border-[#14203a]/30 ${densityMode === 'planilha_operacional' ? 'py-1 px-2 gap-0.5 h-[52px]' : ''}`}>
        {densityMode === 'planilha_operacional' ? (
          <>
            {/* Linha 1: Cidade */}
            <span className="text-slate-900 dark:text-white font-extrabold text-[12.5px] uppercase tracking-wide truncate block" title={item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}>
              {item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}
            </span>
            {/* Linha 2: Rota e flags */}
            <div className="flex items-center gap-1 text-[11.5px] font-mono leading-none">
              <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase">
                {item.effectiveRoute || 'SEM ROTA'}
              </span>
              {item.isManualRoute && (
                <span className="text-orange-700 bg-orange-50 border border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-500/15 font-black uppercase text-[8.5px] px-1 py-0.2 rounded shrink-0 leading-none select-none">
                  MANUAL
                </span>
              )}
              {item.planningStatus === 'SEGURAR' && (
                <span className="text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-500/15 font-black uppercase text-[8.5px] px-1 py-0.2 rounded shrink-0 leading-none select-none">
                  SEGURAR
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-200 font-extrabold text-[15px] uppercase tracking-wide truncate block" title={item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}>
              {item.normCidade || item.cidade || item.cidade_ent || 'SEM CIDADE'}
            </span>
            
            <div className="flex flex-col gap-0.5 mt-0.5 leading-none">
              {/* Main Directing Route */}
              <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
                <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase text-[14px]">
                  {item.effectiveRoute || 'SEM ROTA'}
                </span>
                {item.isManualRoute && (
                  <span className="text-orange-700 bg-orange-50 border border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-500/15 font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                    MANUAL
                  </span>
                )}
                {item.planningStatus === 'SEGURAR' && (
                  <span className="text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-500/15 font-black uppercase text-[10px] px-1 py-0.2 rounded select-none shrink-0 leading-none">
                    SEGURAR
                  </span>
                )}
              </div>

              {/* Suggested route if Manual overwrite is active */}
              {item.isManualRoute && item.suggestedRoute && (
                <span className="text-slate-500 font-bold font-mono text-[11px] block truncate" title={`Sugestão: ${item.suggestedRoute}`}>
                  Sug.: {item.suggestedRoute}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Block 3: [BLOCO IDENTIDADE] - Destinatário, Remetente, CTRC e NF */}
      <div className={`min-w-0 flex flex-col justify-center text-left ${padBlock3} gap-0.5 select-text border-l border-slate-200 dark:border-[#131f38]/15 ${densityMode === 'planilha_operacional' ? 'py-1 px-2.5 h-[52px]' : ''}`}>
        {densityMode === 'planilha_operacional' ? (
          <>
            {/* Linha 1: Destinatário com possíveis destaques (FOB / Curva A) */}
            <div className="flex items-center gap-1 leading-none truncate w-full text-[12.5px] select-text">
              <span className="text-slate-400 dark:text-slate-500 font-bold select-none text-[9.5px] tracking-tight mr-0.5">DST:</span>
              <span 
                className={`font-bold uppercase truncate tracking-wide px-1 py-0.2 rounded border ${
                  item.isFob 
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-black' 
                    : item.isCurvaA
                    ? 'bg-[#FCE7F3] text-[#9D174D] border-[#FBCFE8] font-black'
                    : 'text-slate-900 dark:text-slate-100 border-transparent'
                }`}
                title={`${item.destinatario || ''}${item.isFob ? ' [FOB]' : ''}${item.isCurvaA ? ' [CURVA A]' : ''}`}
              >
                {item.destinatario || 'SEM DESTINATÁRIO'}
              </span>
              {item.isFob && (
                <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-1 rounded text-[8.5px] font-black uppercase tracking-wider select-none shrink-0 leading-none">
                  FOB
                </span>
              )}
              {item.isCurvaA && (
                <span className="bg-[#FCE7F3] text-[#9D174D] border border-[#FBCFE8] px-1 rounded text-[8.5px] font-black uppercase tracking-wider select-none shrink-0 leading-none">
                  ★ CURVA A
                </span>
              )}
            </div>

            {/* Linha 2: Remetente + CTRC + NF */}
            <div className="flex items-center gap-1.5 leading-none truncate w-full text-[11px] font-mono select-text mt-0.5 text-slate-550 dark:text-slate-450">
              <span className="text-slate-400 dark:text-slate-500 font-bold select-none text-[9px]">REM:</span>
              <span 
                className={`font-semibold truncate max-w-[120px] uppercase ${
                  item.isCurvaA 
                    ? 'text-[#9D174D] bg-[#FCE7F3]/40 border-[#FBCFE8]/30 px-1 rounded border font-black text-[10px]' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title={item.remetente}
              >
                {item.remetente || 'S/ R'}
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
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
                      className="hover:underline hover:text-indigo-500 cursor-pointer"
                    >
                      {item.id}
                    </a>
                  );
                })()}
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
              <span className="font-bold">NF: {item.nf || 'S/N'}</span>
            </div>
          </>
        ) : (
          <>
            {/* Destinatário */}
            <div className="flex items-center gap-1 leading-none truncate w-full">
              <span className="text-slate-400 dark:text-slate-500 font-black select-none shrink-0 text-[10.5px] tracking-tight">DST:</span>
              <span className="text-slate-800 dark:text-slate-105 font-bold truncate block uppercase text-[13.5px] tracking-wide" title={item.destinatario || 'SEM DESTINATÁRIO'}>
                {item.destinatario || 'SEM DESTINATÁRIO'}
              </span>
            </div>

            {/* Remetente */}
            <div className="flex items-center gap-1 leading-none truncate w-full mt-0.5">
              <span className="text-slate-400 dark:text-slate-500 font-black select-none shrink-0 text-[10.5px] tracking-tight">REM:</span>
              <span 
                className={`font-semibold shrink truncate block uppercase text-[12.5px] tracking-wide ${
                  item.isCurvaA 
                    ? 'text-[#9D174D] bg-[#FCE7F3] border-[#FBCFE8] dark:text-[#d8b4fe] dark:bg-purple-950/40 px-1 py-0.2 rounded border dark:border-purple-500/25 font-black text-[12px]' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title={item.remetente || 'SEM REMETENTE'}
              >
                {item.remetente || 'SEM REMETENTE'}
                {item.isCurvaA && <span className="text-[10px] font-black text-[#9D174D] dark:text-purple-400 ml-1 select-none">★ CURVA A</span>}
              </span>
            </div>

            {/* Info row */}
            <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-mono select-text font-bold mt-0.5 leading-none text-indigo-600 dark:text-indigo-350">
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
                      className="hover:underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 cursor-pointer font-bold inline"
                      title="Abrir CTRC no SSW"
                    >
                      {item.id}
                    </a>
                  );
                })()}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>NF: {item.nf || 'S/N'}</span>
              {item.isCriticClient && (
                <span 
                  className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-black text-[9.5px] px-1 py-0.2 rounded border border-violet-200 dark:border-violet-500/20 shrink-0 select-none leading-none flex items-center gap-0.5 shrink-0"
                  title={`${item.criticClientPrefix || 'CD'}: ${item.criticClientName || ''} (${item.criticClientReason || ''})`}
                >
                  👑 {item.criticClientPrefix === 'CD' ? 'DIRETORIA' : 'ESPECIAL'}
                </span>
              )}
              {item.isFob && (
                <span className="bg-amber-550/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1 py-0.2 rounded text-[10px] font-black uppercase tracking-wider shrink-0 leading-none">
                  FOB
                </span>
              )}
            </div>
          </>
        )}
      </div>
          {/* Block 4: [BLOCO OPERACIONAL SIMPLIFICADO EM HIERARQUIA CLARA] */}
      <div className={`min-w-0 ${padBlock4} flex flex-col justify-center leading-tight border-l border-slate-200 dark:border-[#131f38]/15 ${densityMode === 'planilha_operacional' ? 'py-1 px-2.5 gap-0.5 h-[52px]' : ''}`}>
        {densityMode === 'planilha_operacional' ? (
          <>
            {/* Linha 1: Previsão de entrega (cores condicionais) + Status / Ocorrência simplificado */}
            <div className="flex items-center gap-1.5 text-[11.5px] leading-none flex-wrap">
              {(() => {
                const hasNoPrev = !item.prev_ent || item.prev_ent.trim() === '' || item.prev_ent.toUpperCase() === 'SEM PREVISÃO' || item.prev_ent.toUpperCase() === 'S/PRAZO' || item.prev_ent.toUpperCase() === 'S/P' || item.prev_ent.toUpperCase() === 'SEM PREV';
                
                let prevStyles = 'bg-[#F1F5F9] text-[#64748B] border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800';
                let label = 'SEM PREV';
                
                if (!hasNoPrev) {
                  label = item.prev_ent;
                  if (item.slaStatus?.isDelayed) {
                    prevStyles = 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40';
                  } else if (item.slaStatus?.isToday) {
                    prevStyles = 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC] dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40';
                  } else {
                    prevStyles = 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40';
                  }
                }

                return (
                  <span className={`font-mono font-black uppercase px-1.5 py-0.5 rounded border text-[9.5px] shrink-0 leading-none flex items-center gap-1 ${prevStyles}`}>
                    📅 {label}
                    {item.slaStatus?.isDelayed && <span className="text-[8px] font-bold">ATRASADO</span>}
                    {item.slaStatus?.isToday && <span className="text-[8px] font-bold">HOJE</span>}
                  </span>
                );
              })()}

              {/* Status ou Ocorrência simples */}
              {flowStatusLabel === 'DISPONÍVEL' ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-mono font-extrabold text-[10.5px] uppercase shrink-0 leading-none flex items-center gap-0.5 select-none ml-1">
                  🟢 DISPONÍVEL
                </span>
              ) : (
                <span className={`font-mono font-extrabold uppercase px-1 py-0.2 rounded border text-[9.5px] shrink-0 leading-none ${flowStatusStyles.bg} ${flowStatusStyles.text} ${flowStatusStyles.border}`}>
                  {flowStatusLabel}
                </span>
              )}

              {item.occurrenceCode && (
                <span className="font-mono font-black text-red-700 dark:text-red-400 text-[9.5px]">
                  OC {item.occurrenceCode}
                </span>
              )}
            </div>

            {/* Linha 2: Localização + OBS (Planilha-style) */}
            <div className="flex items-center gap-1.5 text-[11px] leading-none w-full min-w-0 mt-0.5 flex-wrap">
              {/* Localização compacta */}
              {(() => {
                const normLoc = item.locationLabel ? item.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
                const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOC' : normLoc;
                return (
                  <span className="text-slate-500 dark:text-slate-450 font-mono font-bold flex items-center gap-0.5 text-[10.5px] uppercase shrink-0" title={item.locationLabel || 'NÃO INFORMADO'}>
                    📍 {displayLoc}
                  </span>
                );
              })()}

              {/* OBS compacta estilo planilha (fundo amarelo claro #FFF7DB, texto #92400E) */}
              <div 
                className="bg-[#FFF7DB] text-[#92400E] border border-[#F5E6C4] rounded px-1.5 py-0.5 text-[10px] font-mono leading-none font-semibold truncate flex-1 min-w-[100px] dark:bg-[#342711] dark:text-[#fcd34d] dark:border-[#54411d]" 
                title={item.operationalNote || 'Sem observações'}
              >
                {item.operationalNote ? `OBS: ${item.operationalNote}` : '-'}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Linha 1: Previsão (data, SLA) */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono text-slate-500 dark:text-slate-450 leading-none flex-wrap">
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
                        ? 'bg-[#FFE4E6] dark:bg-red-500/10 text-[#BE123C] dark:text-red-400 border-[#FECDD3] dark:border-red-500/15'
                        : item.slaStatus?.isToday
                        ? 'bg-[#FEF3C7] dark:bg-amber-500/10 text-[#92400E] dark:text-amber-400 border-[#FDE68A] dark:border-amber-500/15'
                        : 'bg-[#F1F5F9] dark:bg-slate-900/30 text-[#475569] dark:text-slate-400 border-[#E2E8F0] dark:border-slate-755/20'
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
                <span className="bg-[#E0E7FF] dark:bg-cyan-500/10 text-[#3730A3] dark:text-cyan-300 border border-[#C7D2FE] dark:border-cyan-500/25 px-1 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wider shrink-0 leading-none">
                  AGENDADO
                </span>
              )}
            </div>

            {/* Linha 2: Status / Ocorrência (badge principal, descrição) */}
            <div className="flex items-center gap-1.5 text-[11px] leading-none w-full min-w-0 mt-1 flex-wrap">
              {/* Custom flow status label as MAIN badge (or simple text if Available) */}
              {flowStatusLabel === 'DISPONÍVEL' ? (
                <span className="text-slate-550 dark:text-slate-400 font-mono font-bold text-[10px] uppercase shrink-0 leading-none flex items-center gap-1 select-none">
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
                    let badgeStyles = "bg-[#FFE4E6] dark:bg-red-950/40 text-[#BE123C] dark:text-red-400 border-[#FECDD3] dark:border-red-500/20";
                    
                    if (code === '57') {
                      badgeStyles = "bg-[#DCFCE7] dark:bg-emerald-500/10 text-[#166534] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-500/15";
                    } else if (code === '59') {
                      badgeStyles = "bg-[#DBEAFE] dark:bg-blue-950/40 text-[#1D4ED8] dark:text-blue-300 border-[#BFDBFE] dark:border-blue-500/15";
                    } else if (code === '70') {
                      badgeStyles = "bg-[#FEF3C7] dark:bg-amber-950/40 text-[#92400E] dark:text-amber-300 border-[#FDE68A] dark:border-amber-500/15";
                    }

                    return (
                      <span className={`font-mono font-bold uppercase px-1 py-0.2 rounded border text-[9px] shrink-0 leading-none ${badgeStyles}`}>
                        OC {item.occurrenceCode}
                      </span>
                    );
                  })()
                ) : null}

                {item.occurrenceCode ? (
                  <span className="text-slate-600 dark:text-slate-400 font-bold truncate text-[11px]" title={item.occurrenceDescription}>
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
                    📍<span className="font-extrabold uppercase text-slate-800 dark:text-slate-300 text-[11px]">{displayLoc}</span>
                  </span>
                );
              })()}

              {item.occurrenceSector && (
                item.occurrenceSector.toUpperCase() === 'DISPONÍVEL' || item.occurrenceSector.toUpperCase() === 'DISPONIVEL' ? (
                  <span className="text-slate-550 dark:text-slate-400 font-mono text-[10px] leading-none whitespace-nowrap select-none">
                    Setor: Disponível
                  </span>
                ) : (
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 px-1 rounded-sm border border-indigo-250 dark:border-indigo-800/20 text-[9.5px] leading-none whitespace-nowrap uppercase tracking-wider">
                    Setor: {item.occurrenceSector}
                  </span>
                )
              )}

              {/* Micro operational note banner */}
              {item.operationalNote && (
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-305 italic truncate" title={item.operationalNote}>
                  Obs: {item.operationalNote}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Block 5: [BLOCO NÚMEROS] - Peso (kg), Volumes, Valor e Frete */}
      <div className={`min-w-0 flex flex-col items-end justify-center text-right leading-none ${padBlock5} shrink-0 whitespace-nowrap text-[12px] font-mono border-l border-slate-200 dark:border-[#131f38]/15 bg-slate-50/30 dark:bg-[#070c14]/15 ${densityMode === 'planilha_operacional' ? 'py-1 px-2 h-[52px]' : ''}`}>
        {densityMode === 'planilha_operacional' ? (
          <>
            {/* Linha 1: Peso com cor condicional + Valor com cor condicional */}
            <div className="flex items-center gap-1 leading-none text-[11px] tracking-tight">
              {/* Peso condicional */}
              {(() => {
                const p = item.peso_r || item.weight || 0;
                let pClass = 'text-slate-650 dark:text-slate-300';
                if (p > 10 && p <= 100) {
                  pClass = 'text-emerald-800 dark:text-emerald-400 bg-emerald-550/10 border-emerald-500/15 px-1 py-0.2 rounded border font-bold';
                } else if (p > 100 && p <= 500) {
                  pClass = 'text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-550/15 px-1 py-0.2 rounded border font-bold';
                } else if (p > 500) {
                  pClass = 'text-red-850 dark:text-red-400 bg-red-500/10 border-red-500/15 px-1 py-0.2 rounded border font-black';
                }
                return (
                  <span className={pClass} title="Peso">
                    {p.toLocaleString('pt-BR')} kg
                  </span>
                );
              })()}

              <span className="text-slate-300 dark:text-slate-700 select-none">|</span>

              {/* Valor condicional */}
              {(() => {
                const v = item.valor || 0;
                let vClass = 'text-slate-650 dark:text-slate-300';
                if (v >= 5000 && v < 20000) {
                  vClass = 'text-emerald-800 dark:text-emerald-400 bg-emerald-550/10 border-emerald-500/15 px-1 py-0.2 rounded border font-bold';
                } else if (v >= 20000 && v < 100000) {
                  vClass = 'text-cyan-850 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/15 px-1 py-0.2 rounded border font-black';
                } else if (v >= 100000) {
                  vClass = 'text-rose-800 dark:text-rose-400 bg-rose-500/10 border-rose-500/15 px-1 py-0.2 rounded border font-black';
                }
                return (
                  <span className={vClass} title="Valor Mercadoria">
                    R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                );
              })()}
            </div>

            {/* Linha 2: Frete + Volumes count */}
            <div className="flex items-center gap-1.5 leading-none mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{item.volume || 1} {item.volume === 1 ? 'vol' : 'vols'}</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-800 dark:text-slate-105 font-black text-[13px] leading-none">
              {(item.peso_r || item.weight || 0).toLocaleString('pt-BR')} kg
            </span>
            <span className="text-amber-700 dark:text-amber-455 font-bold text-[12px] leading-none mt-1">
              {item.volume || 1} {item.volume === 1 ? 'vol' : 'vols'}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[12px] mt-1">
              R$ {(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-indigo-600 dark:text-indigo-350 text-[11px] mt-1">
              Fr: R$ {(item.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </>
        )}
      </div>

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
            } bg-white dark:bg-[#0b132a]/95 backdrop-blur-md border border-slate-200 dark:border-[#1d2d53] ${dropWidth} rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.95)] z-50 flex flex-col text-slate-800 dark:text-slate-200 select-none pointer-events-auto ${isCompact ? 'text-[9.2px]' : isComfortable ? 'text-[11.2px]' : 'text-[10px]'}`}
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
            <div className={`${dropHeaderPad} bg-slate-50 dark:bg-[#0e1732] border-b border-slate-200 dark:border-[#1c2e5c] flex items-center justify-between rounded-t-xl`}>
              <span className={`${dropHeaderText} font-sans font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5`}>
                🛡️ Parâmetros CTRC {item.id}
              </span>
              <button 
                onClick={() => {
                  setDropdownOpen(false);
                  setMenuPosition(null);
                }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            
            {/* Option block 1: Route overwrite */}
            <div className={`${dropBlockPad} border-b border-slate-150 dark:border-[#16223f]/70 flex flex-col`}>
              <span className={`${labelTextSize} font-sans font-black text-indigo-600 dark:text-indigo-350 uppercase tracking-wider block`}>
                📍 Rota Operacional
              </span>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ex: ROTA 04"
                  value={typedRoute}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTypedRoute(e.target.value.toUpperCase())}
                  className={`bg-slate-50 dark:bg-[#05080f] border border-slate-200 dark:border-[#16223f] text-slate-800 dark:text-slate-105 placeholder-slate-400 dark:placeholder-slate-650 font-mono font-bold rounded-lg focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 flex-1 uppercase tracking-wide ${inputPadY}`}
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
            <div className="flex flex-col py-1 border-b border-slate-150 dark:border-[#16223f]/70 bg-slate-50/50 dark:bg-[#070c16]/30">
              <div className={`${priorityHeaderLabel} font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none`}>
                Definir Alerta Prioridade
              </div>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'URGENTE', planningStatus: 'URGENTE' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
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
                className={`${priorityBtnPad} text-left hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'PRIORIDADE' ? 'bg-amber-50 dark:bg-amber-500/5 text-amber-800 dark:text-amber-300 border-l-2 border-amber-500 pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400 shrink-0"><Star size={12} className="fill-amber-400/20" /></span>
                  <span className="font-bold tracking-wide uppercase group-hover/btn:text-amber-800 dark:group-hover/btn:text-amber-300 w-full text-left">P1 / PRIORIDADE</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold text-amber-700 dark:text-amber-500/60 bg-amber-50 dark:bg-amber-500/10 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-500/15 uppercase`}>ALTO</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'SEGURAR', planningStatus: 'SEGURAR' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-orange-50 dark:hover:bg-orange-500/10 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'SEGURAR' ? 'bg-orange-50 dark:bg-orange-500/5 text-orange-700 dark:text-orange-305 border-l-2 border-orange-500 pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 dark:text-orange-400 shrink-0"><PauseCircle size={12} /></span>
                  <span className="font-black tracking-wide uppercase group-hover/btn:text-orange-700 dark:group-hover/btn:text-orange-300 w-full text-left">SEGURAR CARGA</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold text-orange-700 dark:text-orange-500/60 bg-orange-50 dark:bg-orange-500/10 px-1 py-0.2 rounded border border-orange-200 dark:border-orange-500/15 uppercase`}>HOLD</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'NAO_SAI_HOJE', planningStatus: 'NAO_SAI_HOJE' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-slate-100 dark:hover:bg-slate-700/15 text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'NAO_SAI_HOJE' ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-l-2 border-slate-400 dark:border-slate-600 pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 shrink-0"><Ban size={12} /></span>
                  <span className="font-semibold tracking-wide uppercase group-hover/btn:text-slate-700 dark:group-hover/btn:text-slate-300 w-full text-left">NÃO SAI HOJE</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold text-slate-600 dark:text-slate-500/80 bg-slate-200 dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700/30 uppercase`}>CORTE</span>
              </button>

              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'AGENDADO', planningStatus: 'AGENDADO' });
                  setDropdownOpen(false);
                }}
                className={`${priorityBtnPad} text-left hover:bg-cyan-50 dark:hover:bg-cyan-500/10 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-between group/btn transition-all cursor-pointer ${
                  item.planningStatus === 'AGENDADO' ? 'bg-cyan-50 dark:bg-cyan-550/5 text-cyan-700 dark:text-cyan-300 border-l-2 border-cyan-500 pl-2' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-600 dark:text-cyan-400 shrink-0"><Calendar size={12} /></span>
                  <span className="font-bold tracking-wide uppercase group-hover/btn:text-cyan-700 dark:group-hover/btn:text-cyan-305 w-full text-left">AGENDADO</span>
                </div>
                <span className={`${tagTextSize} font-mono font-semibold text-cyan-700 dark:text-cyan-500/60 bg-cyan-50 dark:bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-200 dark:border-cyan-500/15 uppercase`}>DATA</span>
              </button>
            </div>

            {/* Option block 3: Note comment editor */}
            <div className={`${dropBlockPad} border-b border-slate-150 dark:border-[#16223f]/70 flex flex-col`}>
              <span className={`${labelTextSize} font-sans font-black text-indigo-600 dark:text-indigo-350 uppercase tracking-wider block`}>
                📝 Observação Operacional
              </span>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Ex: Aguardando docs..."
                  value={typedNote}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTypedNote(e.target.value)}
                  className={`bg-slate-50 dark:bg-[#05080f] border border-slate-200 dark:border-[#16223f] text-slate-800 dark:text-slate-105 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 flex-1 ${inputPadY}`}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePlanning?.(item.id, { operationalNote: typedNote || undefined });
                    setDropdownOpen(false);
                  }}
                  className={`bg-indigo-600 dark:bg-indigo-650 hover:bg-indigo-500 dark:hover:bg-indigo-600 active:scale-95 text-white font-extrabold rounded-lg transition-all cursor-pointer uppercase shrink-0 leading-none shadow-sm ${buttonPadY}`}
                >
                  OK
                </button>
              </div>
            </div>

            {/* Option block 4: Clean reset */}
            <div className="p-2 bg-slate-100 dark:bg-[#061021] rounded-b-xl flex justify-center">
              <button
                onClick={() => {
                  onUpdatePlanning?.(item.id, { manualPriority: 'NORMAL', planningStatus: 'A_PLANEJAR', operationalRoute: undefined, operationalNote: undefined });
                  setDropdownOpen(false);
                }}
                className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500/20 hover:bg-red-550/[0.06] text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.05)] font-sans font-black rounded-lg text-center uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${resetBtnPad}`}
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
