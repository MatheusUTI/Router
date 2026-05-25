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
        if (ctrc.pesoStatus.category === 'PESADO' || ctrc.pesoStatus.category === 'CRÍTICO') return false;
      } else if (activeTacticalFilter === 'priority') {
        if (ctrc.normPriority !== 'CRÍTICA' && ctrc.normPriority !== 'ALTA') return false;
      } else if (activeTacticalFilter === 'retained') {
        if (ctrc.availabilityStatus !== 'retido') return false;
      } else if (activeTacticalFilter === 'missingbox') {
        if (ctrc.availabilityLabel === 'SEM BOX') return false;
      }

      // 4. Case-insensitive unified query search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const mId = (ctrc.id || '').toLowerCase().includes(query);
        const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
        const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
        const mCid = (ctrc.normCidade || '').toLowerCase().includes(query);
        const mNf = (ctrc.nf || '').toLowerCase().includes(query);
        if (!mId && !mDest && !mRem && !mCid && !mNf) return false;
      }

      return true;
    });
  }, [ctrcs, adminUser, selectedUnit, selectedSector, activeTacticalFilter, searchQuery]);

  // Reset function
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSector('all');
    setActiveTacticalFilter('all');
    if (adminUser.is_master) {
      setSelectedUnit('TODAS');
    }
  };

  return {
    selectedUnit,
    setSelectedUnit,
    selectedSector,
    setSelectedSector,
    searchQuery,
    setSearchQuery,
    activeTacticalFilter,
    setActiveTacticalFilter,
    uniqueSectors,
    filteredCtrcs,
    clearFilters
  };
}
