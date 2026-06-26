import React, { useState } from 'react';
import { AppUser, RoteirizacaoDiagnostics, DensityMode } from '../../types';
import { DEFAULT_OPERATIONAL_UNIT, getOperationalUnits } from '../../constants/operationalUnits';

interface RoteirizacaoHeaderProps {
  adminUser: AppUser;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  uniqueUnits?: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCtrcsCount: number;
  filteredCtrcsCount: number;
  onClearFilters: () => void;
  currentTime?: string;
  onOpenFleetDrawer?: () => void;
  draftCount?: number;
  planningDate?: string;
  onOpenDiagnostics?: () => void;
  diagnostics?: RoteirizacaoDiagnostics;
  isAvisosOpen?: boolean;
  setIsAvisosOpen?: (open: boolean) => void;
  noticesCount?: number;
  highestNoticeSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
  densityMode?: DensityMode;
  onUpdateDensity?: (density: DensityMode) => void;
  mesaScale?: '85%' | '90%' | '100%' | '110%' | '120%';
  onUpdateMesaScale?: (scale: '85%' | '90%' | '100%' | '110%' | '120%') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  onlineStatus?: boolean;
  activeUsersCount?: number;
  activeUsersList?: any[];
  lastSyncTime?: string;
  showDelivered?: boolean;
  onToggleShowDelivered?: (show: boolean) => void;
}

