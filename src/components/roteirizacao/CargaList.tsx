import React from 'react';
import { Filter } from 'lucide-react';
import { RoteirizacaoItem, RoutePlanningItem, DensityMode, AppUser, RoteirizacaoSortField, SortDirection } from '../../types';
import CargaItem from './CargaItem';
import { DEFAULT_OPERATIONAL_UNIT, getOperationalUnits } from '../../constants/operationalUnits';
import ExcelColumnFilter from './ExcelColumnFilter';

interface CargaListProps {
  filteredCtrcs: RoteirizacaoItem[];
  groupingMode: 'sector' | 'city' | 'destinatario' | 'previsao' | 'priority' | 'status' | 'location' | 'none';
  setGroupingMode: (mode: 'sector' | 'city' | 'destinatario' | 'previsao' | 'priority' | 'status' | 'location' | 'none') => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupKey: string) => void;
  groupedData: Record<string, RoteirizacaoItem[]>;
  selectedIds: string[];
  onToggleItem: (id: string) => void;
  onToggleGroupSelection: (ids: string[]) => void;
  onSelectAllVisible: (ids: string[]) => void;
  onUpdatePlanning?: (ctrcId: string, patch: Partial<RoutePlanningItem>) => void;
  densityMode?: DensityMode;
  onUpdateDensity?: (density: DensityMode) => void;
  totalCtrcsCount?: number;
  onClearFilters?: () => void;

  // Migrated Filters Props
  adminUser: AppUser;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  selectedOccurrenceSectors: string[];
  setSelectedOccurrenceSectors: (sectors: string[]) => void;
  sortField: RoteirizacaoSortField;
  setSortField: (field: RoteirizacaoSortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (direction: SortDirection) => void;
  uniqueSectors: string[];
  availableSectors: string[];
  logisticScope: 'my-unit' | 'my-unit-transit' | 'all-units' | 'incompatible';
  setLogisticScope: (scope: 'my-unit' | 'my-unit-transit' | 'all-units' | 'incompatible') => void;

  // Excel columns filters props
  excelUniqueRoutes: string[];
  excelUniqueCities: string[];
  excelUniqueDests: string[];
  excelUniquePrevs: string[];
  excelUniqueStatuses: string[];
  excelUniqueLocs: string[];
  excelUniqueSenders: string[];
  excelUniqueOcorrSectors: string[];
  excelRouteFilter: string[] | null;
  setExcelRouteFilter: (filter: string[] | null) => void;
  excelCityFilter: string[] | null;
  setExcelCityFilter: (filter: string[] | null) => void;
  excelDestFilter: string[] | null;
  setExcelDestFilter: (filter: string[] | null) => void;
  excelPrevFilter: string[] | null;
  setExcelPrevFilter: (filter: string[] | null) => void;
  excelStatusFilter: string[] | null;
  setExcelStatusFilter: (filter: string[] | null) => void;
  excelLocationFilter: string[] | null;
  setExcelLocationFilter: (filter: string[] | null) => void;
  excelSenderFilter: string[] | null;
  setExcelSenderFilter: (filter: string[] | null) => void;
  excelOcorrSectorFilter: string[] | null;
  setExcelOcorrSectorFilter: (filter: string[] | null) => void;
  onOpenDiagnostics?: () => void;
  diagnostics?: any; // To avoid changing types right away
}

