import React, { useState, useMemo } from 'react';
import { RoteirizacaoItem, AppUser, RoteirizacaoSortField, SortDirection } from '../../../types';
import { DEFAULT_OPERATIONAL_UNIT } from '../../../constants/operationalUnits';

export const DEFAULT_ROUTE_SECTORS = [
  'Agendamento',
  'Disponível',
  'Disponível Cobrança',
  'Disponível Pendência',
  'Disponível Transferência',
  'Sem setor',
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
      case 'priority': {
        const order: Record<string, number> = {
          'URGENTE': 0,
          'PRIORIDADE': 1,
          'SEGURAR': 2,
          'AGENDADO': 3,
          'PLANEJADO': 4,
          'CONSOLIDADO': 5,
          'A_PLANEJAR': 6
        };
        const valA = order[a.planningStatus || 'A_PLANEJAR'] ?? 99;
        const valB = order[b.planningStatus || 'A_PLANEJAR'] ?? 99;
        result = valA - valB;
        break;
      }
      case 'ocorrencia': {
        const textA = (a.occurrenceCode || a.ocorrencia || '').toUpperCase().trim();
        const textB = (b.occurrenceCode || b.ocorrencia || '').toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      case 'rota': {
        const textA = (a.effectiveRoute || a.normRota || '').toUpperCase().trim();
        const textB = (b.effectiveRoute || b.normRota || '').toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      default:
        result = 0;
    }

    return sortDirection === 'asc' ? result : -result;
  });
}

export function isEligibleForUnit(ctrc: RoteirizacaoItem, targetUnit: string): boolean {
  const unitUpper = (targetUnit || '').toUpperCase();
  if (unitUpper === 'TODAS') return true;

  const currentUnid = (ctrc.unid || '').toUpperCase();
  // Se a unidade do CTRC bater de forma direta com a filial ativa
  const isDirectUnit = currentUnid === unitUpper || 
    (unitUpper === 'VGA' && currentUnid === 'VAG') ||
    (unitUpper === 'VAG' && currentUnid === 'VGA');

  if (isDirectUnit) return true;

  // Se a localização atual do CTRC for no pátio ou custódia física da filial ativa
  const locUpper = (ctrc.locationLabel || ctrc.localizacao || '').toUpperCase();
  const isPhysicallyHere = locUpper.includes(unitUpper) ||
    (unitUpper === 'VGA' && (locUpper.includes('VAG') || locUpper.includes('VARGINHA')));
  
  if (isPhysicallyHere) return true;

  // Se o CTRC está sob responsabilidade de entrega (aguardando entrega pela filial ativa)
  const hubUpper = (ctrc.pracaHub || '').toUpperCase();
  const destUpper = (ctrc.pracaDestino || '').toUpperCase();
  const isAwaitingDeliveryFromHere = hubUpper === unitUpper || 
    destUpper === unitUpper ||
    (unitUpper === 'VGA' && (hubUpper === 'VAG' || destUpper === 'VAG'));

  if (isAwaitingDeliveryFromHere) return true;

  return false;
}