export default function RoteirizacaoHeader({
  adminUser,
  selectedUnit,
  setSelectedUnit,
  uniqueUnits = [],
  searchQuery,
  setSearchQuery,
  totalCtrcsCount,
  filteredCtrcsCount,
  onClearFilters,
  currentTime = '12:00',
  onOpenFleetDrawer,
  draftCount = 0,
  planningDate,
  onOpenDiagnostics,
  diagnostics,
  isAvisosOpen = true,
  setIsAvisosOpen,
  noticesCount = 0,
  highestNoticeSeverity = 'INFO',
  densityMode = 'default',
  onUpdateDensity,
  mesaScale = '100%',
  onUpdateMesaScale,
  theme = 'dark',
  onToggleTheme,
  onManualSync,
  isSyncing = false,
  onlineStatus = true,
  activeUsersCount = 1,
  activeUsersList = [],
  lastSyncTime,
  showDelivered = false,
  onToggleShowDelivered,
}: RoteirizacaoHeaderProps) {
  const [showUsersPopover, setShowUsersPopover] = useState(false);
  const formattedPlanningDate = planningDate 
    ? new Date(planningDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const hasVisibilityAlert = !!(diagnostics && diagnostics.totalAfterEnrichment > 0 && (diagnostics.totalFinalVisible === 0 || (diagnostics.totalFinalVisible / diagnostics.totalAfterEnrichment) < 0.05));
  const warningsCount = diagnostics?.warnings?.length ?? 0;

  const titleClass = "font-black text-[var(--router-primary)] dark:text-[var(--router-text)] tracking-tight text-xs md:text-sm uppercase leading-none truncate";
  const subtitleClass = "font-sans text-[var(--router-primary)] dark:text-[var(--router-text-muted)] font-bold tracking-wider text-[9px] leading-none mt-0.5 flex items-center gap-1.5 flex-wrap";

  const btnClass = "bg-[var(--router-primary)] hover:opacity-90 text-white border border-transparent rounded font-bold text-[11px] px-2 py-1 h-8 transition-all flex items-center gap-1 cursor-pointer select-none leading-none shrink-0";
  const btnSecondaryClass = "bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-[var(--router-text)] border border-[var(--router-border)] rounded font-bold text-[11px] px-2 py-1 h-8 transition-all cursor-pointer select-none leading-none flex items-center justify-center gap-1 shrink-0";
  const badgeClass = "bg-[var(--router-surface)] border border-[var(--router-border)] rounded font-mono text-[var(--router-primary)] text-[11px] px-1.5 py-1 h-8 items-center leading-none shrink-0 hidden 2xl:flex";

  const searchInputClass = "w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-md pl-6 pr-2 py-1 text-[var(--router-text)] placeholder-[var(--router-text-muted)] focus:outline-none focus:border-[var(--router-primary)] text-[11px] h-8 transition-all uppercase";
  const rightStatusClass = "font-sans bg-[var(--router-surface-2)] rounded border border-[var(--router-border)] px-1.5 py-1 h-8 flex items-center text-[10px] text-[var(--router-text-muted)] leading-none shrink-0";

  return (
    <div className="router-header py-1.5 px-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2 shrink-0 select-none min-h-[44px]">
      
      {/* 1. Brand, Plan, Filial */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <div className="flex items-center shrink-0">
          {adminUser.is_master ? (
            <div className="flex items-center gap-1 bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded px-2 py-1 shadow-sm h-8 cursor-pointer relative transition-colors">
              <span className="text-[var(--router-text-muted)] font-bold text-[10px] uppercase tracking-wider select-none">FILIAL:</span>
              <select
                id="header-unit-selector"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-transparent text-[var(--router-text)] font-black focus:outline-none cursor-pointer text-[12px] leading-none transition-all border-none select-none uppercase appearance-none pr-3"
              >
                <option value="TODAS" className="bg-[var(--router-surface-2)] text-[var(--router-text)] font-semibold">TODAS</option>
                {uniqueUnits.map(u => (
                  <option key={u} value={u} className="bg-[var(--router-surface-2)] text-[var(--router-text)] font-bold">{u}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                <svg className="w-2.5 h-2.5 text-indigo-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded px-2 py-1 shadow-sm h-8" title="Unidade restrita">
              <span className="text-[var(--router-text-muted)] font-bold text-[10px] uppercase tracking-wider select-none">FILIAL:</span>
              <span className="text-[var(--router-text)] font-black text-[12px] leading-none flex items-center gap-1 select-none">
                🔒 {(adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 ml-1">
          <h1 className={`${titleClass} uppercase`}>Mesa de Roteirização</h1>
          <div className={subtitleClass}>
            <span>Plano: {formattedPlanningDate}</span>
          </div>
        </div>
      </div>

      {/* 2. Busca */}
      <div className="relative flex-1 min-w-[150px] max-w-[280px] h-8 shrink-1 w-full xl:w-auto order-3 xl:order-2">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--router-text-muted)] text-[11px] font-mono select-none">🔍</span>
        <input
          id="header-universal-search"
          type="text"
          placeholder="Buscar CTRC, NF..."
          title="Buscar CTRC, NF, destinatário ou remetente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={searchInputClass}
        />
      </div>

      {/* 3. Controls (Buttons & Selects) */}
      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto xl:overflow-visible pb-1 xl:pb-0 hide-scrollbar w-full xl:w-auto order-2 xl:order-3">
        
        {/* Avisos Operacionais */}
        {!isAvisosOpen && noticesCount > 0 && (
          <button
            type="button"
            onClick={() => setIsAvisosOpen?.(true)}
            className={`rounded font-extrabold text-[11px] px-2 py-1 h-8 transition-all cursor-pointer select-none leading-none flex items-center gap-1 shrink-0 border shadow-sm ${
              highestNoticeSeverity === 'CRITICAL'
                ? 'bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)]/20 border-[var(--router-danger)]/30 text-[var(--router-danger)] animate-pulse'
                : highestNoticeSeverity === 'WARNING'
                ? 'bg-[var(--router-warning)]/10 hover:bg-[var(--router-warning)]/20 border-[var(--router-warning)]/30 text-[var(--router-warning)]'
                : 'bg-[var(--router-info)]/10 hover:bg-[var(--router-info)]/20 border-[var(--router-info)]/30 text-[var(--router-info)]'
            }`}
            title="Reabrir Avisos Operacionais"
            id="reopen-notices-badge"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                highestNoticeSeverity === 'CRITICAL' ? 'bg-red-400' : highestNoticeSeverity === 'WARNING' ? 'bg-amber-400' : 'bg-blue-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                highestNoticeSeverity === 'CRITICAL' ? 'bg-red-500' : highestNoticeSeverity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
              }`}></span>
            </span>
            <span className="hidden lg:inline">Avisos</span>
            <span>({noticesCount})</span>
          </button>
        )}

        {/* Layout/Escala Group */}
        {(onUpdateDensity || onUpdateMesaScale) && (
          <div className="flex items-center bg-[var(--router-surface)] border border-[var(--router-border)] rounded h-8 text-[10px] select-none text-[var(--router-text-muted)] shrink-0 overflow-hidden">
            {onUpdateDensity && (
              <div className="flex items-center px-1.5 border-r border-[var(--router-border)]">
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 hidden lg:inline" title="Layout da Mesa">Layout:</span>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 lg:hidden" title="Layout da Mesa">L:</span>
                <select
                  value={densityMode}
                  onChange={(e) => onUpdateDensity(e.target.value as DensityMode)}
                  className="bg-transparent border-none text-[var(--router-text)] font-black uppercase text-[10px] tracking-wider cursor-pointer focus:outline-none select-none h-full py-1"
                  title="Layout da Mesa"
                >
                  <option value="default" className="bg-[var(--router-bg)] text-[var(--router-text)]">PAD</option>
                  <option value="compact" className="bg-[var(--router-bg)] text-[var(--router-text)]">COMP</option>
                  <option value="planilha_operacional" className="bg-[var(--router-bg)] text-[var(--router-text)]">PLAN</option>
                </select>
              </div>
            )}
            {onUpdateMesaScale && (
              <div className="flex items-center px-1.5">
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 hidden lg:inline" title="Escala da Mesa">Escala:</span>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wide mr-1 lg:hidden" title="Escala da Mesa">E:</span>
                <select
                  value={mesaScale}
                  onChange={(e) => onUpdateMesaScale(e.target.value as any)}
                  className="bg-transparent border-none text-[var(--router-text)] font-black uppercase text-[10px] tracking-wider cursor-pointer focus:outline-none select-none h-full py-1"
                  title="Escala da Mesa"
                >
                  <option value="85%" className="bg-[var(--router-bg)] text-[var(--router-text)]">85%</option>
                  <option value="90%" className="bg-[var(--router-bg)] text-[var(--router-text)]">90%</option>
                  <option value="100%" className="bg-[var(--router-bg)] text-[var(--router-text)]">100%</option>
                  <option value="110%" className="bg-[var(--router-bg)] text-[var(--router-text)]">110%</option>
                  <option value="120%" className="bg-[var(--router-bg)] text-[var(--router-text)]">120%</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Limpar button */}
        <button
          id="btn-clear-filters-header"
          onClick={onClearFilters}
          className={btnSecondaryClass}
          title="Limpar filtros"
        >
          <span className="hidden lg:inline">Limpar</span>
          <span className="lg:hidden material-symbols-outlined text-[14px]">filter_alt_off</span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            id="btn-toggle-theme-mesa"
            onClick={onToggleTheme}
            className={btnSecondaryClass}
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className="material-symbols-outlined text-[14px] select-none">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        )}

        {/* Show Delivered Toggle Button */}
        {onToggleShowDelivered && (
          <button
            id="btn-toggle-show-delivered"
            onClick={() => onToggleShowDelivered(!showDelivered)}
            className={`${btnSecondaryClass} ${showDelivered ? 'bg-[var(--router-primary-alpha)] border-[var(--router-primary)] text-[var(--router-primary)]' : ''}`}
            title={showDelivered ? 'Ocultar Entregues/Finalizados' : 'Mostrar Entregues/Finalizados'}
          >
            <span className="material-symbols-outlined text-[14px] select-none">
              {showDelivered ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}

        {/* Sync Controls */}
        <div className="flex items-center bg-[var(--router-surface)] border border-[var(--router-border)] rounded h-8 overflow-visible shrink-0 relative">
          <div className="flex items-center px-2 border-r border-[var(--router-border)]" title={onlineStatus ? "Supabase Online" : "Supabase Offline"}>
            <div className={`w-2 h-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <div 
            className="flex items-center px-2 border-r border-[var(--router-border)] cursor-pointer hover:bg-[var(--router-surface-3)] transition-colors h-full" 
            title="Usuários Ativos (Presence)"
            onClick={() => {
              if (adminUser.is_master) {
                setShowUsersPopover(!showUsersPopover);
              }
            }}
          >
            <span className="material-symbols-outlined text-[12px] text-[var(--router-text-muted)] mr-1">group</span>
            <span className="text-[10px] font-bold font-mono text-[var(--router-text)]">{activeUsersCount}</span>
          </div>

          {showUsersPopover && adminUser.is_master && (
            <div className="absolute top-10 right-0 z-[100] w-64 bg-[var(--router-surface)] border border-[var(--router-border)] rounded shadow-xl flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--router-border)] bg-[var(--router-surface-2)] flex justify-between items-center">
                <span className="text-[11px] font-bold text-[var(--router-text)]">Usuários Ativos ({activeUsersCount})</span>
                <button onClick={() => setShowUsersPopover(false)} className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] material-symbols-outlined text-[14px]">close</button>
              </div>
              <div className="flex flex-col max-h-64 overflow-y-auto">
                {activeUsersList.map(u => (
                  <div key={u.id} className="p-2 border-b border-[var(--router-border)] last:border-b-0 text-[10px] flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--router-text)] truncate">{u.name || u.username} <span className="font-normal text-[var(--router-text-muted)]">({u.username})</span></span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${u.role === 'master' ? 'bg-purple-500/20 text-purple-500' : 'bg-[var(--router-surface-3)] text-[var(--router-text-muted)]'}`}>{u.role || 'user'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[var(--router-text-muted)]">
                      <span>Filial: {u.company_code}</span>
                      <span>Visto: {new Date(u.last_seen_at).toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <div className="text-[var(--router-text-muted)] truncate" title={u.current_view}>
                      Tela: <span className="text-[var(--router-primary)]">{u.current_view}</span>
                    </div>
                  </div>
                ))}
                {activeUsersList.length === 0 && (
                  <div className="p-3 text-center text-[10px] text-[var(--router-text-muted)]">Nenhum usuário ativo</div>
                )}
              </div>
            </div>
          )}

          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing || !onlineStatus}
              className={`flex items-center px-2 h-full text-[10px] font-bold uppercase transition-colors ${
                isSyncing ? 'text-[var(--router-primary)] opacity-70' : 'hover:bg-[var(--router-surface-3)] text-[var(--router-text)]'
              }`}
              title={lastSyncTime ? `Última sincronização: ${lastSyncTime}` : 'Sincronizar agora'}
            >
              <span className={`material-symbols-outlined text-[14px] mr-1 ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span className="hidden xl:inline">Sync</span>
            </button>
          )}
        </div>

        {/* Fila */}
        <div className={rightStatusClass} title={`Fila: ${filteredCtrcsCount} / ${totalCtrcsCount}`}>
          <span className="hidden lg:inline mr-1 font-bold">Fila:</span>
          <span className="text-[var(--router-text)] font-black uppercase">{filteredCtrcsCount}/{totalCtrcsCount}</span>
        </div>

        {/* Relógio - Oculto em resoluções < 2xl para economizar espaço */}
        <div className={badgeClass} title="Horário Atual (UTC)">
          {currentTime} <span className="text-[var(--router-text-muted)] text-[9px] ml-1">UTC</span>
        </div>
      </div>

    </div>
  );
}
