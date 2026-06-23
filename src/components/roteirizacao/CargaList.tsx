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
}: CargaListProps) {
  // Check master selection
  const visibleIds = filteredCtrcs.map((c) => c.id);
  const allVisibleChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#080c14] border border-[#16223f] rounded-xl overflow-hidden relative">

      {/* Excel styled Column headers row - Precision Aligned Sticky Row */}
      {filteredCtrcs.length > 0 && (
        <div className="bg-[#0b1322] border-b border-[#14203a] grid grid-cols-[24px_minmax(180px,1fr)_minmax(310px,1.7fr)_minmax(360px,1.9fr)_minmax(110px,0.4fr)] items-center text-slate-500 py-1.5 px-3 select-none text-[10px] tracking-wider font-mono font-black shrink-0 relative z-30">
          
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
              className="w-3.5 h-3.5 accent-indigo-500 rounded border-slate-705 bg-transparent focus:ring-0 cursor-pointer"
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelCityFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>CIDADE</span>
                  <Filter size={8.5} className={excelCityFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
            <span className="text-slate-700">/</span>
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelRouteFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>ROTA</span>
                  <Filter size={8.5} className={excelRouteFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
          </div>

          {/* Col 3: Destinatário / Remetente */}
          <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-[#131f38]/15 uppercase text-[10px] font-mono select-none">
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelDestFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>DESTINATÁRIO</span>
                  <Filter size={8.5} className={excelDestFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
            <span className="text-slate-700">/</span>
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelSenderFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>REMETENTE</span>
                  <Filter size={8.5} className={excelSenderFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
          </div>

          {/* Col 4: Previsão / Status / Localização */}
          <div className="min-w-0 flex items-center gap-1.5 px-1.5 border-l border-[#131f38]/15 uppercase text-[10px] font-mono select-none">
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelPrevFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>PREVISÃO</span>
                  <Filter size={8.5} className={excelPrevFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
            <span className="text-slate-700">/</span>
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelStatusFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>STATUS</span>
                  <Filter size={8.5} className={excelStatusFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
            <span className="text-slate-700">/</span>
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
                <div className={`hover:text-white flex items-center gap-0.5 cursor-pointer py-0.5 rounded transition duration-150 ${excelLocationFilter !== null ? 'text-indigo-400 font-black underline decoration-indigo-500 decoration-2' : 'text-slate-400'}`}>
                  <span>LOCALIZAÇÃO</span>
                  <Filter size={8.5} className={excelLocationFilter !== null ? "stroke-[2.5] text-indigo-400 fill-indigo-400/20" : "text-slate-600 stroke-[1.5]"} />
                </div>
              }
            />
          </div>

          {/* Col 5: Peso / Volumes / Valor Header click sorting keys */}
          <div className="min-w-0 flex flex-wrap items-center justify-end px-1.5 border-l border-[#131f38]/15 gap-1.5 text-[9px] text-slate-500 font-bold uppercase select-none">
            <button
              onClick={() => {
                const targetDir = sortField === 'peso' && sortDirection === 'desc' ? 'asc' : 'desc';
                setSortField('peso');
                setSortDirection(targetDir);
              }}
              className={`hover:text-white transition-colors cursor-pointer ${sortField === 'peso' ? 'text-indigo-400 font-black' : ''}`}
            >
              Pes {sortField === 'peso' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </button>
            <span>|</span>
            <button
              onClick={() => {
                const targetDir = sortField === 'volumes' && sortDirection === 'desc' ? 'asc' : 'desc';
                setSortField('volumes');
                setSortDirection(targetDir);
              }}
              className={`hover:text-white transition-colors cursor-pointer ${sortField === 'volumes' ? 'text-indigo-400 font-black' : ''}`}
            >
              Vol {sortField === 'volumes' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
            </button>
          </div>
        </div>
      )}

      {/* Main Items View Area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto divide-y divide-[#14203a] scrollbar-thin scrollbar-track-[#080c14] scrollbar-thumb-indigo-550 scroll-smooth">
        {filteredCtrcs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3 px-4 text-center">
            <span className="text-3xl">📦</span>
            <p className="text-xs font-bold uppercase font-mono">Nenhuma carga pendente corresponde ao filtro selecionado</p>
            {totalCtrcsCount > 0 && onClearFilters && (
              <div className="mt-2 bg-[#0e1726]/80 border border-[#1e2e4f] rounded-lg p-3 max-w-sm animate-pulse w-full">
                <p className="text-xs text-indigo-300 font-sans leading-relaxed mb-2">
                  Há CTRCs importados, mas nenhum visível com os filtros atuais. Limpar filtros da Mesa?
                </p>
                <button
                  onClick={onClearFilters}
                  className="bg-indigo-600 hover:bg-indigo-505 text-white font-mono font-bold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          // Direct List Mode
          <div className="divide-y divide-[#14203a] pb-36">
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
    </div>
  );
}
