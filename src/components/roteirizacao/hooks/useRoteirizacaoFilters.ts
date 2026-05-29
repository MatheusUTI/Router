import { useState, useMemo } from 'react';
import { RoteirizacaoItem, AppUser } from '../../../types';

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

  // New location filter ('all' | 'na_base' | 'outra_base' | 'rota' | 'sem_loc' | 'box')
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');

  // Search query text input
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tactical operational filters
  // 'all' | 'delayed' | 'curva' | 'heavy' | 'priority' | 'retained' | 'missingbox'
  const [activeTacticalFilter, setActiveTacticalFilter] = useState<string>('all');

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

  // Eligibility filter ('ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS')
  const [selectedEligibility, setSelectedEligibility] = useState<'ROTEIRIZAVEL' | 'REVISAR' | 'NAO_ROTEIRIZAVEL' | 'TODAS'>('ROTEIRIZAVEL');

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

  // Apply sequential filtering logic
  const filteredCtrcs = useMemo(() => {
    return ctrcs.filter((ctrc) => {
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

      // 3. Tactical Focus Category matching (aligned 1-to-1 with SPEC guidelines)
      if (activeTacticalFilter === 'urgent') {
        const isUrgent = ctrc.planningStatus === 'URGENTE' || ctrc.manualPriority === 'URGENTE';
        if (!isUrgent) return false;
      } else if (activeTacticalFilter === 'priority') {
        const isPri = ctrc.planningStatus === 'PRIORIDADE' || ctrc.manualPriority === 'PRIORIDADE';
        if (!isPri) return false;
      } else if (activeTacticalFilter === 'hold') {
        const isHold = ctrc.planningStatus === 'SEGURAR' || ctrc.manualPriority === 'SEGURAR';
        if (!isHold) return false;
      } else if (activeTacticalFilter === 'delayed_today') {
        const isNso = ctrc.planningStatus === 'NAO_SAI_HOJE' || ctrc.manualPriority === 'NAO_SAI_HOJE';
        if (!isNso) return false;
      } else if (activeTacticalFilter === 'scheduled') {
        const isSched = ctrc.status === 'Agendamento' || ctrc.planningStatus === 'AGENDADO' || ctrc.manualPriority === 'AGENDADO';
        if (!isSched) return false;
      } else if (activeTacticalFilter === 'retained') {
        if (ctrc.availabilityStatus !== 'retido' && ctrc.availabilityStatus !== 'problema') return false;
      } else if (activeTacticalFilter === 'no_location') {
        const hasNoLoc = !ctrc.localizacao || ctrc.localizacao.trim() === '' || (ctrc.locationLabel || '').toUpperCase().includes('SEM BOX');
        if (!hasNoLoc) return false;
      } else if (activeTacticalFilter === 'curva_a') {
        if (!ctrc.isCurvaA) return false;
      } else if (activeTacticalFilter === 'fob') {
        if (!ctrc.isFob) return false;
      }

      // 4. Case-insensitive unified query search (CTRC, NF, remetente, destinatário, cidade, rota/effectiveRoute, localização, observação operacional)
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

      // 5. Situation/Location physical filter
      if (selectedLocationFilter !== 'all') {
        const activeUnit = (selectedUnit === 'TODAS' ? (adminUser.unid || 'SPO') : selectedUnit).toUpperCase();
        const locRaw = (ctrc.localizacao || '').toUpperCase();
        const locLabel = (ctrc.locationLabel || '').toUpperCase();
        const statusRaw = (ctrc.status || '').toLowerCase();
        const availStatus = (ctrc.availabilityStatus || '').toLowerCase();

        if (selectedLocationFilter === 'na_base') {
          // Physical location contains activeUnit and doesn't say "OUTRA"
          const isAtMyBase = locRaw !== '' && locRaw.includes(activeUnit) && !locRaw.includes('OUTRA') && !locLabel.includes('OUTRA');
          if (!isAtMyBase) return false;
        } else if (selectedLocationFilter === 'outra_base') {
          // Physical location is present but doesn't include activeUnit, or explicitly says "OUTRA"
          const isAtOtherBase = (locRaw !== '' && !locRaw.includes(activeUnit)) || locRaw.includes('OUTRA') || locLabel.includes('OUTRA');
          if (!isAtOtherBase) return false;
        } else if (selectedLocationFilter === 'rota') {
          // Em Rota / Transferência
          const isAtRoute = statusRaw === 'transferência' || statusRaw === 'em rota' ||
                            availStatus === 'transferência' || availStatus === 'em rota' ||
                            locRaw.includes('ROTA') || locRaw.includes('TRANSFER') ||
                            locLabel.includes('ROTA') || locLabel.includes('TRANSFER');
          if (!isAtRoute) return false;
        } else if (selectedLocationFilter === 'sem_loc') {
          // Sem localização
          const hasNoLoc = !ctrc.localizacao || ctrc.localizacao.trim() === '' || locLabel.includes('SEM BOX');
          if (!hasNoLoc) return false;
        } else if (selectedLocationFilter === 'box') {
          // Aguardando box
          const isWaitingBox = availStatus === 'aguardando' || ctrc.availabilityLabel === 'SEM BOX' || locLabel.includes('SEM BOX') || locRaw.includes('AGUARDANDO');
          if (!isWaitingBox) return false;
        }
      }

      // 6. Setor Ocorrência Filter (multi-select)
      const sector = ctrc.occurrenceSector || 'Sem setor';
      if (!selectedOccurrenceSectors.includes(sector)) return false;

      return true;
    });
  }, [ctrcs, adminUser, selectedUnit, selectedSector, activeTacticalFilter, searchQuery, selectedLocationFilter, selectedOccurrenceSectors]);

  // Reset function
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setActiveTacticalFilter('all');
    setSelectedLocationFilter('all');
    setSelectedOccurrenceSectors(DEFAULT_ROUTE_SECTORS);
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
    availableSectors,
    uniqueSectors,
    filteredCtrcs,
    clearFilters
  };
}
