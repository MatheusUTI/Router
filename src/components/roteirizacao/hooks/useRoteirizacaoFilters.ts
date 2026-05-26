import { useState, useMemo } from 'react';
import { RoteirizacaoItem, AppUser } from '../../../types';

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

  // Unique list of sectors based on selected unit
  const uniqueSectors = useMemo(() => {
    const list = ctrcs
      .filter((c) => {
        const currentUnid = (c.unid || '').toUpperCase();
        if (!adminUser.is_master) {
          return currentUnid === (adminUser.unid || 'SPO').toUpperCase();
        } else {
          if (selectedUnit !== 'TODAS') return currentUnid === selectedUnit;
        }
        return true;
      })
      .map((c) => c.normSetor)
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

      // 2. Sector filtering
      if (selectedSector !== 'all' && ctrc.normSetor !== selectedSector) return false;

      // 3. Tactical Focus Category matching
      if (activeTacticalFilter === 'delayed') {
        if (!ctrc.slaStatus.isDelayed) return false;
      } else if (activeTacticalFilter === 'curva') {
        if (!ctrc.isCurvaA) return false;
      } else if (activeTacticalFilter === 'heavy') {
        if (ctrc.pesoStatus.category !== 'PESADO' && ctrc.pesoStatus.category !== 'CRÍTICO') return false;
      } else if (activeTacticalFilter === 'priority') {
        if (ctrc.normPriority !== 'CRÍTICA' && ctrc.normPriority !== 'ALTA' && !ctrc.isCurvaA) return false;
      } else if (activeTacticalFilter === 'retained') {
        if (ctrc.availabilityStatus !== 'retido' && ctrc.availabilityStatus !== 'problema') return false;
      } else if (activeTacticalFilter === 'missingbox') {
        if (ctrc.availabilityLabel === 'SEM BOX' || ctrc.locationLabel.toUpperCase().includes('SEM BOX')) {
          // Keep it
        } else {
          return false;
        }
      }

      // 4. Case-insensitive unified query search (CTRC, NF, remetente, destinatário, cidade, setor, localização)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const mId = (ctrc.id || '').toLowerCase().includes(query);
        const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
        const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
        const mCid = (ctrc.normCidade || '').toLowerCase().includes(query);
        const mNf = (ctrc.nf || '').toLowerCase().includes(query);
        const mSetor = (ctrc.normSetor || '').toLowerCase().includes(query);
        const mLoc = (ctrc.locationLabel || '').toLowerCase().includes(query) || (ctrc.localizacao || '').toLowerCase().includes(query);
        if (!mId && !mDest && !mRem && !mCid && !mNf && !mSetor && !mLoc) return false;
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

      return true;
    });
  }, [ctrcs, adminUser, selectedUnit, selectedSector, activeTacticalFilter, searchQuery, selectedLocationFilter]);

  // Reset function
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setActiveTacticalFilter('all');
    setSelectedLocationFilter('all');
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
    uniqueSectors,
    filteredCtrcs,
    clearFilters
  };
}