export default function CargaList({
  filteredCtrcs,
  groupingMode,
  setGroupingMode,
  expandedGroups,
  toggleGroup,
  groupedData,
  selectedIds,
  onToggleItem,
  onToggleGroupSelection,
  onSelectAllVisible,
  onUpdatePlanning,
  densityMode = 'default',
  onUpdateDensity,
  totalCtrcsCount = 0,
  onClearFilters,

  // Migrated Filters Props
  adminUser,
  searchQuery,
  setSearchQuery,
  selectedUnit,
  setSelectedUnit,
  selectedSector,
  setSelectedSector,
  selectedOccurrenceSectors,
  setSelectedOccurrenceSectors,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  uniqueSectors,
  availableSectors,
  logisticScope,
  setLogisticScope,

  // Excel column filtering props
  excelUniqueRoutes,
  excelUniqueCities,
  excelUniqueDests,
  excelUniquePrevs,
  excelUniqueStatuses,
  excelUniqueLocs,
  excelUniqueSenders,
  excelUniqueOcorrSectors,
  excelRouteFilter,
  setExcelRouteFilter,
  excelCityFilter,
  setExcelCityFilter,
  excelDestFilter,
  setExcelDestFilter,
  excelPrevFilter,
  setExcelPrevFilter,
  excelStatusFilter,
  setExcelStatusFilter,
  excelLocationFilter,
  setExcelLocationFilter,
  excelSenderFilter,
  setExcelSenderFilter,
  excelOcorrSectorFilter,
  setExcelOcorrSectorFilter,
  onOpenDiagnostics,
  diagnostics,
}: CargaListProps) {
  // Check master selection
  const visibleIds = filteredCtrcs.map((c) => c.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#080c14] border border-slate-200 dark:border-[#16223f] rounded-xl overflow-hidden relative shadow-sm">

      {/* Excel styled Column headers row - Precision Aligned Sticky Row */}
      {filteredCtrcs.length > 0 && (
        densityMode === 'planilha_operacional' ? (
          <div 
            className="bg-slate-50 dark:bg-[#0b1322] border-b border-slate-200 dark:border-[#14203a] grid items-center text-slate-500 py-1 px-3 select-none tracking-wider font-sans font-extrabold shrink-0 relative z-30"
            style={{ 
              gridTemplateColumns: '24px minmax(calc(115px * var(--mesa-scale, 1)), 0.6fr) minmax(calc(270px * var(--mesa-scale, 1)), 1.5fr) minmax(calc(110px * var(--mesa-scale, 1)), 0.65fr) minmax(calc(85px * var(--mesa-scale, 1)), 0.4fr) minmax(calc(275px * var(--mesa-scale, 1)), 1.55fr) minmax(calc(105px * var(--mesa-scale, 1)), 0.55fr) minmax(calc(95px * var(--mesa-scale, 1)), 0.5fr) minmax(calc(80px * var(--mesa-scale, 1)), 0.4fr)',
              fontSize: 'calc(10px * var(--mesa-scale, 1))',
              height: 'calc(32px * var(--mesa-scale, 1))'
            } as React.CSSProperties}
          >
            {/* Col 1: Master Checkbox */}
            <div className="w-6 shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                id="master-cargo-checkbox"
                checked={allVisibleChecked}
                ref={(el) => {
                  if (el) {
                    const someChecked = visibleIds.some((id) => selectedIds.includes(id));
                    el.indeterminate = someChecked && !allVisibleChecked;
                  }
                }}
                onChange={() => onSelectAllVisible(visibleIds)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-300 dark:border-slate-705 bg-transparent focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Col 2: Cidade / Rota */}
            <div className="min-w-0 flex items-center gap-1 px-1 uppercase font-sans select-none">
              <ExcelColumnFilter
                label="Cidade"
                uniqueValues={excelUniqueCities}
                selectedValues={excelCityFilter}
                onApply={setExcelCityFilter}
                onSortAsc={() => {
                  setSortField('cidade');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('cidade');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'cidade' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'cidade' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelCityFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>CIDADE</span>
                    <Filter size={8.5} className={excelCityFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Rota"
                uniqueValues={excelUniqueRoutes}
                selectedValues={excelRouteFilter}
                onApply={setExcelRouteFilter}
                onSortAsc={() => {
                  setSortField('rota');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('rota');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'rota' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'rota' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelRouteFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>ROTA</span>
                    <Filter size={8.5} className={excelRouteFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 3: Destinatário / Remetente */}
            <div className="min-w-0 flex items-center gap-1 px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase font-sans select-none">
              <ExcelColumnFilter
                label="Destinatário"
                uniqueValues={excelUniqueDests}
                selectedValues={excelDestFilter}
                onApply={setExcelDestFilter}
                onSortAsc={() => {
                  setSortField('destinatario');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('destinatario');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'destinatario' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'destinatario' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelDestFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>DEST.</span>
                    <Filter size={8.5} className={excelDestFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Remetente"
                uniqueValues={excelUniqueSenders}
                selectedValues={excelSenderFilter}
                onApply={setExcelSenderFilter}
                onSortAsc={() => {
                  setSortField('remetente');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('remetente');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'remetente' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'remetente' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelSenderFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>REM.</span>
                    <Filter size={8.5} className={excelSenderFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 4: CTRC / NF */}
            <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase font-sans select-none">
              <button
                onClick={() => {
                  const targetDir = sortField === 'id' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('id');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'id' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400'}`}
              >
                CTRC {sortField === 'id' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <button
                onClick={() => {
                  const targetDir = sortField === 'nf' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('nf');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'nf' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400'}`}
              >
                NF {sortField === 'nf' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
            </div>

            {/* Col 5: Previsão */}
            <div className="min-w-0 flex items-center justify-center px-1 border-l border-slate-200 dark:border-[#131f38]/15 uppercase font-sans select-none">
              <ExcelColumnFilter
                label="Previsão"
                uniqueValues={excelUniquePrevs}
                selectedValues={excelPrevFilter}
                onApply={setExcelPrevFilter}
                onSortAsc={() => {
                  setSortField('prev_ent');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('prev_ent');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'prev_ent' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'prev_ent' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelPrevFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>PREVISÃO</span>
                    <Filter size={8.5} className={excelPrevFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 6: Ocorrência / Localização */}
            <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase font-sans select-none">
              <ExcelColumnFilter
                label="Ocorrência"
                uniqueValues={excelUniqueStatuses}
                selectedValues={excelStatusFilter}
                onApply={setExcelStatusFilter}
                onSortAsc={() => {
                  setSortField('status');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('status');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'status' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'status' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelStatusFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>OCORR.</span>
                    <Filter size={8.5} className={excelStatusFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Localização"
                uniqueValues={excelUniqueLocs}
                selectedValues={excelLocationFilter}
                onApply={setExcelLocationFilter}
                onSortAsc={() => {
                  setSortField('localizacao');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('localizacao');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'localizacao' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'localizacao' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelLocationFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>LOCAL.</span>
                    <Filter size={8.5} className={excelLocationFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 7: Valor / Frete */}
            <div className="min-w-0 flex flex-wrap items-center justify-end px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 gap-1 text-slate-500 font-bold uppercase select-none">
              <button
                onClick={() => {
                  const targetDir = sortField === 'valor' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('valor');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'valor' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                VALOR {sortField === 'valor' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => {
                  const targetDir = sortField === 'frete' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('frete');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'frete' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                FRETE {sortField === 'frete' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
            </div>

            {/* Col 8: Peso / Volumes */}
            <div className="min-w-0 flex flex-wrap items-center justify-end px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 gap-1 text-slate-500 font-bold uppercase select-none">
              <button
                onClick={() => {
                  const targetDir = sortField === 'peso' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('peso');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'peso' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                PESO {sortField === 'peso' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => {
                  const targetDir = sortField === 'volumes' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('volumes');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'volumes' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                VOL {sortField === 'volumes' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
            </div>

            {/* Col 9: OBS / Disponível */}
            <div className="min-w-0 flex items-center justify-center px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase font-sans select-none text-slate-400">
              <ExcelColumnFilter
                label="Setor / Disponibilidade"
                uniqueValues={excelUniqueOcorrSectors}
                selectedValues={excelOcorrSectorFilter}
                onApply={setExcelOcorrSectorFilter}
                onSortAsc={() => {}}
                onSortDesc={() => {}}
                isSortedActiveAsc={false}
                isSortedActiveDesc={false}
                alignRight={true}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelOcorrSectorFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>OBS / DISP</span>
                    <Filter size={8.5} className={excelOcorrSectorFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-[#0b1322] border-b border-slate-200 dark:border-[#14203a] grid grid-cols-[24px_minmax(180px,1fr)_minmax(310px,1.7fr)_minmax(360px,1.9fr)_minmax(110px,0.4fr)] items-center text-slate-500 py-1.5 px-3 select-none text-[10px] tracking-wider font-mono font-black shrink-0 relative z-30">
            
            {/* Col 1: Master Checkbox */}
            <div className="w-6 shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                id="master-cargo-checkbox"
                checked={allVisibleChecked}
                ref={(el) => {
                  if (el) {
                    const someChecked = visibleIds.some((id) => selectedIds.includes(id));
                    el.indeterminate = someChecked && !allVisibleChecked;
                  }
                }}
                onChange={() => onSelectAllVisible(visibleIds)}
                className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-300 dark:border-slate-705 bg-transparent focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Col 2: Cidade / Rota */}
            <div className="min-w-0 flex items-center gap-1.5 px-1 uppercase text-[10px] font-mono select-none">
              <ExcelColumnFilter
                label="Cidade"
                uniqueValues={excelUniqueCities}
                selectedValues={excelCityFilter}
                onApply={setExcelCityFilter}
                onSortAsc={() => {
                  setSortField('cidade');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('cidade');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'cidade' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'cidade' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelCityFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>CIDADE</span>
                    <Filter size={8.5} className={excelCityFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Rota"
                uniqueValues={excelUniqueRoutes}
                selectedValues={excelRouteFilter}
                onApply={setExcelRouteFilter}
                onSortAsc={() => {
                  setSortField('rota');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('rota');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'rota' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'rota' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelRouteFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>ROTA</span>
                    <Filter size={8.5} className={excelRouteFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 3: Destinatário / Remetente */}
            <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase text-[10px] font-mono select-none">
              <ExcelColumnFilter
                label="Destinatário"
                uniqueValues={excelUniqueDests}
                selectedValues={excelDestFilter}
                onApply={setExcelDestFilter}
                onSortAsc={() => {
                  setSortField('destinatario');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('destinatario');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'destinatario' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'destinatario' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelDestFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>DESTINATÁRIO</span>
                    <Filter size={8.5} className={excelDestFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Remetente"
                uniqueValues={excelUniqueSenders}
                selectedValues={excelSenderFilter}
                onApply={setExcelSenderFilter}
                onSortAsc={() => {
                  setSortField('remetente');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('remetente');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'remetente' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'remetente' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelSenderFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>REMETENTE</span>
                    <Filter size={8.5} className={excelSenderFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 4: Previsão / Status / Localização */}
            <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 uppercase text-[10px] font-mono select-none">
              <ExcelColumnFilter
                label="Previsão"
                uniqueValues={excelUniquePrevs}
                selectedValues={excelPrevFilter}
                onApply={setExcelPrevFilter}
                onSortAsc={() => {
                  setSortField('prev_ent');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('prev_ent');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'prev_ent' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'prev_ent' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelPrevFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>PREVISÃO</span>
                    <Filter size={8.5} className={excelPrevFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Status"
                uniqueValues={excelUniqueStatuses}
                selectedValues={excelStatusFilter}
                onApply={setExcelStatusFilter}
                onSortAsc={() => {
                  setSortField('status');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('status');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'status' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'status' && sortDirection === 'desc'}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelStatusFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>STATUS</span>
                    <Filter size={8.5} className={excelStatusFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <ExcelColumnFilter
                label="Localização"
                uniqueValues={excelUniqueLocs}
                selectedValues={excelLocationFilter}
                onApply={setExcelLocationFilter}
                onSortAsc={() => {
                  setSortField('localizacao');
                  setSortDirection('asc');
                }}
                onSortDesc={() => {
                  setSortField('localizacao');
                  setSortDirection('desc');
                }}
                isSortedActiveAsc={sortField === 'localizacao' && sortDirection === 'asc'}
                isSortedActiveDesc={sortField === 'localizacao' && sortDirection === 'desc'}
                alignRight={true}
                customTrigger={
                  <div className={`hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelLocationFilter !== null ? 'text-indigo-600 dark:text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                    <span>LOCALIZAÇÃO</span>
                    <Filter size={8.5} className={excelLocationFilter !== null ? "stroke-[2.5] text-indigo-600 dark:text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                  </div>
                }
              />
            </div>

            {/* Col 5: Peso / Volumes / Valor Header click sorting keys */}
            <div className="min-w-0 flex flex-wrap items-center justify-end px-1.5 border-l border-slate-200 dark:border-[#131f38]/15 gap-1.5 text-[9px] text-slate-500 font-bold uppercase select-none">
              <button
                onClick={() => {
                  const targetDir = sortField === 'peso' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('peso');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'peso' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                Pes {sortField === 'peso' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                onClick={() => {
                  const targetDir = sortField === 'volumes' && sortDirection === 'desc' ? 'asc' : 'desc';
                  setSortField('volumes');
                  setSortDirection(targetDir);
                }}
                className={`hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer ${sortField === 'volumes' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}`}
              >
                Vol {sortField === 'volumes' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </button>
            </div>
          </div>
        )
      )}

      {/* Main Items View Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto divide-y divide-slate-150 dark:divide-[#14203a] scrollbar-thin scrollbar-track-transparent dark:scrollbar-track-[#080c14] scrollbar-thumb-indigo-500 dark:scrollbar-thumb-indigo-550 scroll-smooth">
        {filteredCtrcs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3 px-4 text-center">
            <span className="text-3xl">📦</span>
            <p className="text-xs font-bold uppercase font-mono">Nenhuma carga pendente corresponde ao filtro selecionado</p>
            {totalCtrcsCount > 0 && onClearFilters && (
              <div className="mt-2 bg-slate-50 dark:bg-[#0e1726]/80 border border-slate-200 dark:border-[#1e2e4f] rounded-lg p-3 max-w-sm animate-pulse w-full">
                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-sans leading-relaxed mb-2">
                  Há CTRCs importados, mas nenhum visível com os filtros atuais. Limpar filtros da Mesa?
                </p>
                <button
                  onClick={onClearFilters}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          // Direct List Mode
          <div className="divide-y divide-slate-150 dark:divide-[#14203a] pb-36">
            {filteredCtrcs.map((item) => (
              <CargaItem
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggle={onToggleItem}
                onUpdatePlanning={onUpdatePlanning}
                densityMode={densityMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend Footer Block */}
      <div className="bg-slate-50 dark:bg-[#060c15] border-t border-slate-200 dark:border-[#14203a] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium font-sans text-slate-500 shrink-0 relative z-30">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold font-mono text-[9.5px] text-slate-400 mr-2 uppercase tracking-wide">Legenda:</span>
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1" title="Verde">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DCFCE7] dark:bg-emerald-500/10 border border-[#BBF7D0] dark:border-emerald-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Disponível</span>
            </span>
            <span className="flex items-center gap-1" title="Azul / Índigo">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DBEAFE] dark:bg-indigo-950/40 border border-[#BFDBFE] dark:border-indigo-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Agendamento / Operacional</span>
            </span>
            <span className="flex items-center gap-1" title="Amarelo">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FEF3C7] dark:bg-amber-550/10 border border-[#FDE68A] dark:border-amber-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Atenção Leve / FOB</span>
            </span>
            <span className="flex items-center gap-1" title="Laranja">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FFEDD5] dark:bg-orange-500/10 border border-[#FED7AA] dark:border-orange-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Atenção Op / Hold</span>
            </span>
            <span className="flex items-center gap-1" title="Vermelho / Rosa">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#FFE4E6] dark:bg-red-500/10 border border-[#FECDD3] dark:border-red-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Atraso / Curva A / Retido</span>
            </span>
            <span className="flex items-center gap-1" title="Cinza">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Neutro</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase select-none">
            Total: {filteredCtrcs.length} CTRCs
          </div>
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-500 transition-colors cursor-pointer border border-slate-200 dark:border-[#1a2440] rounded px-2 py-0.5"
            >
              Dev: Diagnóstico
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