export function isLogisticallyCompatible(
  ctrcLocalizacao: string,
  ctrcUnid: string,
  selectedUnit: string,
  ctrcPracaHub?: string,
  ctrcPracaDestino?: string
): boolean {
  const locUpper = (ctrcLocalizacao || '').toUpperCase();
  const unitUpper = (selectedUnit || '').toUpperCase();
  
  if (unitUpper === 'TODAS') return true;

  const hubUpper = (ctrcPracaHub || '').toUpperCase();
  const destUpper = (ctrcPracaDestino || '').toUpperCase();

  // If the CTRC is under delivery responsibility of this unit, it is logistically compatible
  const isAwaitingDeliveryFromHere = hubUpper === unitUpper || 
    destUpper === unitUpper ||
    (unitUpper === 'VGA' && (hubUpper === 'VAG' || destUpper === 'VAG'));

  // Se a localização atual do CTRC estiver vazia, assumimos como compatível com a própria unidade declarada no CTRC (ctrc.unid)
  // ou se estiver aguardando entrega desta unidade
  if (!locUpper) {
    const isDirectUnit = (ctrcUnid || '').toUpperCase() === unitUpper ||
      (unitUpper === 'VGA' && (ctrcUnid || '').toUpperCase() === 'VAG') ||
      (unitUpper === 'VAG' && (ctrcUnid || '').toUpperCase() === 'VGA');
    
    return isDirectUnit || isAwaitingDeliveryFromHere;
  }

  // Mapeamento de sinonimos e siglas de unidades operacionais conhecidas
  const unitMapping: Record<string, string[]> = {
    VGA: ['VARGINHA', 'VGA', 'VAG'],
    JDF: ['JUIZ DE FORA', 'JDF', 'JF', 'JUIZ DE FORA/PORTARIA'],
    PPY: ['POUSO ALEGRE', 'PPY', 'PA'],
    BHS: ['BELO HORIZONTE', 'BHS', 'BH'],
    SPO: ['SÃO PAULO', 'SAO PAULO', 'SPO', 'MATRIZ'],
    RIO: ['RIO DE JANEIRO', 'RIO', 'RJ'],
  };

  // Se o CTRC disser "EM TRANSITO COM DESTINO" ou similar para outra unidade
  for (const [key, names] of Object.entries(unitMapping)) {
    if (key !== unitUpper) {
      const hasOtherUnitInLoc = names.some(name => 
        locUpper.includes(`DESTINO A UNIDADE ${name}`) || 
        locUpper.includes(`DESTINO AN UNIDADE ${name}`) ||
        locUpper.includes(`DESTINO: ${name}`) ||
        locUpper.includes(`DESTINO: MG/${name}`) ||
        (locUpper.includes('EM TRANSITO') && locUpper.startsWith(`${name}`)) ||
        (locUpper.includes('EM TRÂNSI') && locUpper.startsWith(`${name}`))
      );
      
      if (hasOtherUnitInLoc) {
        return false;
      }
    }
  }

  return true;
}

