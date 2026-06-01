import { useState, useMemo } from 'react';
import { RoteirizacaoItem, AppUser, RoteirizacaoSortField, SortDirection } from '../../../types';

export const DEFAULT_ROUTE_SECTORS = [
  'Agendamento',
  'Disponível',
  'Disponível Cobrança',
  'Disponível Pendência',
  'Disponível Transferência',
  'Solução'
];

export interface UseRoteirizacaoFiltersProps {
  ctrcs: RoteirizacaoItem[];
  adminUser: AppUser;
}

function parseDDMMYYYY(dateStr?: string): number {
  if (!dateStr) return 0;
  const DateStrClean = dateStr.trim();
  const parts = DateStrClean.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day).getTime();
  }
  return 0;
}

export function sortRoteirizacaoItems(
  items: RoteirizacaoItem[],
  sortField: RoteirizacaoSortField,
  sortDirection: SortDirection
): RoteirizacaoItem[] {
  return [...items].sort((a, b) => {
    let result = 0;

    switch (sortField) {
      case 'prev_ent': {
        const timeA = parseDDMMYYYY(a.prev_ent);
        const timeB = parseDDMMYYYY(b.prev_ent);
        result = timeA - timeB;
        break;
      }
      case 'remetente': {
        const textA = (a.remetente || '').toUpperCase().trim();
        const textB = (b.remetente || '').toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      case 'destinatario': {
        const textA = (a.destinatario || '').toUpperCase().trim();
        const textB = (b.destinatario || '').toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      case 'cidade': {
        const textA = (a.normCidade || a.cidade || '').toUpperCase().trim();
        const textB = (b.normCidade || b.cidade || '').toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      case 'peso': {
        const valA = a.peso_r ?? a.weight ?? 0;
        const valB = b.peso_r ?? b.weight ?? 0;
        result = valA - valB;
        break;
      }
      case 'volumes': {
        const valA = a.volume ?? 0;
        const valB = b.volume ?? 0;
        result = valA - valB;
        break;
      }
      case 'valor': {
        const valA = a.valor ?? 0;
        const valB = b.valor ?? 0;
        result = valA - valB;
        break;
      }
      case 'frete': {
        const valA = a.frete ?? 0;
        const valB = b.frete ?? 0;
        result = valA - valB;
        break;
      }
      default:
        result = 0;
    }

    return sortDirection === 'asc' ? result : -result;
  });
}

export function useRoteirizacaoFilters({ ctrcs, adminUser }: UseRoteirizacaoFiltersProps) {
  // Unit select filter
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (!adminUser.is_master) {
      return (adminUser.unid || 'SPO').toUpperCase();
    }
    return 'TODAS';
  });

  // Sector selected filter
  const [selectedSector, setSelectedSector] = useState<string>('all');

  // Unified Excel sorting controls
  const [sortField, setSortField] = useState<RoteirizacaoSortField>('prev_ent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Legacy filters states (kept for backward compatibility and to prevent breakage, but not applied in active filtered results)
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [activeTacticalFilter, setActiveTacticalFilter] = useState<string>('all');
  const [selectedEligibility, setSelectedEligibility] = useState<'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS'>('ROTEIRIZAVEL');

  // Search query text input
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-select Occurrence Sectors filter
  const [selectedOccurrenceSectors, setSelectedOccurrenceSectors] = useState<string[]>(DEFAULT_ROUTE_SECTORS);

  // Available unique occurrence sectors
  const availableSectors = useMemo(() => {
    const sectors = ctrcs.map((c) => c.occurrenceSector || 'Sem setor');
    const unique = Array.from(new Set(sectors));
    const baseline = [
      'Agendamento',
      'Disponível',
      'Disponível Cobrança',
      'Disponível Pendência',
      'Disponível Transferência',
      'Em Rota',
      'Retidos',
      'Solução',
      'Transferência',
      'Sem setor'
    ];
    const combined = Array.from(new Set([...unique, ...baseline]));
    return combined.sort();
  }, [ctrcs]);

  // Unique list of sectors based on selected unit (filtered by effectiveRoute or normRota)
  const uniqueSectors = useMemo(() => {
    const list = ctrcs
      .filter((c) => {
        const currentUnid = (c.unid || '').toUpperCase();
        if (!adminUser.is_master) {
          return currentUnid === (adminUser.unid || 'SPO').toUpperCase();
        } else {
          if (selectedUnit !== 'TODAS' && currentUnid !== selectedUnit) return false;
        }
        return true;
      })
      .map((c) => c.effectiveRoute || c.normRota)
      .filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [ctrcs, selectedUnit, adminUser]);

  // Apply sequential filtering and sorting logic
  const filteredCtrcs = useMemo(() => {
    const filteredList = ctrcs.filter((ctrc) => {
      const currentUnid = (ctrc.unid || '').toUpperCase();
      // 1. Filial target check
      if (!adminUser.is_master) {
        const profileUnid = (adminUser.unid || 'SPO').toUpperCase();
        if (currentUnid !== profileUnid) return false;
      } else {
        if (selectedUnit !== 'TODAS' && currentUnid !== selectedUnit) return false;
      }

      // 2. Sector/Route filtering (based on effectiveRoute or normRota)
      if (selectedSector !== 'all' && (ctrc.effectiveRoute || ctrc.normRota) !== selectedSector) return false;

      // 3. Case-insensitive unified query search (CTRC, NF, remetente, destinatário, cidade, rota/effectiveRoute, localização, observação operacional)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const mId = (ctrc.id || '').toLowerCase().includes(query);
        const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
        const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
        const mCid = (ctrc.normCidade || '').toLowerCase().includes(query);
        const mNf = (ctrc.nf || '').toLowerCase().includes(query);
        const mSetor = (ctrc.normSetor || '').toLowerCase().includes(query);
        const mRoute = (ctrc.effectiveRoute || '').toLowerCase().includes(query) || (ctrc.normRota || '').toLowerCase().includes(query);
        const mLoc = (ctrc.locationLabel || '').toLowerCase().includes(query) || (ctrc.localizacao || '').toLowerCase().includes(query);
        const mNote = (ctrc.operationalNote || '').toLowerCase().includes(query);
        
        if (!mId && !mDest && !mRem && !mCid && !mNf && !mSetor && !mLoc && !mRoute && !mNote) return false;
      }

      // 4. Setor Ocorrência Filter (multi-select)
      const sector = ctrc.occurrenceSector || 'Sem setor';
      if (!selectedOccurrenceSectors.includes(sector)) return false;

      return true;
    });

    // Apply sorting *after* filters
    return sortRoteirizacaoItems(filteredList, sortField, sortDirection);
  }, [ctrcs, adminUser, selectedUnit, selectedSector, searchQuery, selectedOccurrenceSectors, sortField, sortDirection]);

  // Reset function
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setSelectedLocationFilter('all');
    setActiveTacticalFilter('all');
    setSelectedOccurrenceSectors(DEFAULT_ROUTE_SECTORS);
    setSortField('prev_ent');
    setSortDirection('asc');
    if (adminUser.is_master) {
      setSelectedUnit('TODAS');
    }
  };

  return {
    selectedUnit,
    setSelectedUnit,
    selectedSector,
    setSelectedSector,
    selectedLocationFilter,
    setSelectedLocationFilter,
    searchQuery,
    setSearchQuery,
    activeTacticalFilter,
    setActiveTacticalFilter,
    selectedEligibility,
    setSelectedEligibility,
    selectedOccurrenceSectors,
    setSelectedOccurrenceSectors,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    availableSectors,
    uniqueSectors,
    filteredCtrcs,
    clearFilters
  };
}