export function useRoteirizacaoFilters({ ctrcs, adminUser }: UseRoteirizacaoFiltersProps) {
  // Unit select filter
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (!adminUser.is_master) {
      return (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
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
  const [showOtherUnits, setShowOtherUnits] = useState<boolean>(false);
  const [logisticScope, setLogisticScope] = useState<'my-unit' | 'my-unit-transit' | 'all-units' | 'incompatible'>('my-unit-transit');

  // Multi-select Occurrence Sectors filter
  const [selectedOccurrenceSectors, setSelectedOccurrenceSectors] = useState<string[]>(DEFAULT_ROUTE_SECTORS);

  // New Excel-style column filters (null means all selected / no filter active)
  const [excelRouteFilter, setExcelRouteFilter] = useState<string[] | null>(null);
  const [excelCityFilter, setExcelCityFilter] = useState<string[] | null>(null);
  const [excelDestFilter, setExcelDestFilter] = useState<string[] | null>(null);
  const [excelPrevFilter, setExcelPrevFilter] = useState<string[] | null>(null);
  const [excelStatusFilter, setExcelStatusFilter] = useState<string[] | null>(null);
  const [excelLocationFilter, setExcelLocationFilter] = useState<string[] | null>(null);
  const [excelSenderFilter, setExcelSenderFilter] = useState<string[] | null>(null);
  const [excelOcorrSectorFilter, setExcelOcorrSectorFilter] = useState<string[] | null>(null);

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
        const activeUnit = adminUser.is_master
          ? selectedUnit
          : (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
        return isEligibleForUnit(c, activeUnit);
      })
      .map((c) => c.effectiveRoute || c.normRota)
      .filter(Boolean);
    return Array.from(new Set(list)).sort() as string[];
  }, [ctrcs, selectedUnit, adminUser]);

  // Base unit-filtered candidates for Excel column filters values lists
  const afterUnitCtrcs = useMemo(() => {
    return ctrcs.filter((ctrc) => {
      const activeUnit = adminUser.is_master
        ? selectedUnit
        : (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
      return isEligibleForUnit(ctrc, activeUnit);
    });
  }, [ctrcs, adminUser, selectedUnit]);

  const excelUniqueRoutes = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.effectiveRoute || c.normRota || 'SEM ROTA').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueCities = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.normCidade || c.cidade || 'SEM CIDADE').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueDests = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.destinatario || 'SEM DESTINATÁRIO').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniquePrevs = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.prev_ent || 'SEM PREVISÃO').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueStatuses = useMemo(() => {
    const list = afterUnitCtrcs.map(c => {
      const pStatus = c.planningStatus;
      if (pStatus === 'CONSOLIDADO') return 'PROGRAMADO';
      if (pStatus === 'PLANEJADO') return 'PRÉ-ROMANEIO';
      if (pStatus === 'URGENTE') return 'URGENTE';
      if (pStatus === 'PRIORIDADE') return 'PRIORITÁRIO';
      if (pStatus === 'SEGURAR') return 'HOLD';
      if (pStatus === 'NAO_SAI_HOJE') return 'CORTE';

      const rawStatus = (c.availabilityLabel || c.status || '').toUpperCase();
      if (rawStatus.includes('AGUARDANDO') || rawStatus === 'DISPONÍVEL' || rawStatus === 'DISPONIVEL' || rawStatus === 'LIBERADO') {
        return 'NA MESA';
      }
      if (rawStatus.includes('EM ROTA') || rawStatus.includes('S SPO') || rawStatus.includes('TRÂNSITO') || rawStatus.includes('TRANSIT')) {
        return 'EM TRÂNSITO';
      }
      if (rawStatus.includes('RETIDO') || rawStatus.includes('PROBLEMA') || rawStatus.includes('AVERIGUA') || rawStatus.includes('VISTORIA')) {
        return 'RETIDO/AUDIT';
      }
      return rawStatus || 'SEM STATUS';
    });
    return Array.from(new Set(list)).map((s: string) => s.toUpperCase().trim()).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueLocs = useMemo(() => {
    const list = afterUnitCtrcs.map(c => {
      const normLoc = c.locationLabel ? c.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
      const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLoc;
      return displayLoc.toUpperCase().trim();
    });
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueSenders = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.remetente || 'SEM REMETENTE').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  const excelUniqueOcorrSectors = useMemo(() => {
    const list = afterUnitCtrcs.map(c => (c.occurrenceSector || 'SEM SETOR').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs]);

  // Apply sequential filtering and sorting logic
  const { filteredCtrcs, filterCounts } = useMemo(() => {
    // Step 1: Filial target check
    const afterUnit = ctrcs.filter((ctrc) => {
      const activeUnit = adminUser.is_master
        ? selectedUnit
        : (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
      return isEligibleForUnit(ctrc, activeUnit);
    });

    // Step 2: Route/Sector filtering (based on effectiveRoute or normRota)
    const afterRoute = afterUnit.filter((ctrc) => {
      if (selectedSector !== 'all' && (ctrc.effectiveRoute || ctrc.normRota) !== selectedSector) return false;
      return true;
    });

    // Step 3: Setor Ocorrência Filter (multi-select)
    const afterOccurrence = afterRoute.filter((ctrc) => {
      const sector = ctrc.occurrenceSector || 'Sem setor';
      if (selectedOccurrenceSectors.length > 0 && !selectedOccurrenceSectors.includes(sector)) return false;
      return true;
    });

    // Step 4: Case-insensitive unified query search
    const afterSearch = afterOccurrence.filter((ctrc) => {
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
        const mOcorrCode = (ctrc.occurrenceCode || '').toLowerCase().includes(query) || (ctrc.ocorrencia || '').toLowerCase().includes(query);
        const mOcorrDesc = (ctrc.occurrenceDescription || '').toLowerCase().includes(query) || (ctrc.descricao_ocorr || '').toLowerCase().includes(query);
        
        return (mId || mDest || mRem || mCid || mNf || mSetor || mLoc || mRoute || mNote || mOcorrCode || mOcorrDesc);
      }
      return true;
    });

    // Step 5: Logistics Compatibility Check
    const afterLogistic = afterSearch.filter((ctrc) => {
      const targetUnit = adminUser.is_master 
        ? (selectedUnit === 'TODAS' ? 'TODAS' : selectedUnit)
        : (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
      
      const isCompat = isLogisticallyCompatible(
        ctrc.locationLabel || ctrc.localizacao || '',
        ctrc.unid || '',
        targetUnit,
        ctrc.pracaHub,
        ctrc.pracaDestino
      );
      
      const isTransit = (ctrc.availabilityLabel || ctrc.status || '').toUpperCase() === 'EM TRÂNSITO' || 
                        (ctrc.disponibilidade || '').toUpperCase() === 'EM TRÂNSITO' ||
                        (ctrc.locationLabel || ctrc.localizacao || '').toUpperCase().includes('→') ||
                        (ctrc.locationLabel || ctrc.localizacao || '').toUpperCase().includes('EM TRÂNSI') ||
                        (ctrc.locationLabel || ctrc.localizacao || '').toUpperCase().includes('PARA FILIAL');

      if (logisticScope === 'my-unit') {
        return isCompat && !isTransit;
      } else if (logisticScope === 'my-unit-transit') {
        return isCompat;
      } else if (logisticScope === 'all-units') {
        return true;
      } else if (logisticScope === 'incompatible') {
        return !isCompat;
      }
      return true;
    });

    // Step 6: Status/Fase Check (unfiltered at this stage)
    const afterStatus = afterLogistic;

    // Excel column multi-select filters
    // Excel Route Filter
    const excelAfterRoute = excelRouteFilter === null 
      ? afterStatus 
      : afterStatus.filter(c => {
          const val = (c.effectiveRoute || c.normRota || 'SEM ROTA').toUpperCase().trim();
          return excelRouteFilter.includes(val);
        });

    // Excel City Filter
    const excelAfterCity = excelCityFilter === null 
      ? excelAfterRoute 
      : excelAfterRoute.filter(c => {
          const val = (c.normCidade || c.cidade || 'SEM CIDADE').toUpperCase().trim();
          return excelCityFilter.includes(val);
        });

    // Excel Destinatario Filter
    const excelAfterDest = excelCityFilter === null && excelDestFilter === null
      ? excelAfterCity 
      : excelAfterCity.filter(c => {
          if (excelDestFilter === null) return true;
          const val = (c.destinatario || 'SEM DESTINATÁRIO').toUpperCase().trim();
          return excelDestFilter.includes(val);
        });

    // Excel Previsao Filter
    const excelAfterPrev = excelPrevFilter === null 
      ? excelAfterDest 
      : excelAfterDest.filter(c => {
          const val = (c.prev_ent || 'SEM PREVISÃO').toUpperCase().trim();
          return excelPrevFilter.includes(val);
        });

    // Excel Status Filter
    const excelAfterStatusState = excelStatusFilter === null 
      ? excelAfterPrev 
      : excelAfterPrev.filter(c => {
          const pStatus = c.planningStatus;
          let label = '';
          if (pStatus === 'CONSOLIDADO') label = 'PROGRAMADO';
          else if (pStatus === 'PLANEJADO') label = 'PRÉ-ROMANEIO';
          else if (pStatus === 'URGENTE') label = 'URGENTE';
          else if (pStatus === 'PRIORIDADE') label = 'PRIORITÁRIO';
          else if (pStatus === 'SEGURAR') label = 'HOLD';
          else if (pStatus === 'NAO_SAI_HOJE') label = 'CORTE';
          else {
            const rawStatus = (c.availabilityLabel || c.status || '').toUpperCase();
            if (rawStatus.includes('AGUARDANDO') || rawStatus === 'DISPONÍVEL' || rawStatus === 'DISPONIVEL' || rawStatus === 'LIBERADO') {
              label = 'NA MESA';
            } else if (rawStatus.includes('EM ROTA') || rawStatus.includes('S SPO') || rawStatus.includes('TRÂNSITO') || rawStatus.includes('TRANSIT')) {
              label = 'EM TRÂNSITO';
            } else if (rawStatus.includes('RETIDO') || rawStatus.includes('PROBLEMA') || rawStatus.includes('AVERIGUA') || rawStatus.includes('VISTORIA')) {
              label = 'RETIDO/AUDIT';
            } else {
              label = rawStatus || 'SEM STATUS';
            }
          }
          return excelStatusFilter.includes(label.toUpperCase().trim());
        });

    // Excel Location Filter
    const excelAfterLoc = excelLocationFilter === null 
      ? excelAfterStatusState 
      : excelAfterStatusState.filter(c => {
          const normLoc = c.locationLabel ? c.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
          const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLoc;
          return excelLocationFilter.includes(displayLoc.toUpperCase().trim());
        });

    // Excel Remetente (Sender) Filter
    const excelAfterSender = excelSenderFilter === null 
      ? excelAfterLoc 
      : excelAfterLoc.filter(c => {
          const val = (c.remetente || 'SEM REMETENTE').toUpperCase().trim();
          return excelSenderFilter.includes(val);
        });

    // Excel Setor Ocorrência Filter
    const excelAfterOcorrSector = excelOcorrSectorFilter === null
      ? excelAfterSender
      : excelAfterSender.filter(c => {
          const val = (c.occurrenceSector || 'SEM SETOR').toUpperCase().trim();
          return excelOcorrSectorFilter.includes(val);
        });

    const sortedList = sortRoteirizacaoItems(excelAfterOcorrSector, sortField, sortDirection);

    return {
      filteredCtrcs: sortedList,
      filterCounts: {
        totalAfterUnitFilter: afterUnit.length,
        totalAfterRouteFilter: afterRoute.length,
        totalAfterOccurrenceFilter: afterOccurrence.length,
        totalAfterSearchFilter: afterSearch.length,
        totalAfterLogisticFilter: afterLogistic.length,
        totalAfterStatusFilter: afterStatus.length,
        totalFinalVisible: sortedList.length,
      }
    };
  }, [ctrcs, adminUser, selectedUnit, selectedSector, searchQuery, logisticScope, selectedOccurrenceSectors, sortField, sortDirection, excelRouteFilter, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter, excelOcorrSectorFilter]);

  // Sync showOtherUnits when logisticScope changes for legacy dependencies
  React.useEffect(() => {
    setShowOtherUnits(logisticScope === 'all-units');
  }, [logisticScope]);

  // Reset function
  const clearFilters = () => {
    setSearchQuery('');
    setShowOtherUnits(false);
    setLogisticScope('my-unit-transit');
    setSelectedSector('all');
    setSelectedLocationFilter('all');
    setActiveTacticalFilter('all');
    setSelectedOccurrenceSectors(DEFAULT_ROUTE_SECTORS);
    setSortField('prev_ent');
    setSortDirection('asc');
    
    // Clear excel filters
    setExcelRouteFilter(null);
    setExcelCityFilter(null);
    setExcelDestFilter(null);
    setExcelPrevFilter(null);
    setExcelStatusFilter(null);
    setExcelLocationFilter(null);
    setExcelSenderFilter(null);
    setExcelOcorrSectorFilter(null);

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
    showOtherUnits,
    setShowOtherUnits,
    logisticScope,
    setLogisticScope,
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
    filterCounts,
    clearFilters,

    // Excel column filters return properties
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
  };
}
