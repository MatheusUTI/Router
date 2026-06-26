import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RoteirizacaoItem, AppUser, RoteirizacaoSortField, SortDirection } from '../../../types';
import { DEFAULT_OPERATIONAL_UNIT } from '../../../constants/operationalUnits';
import { UserPreferenceRepository } from '../../../infrastructure/localdb/repositories/userPreferenceRepository';

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

function getFlowStatusLabel(item: RoteirizacaoItem): string {
  const pStatus = item.planningStatus;
  if (pStatus === 'CONSOLIDADO') return 'PROGRAMADO';
  if (pStatus === 'PLANEJADO') return 'PRÉ-ROMANEIO';
  if (pStatus === 'URGENTE') return 'URGENTE';
  if (pStatus === 'PRIORIDADE') return 'PRIORITÁRIO';
  if (pStatus === 'SEGURAR') return 'HOLD';
  if (pStatus === 'NAO_SAI_HOJE') return 'CORTE';

  const rawStatus = (item.availabilityLabel || item.status || '').toUpperCase();
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
      case 'status': {
        const textA = getFlowStatusLabel(a).toUpperCase().trim();
        const textB = getFlowStatusLabel(b).toUpperCase().trim();
        result = textA.localeCompare(textB, 'pt-BR');
        break;
      }
      case 'localizacao': {
        const normLocA = a.locationLabel ? a.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
        const normLocB = b.locationLabel ? b.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
        const displayLocA = (!normLocA || normLocA === '' || normLocA === 'SEM BOX' || normLocA === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLocA;
        const displayLocB = (!normLocB || normLocB === '' || normLocB === 'SEM BOX' || normLocB === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLocB;
        result = displayLocA.toUpperCase().localeCompare(displayLocB.toUpperCase(), 'pt-BR');
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

const DEBUG_PRACA_DESTINO = false;

export function extractUnitFromPracaDestino(value?: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  // Normalizar: uppercase e remover tudo que não for alfanumérico
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (normalized.length < 3) return null;
  
  let unit = normalized.slice(0, 3);
  
  // Aliases de segurança conforme regra de negócio
  if (unit === 'VAG' || unit === 'VGS') {
    unit = 'VGA';
  }
  
  return unit;
}

export function resolveMesaOperationalUnit(ctrc: any): { unit: string, source: string, evidence: string } {
  // 1. pracaDestino ou variações no objeto importado usando a extração das 3 primeiras letras
  const pracaDestinoFields = [
    'pracaDestino', 'praçaDestino', 'praca_destino', 'praça_destino',
    'destinoPraca', 'destino_praca', 'praca_dest'
  ];

  for (const field of pracaDestinoFields) {
    if (ctrc[field] && typeof ctrc[field] === 'string' && ctrc[field].trim() !== '') {
      const extracted = extractUnitFromPracaDestino(ctrc[field]);
      if (extracted) {
        return { unit: extracted, source: 'pracaDestino', evidence: `${field}: ${ctrc[field]}` };
      }
    }
  }

  // 2. Explicit destination fields
  const explicitFields = [
    'unidadeDestino', 'filialDestino', 'unidDestino', 
    'destinoUnidade', 'operationalUnit', 'mesaOperationalUnit', 'deliveryUnit'
  ];
  
  for (const field of explicitFields) {
    if (ctrc[field] && typeof ctrc[field] === 'string' && ctrc[field].trim() !== '') {
      let val = ctrc[field].trim().toUpperCase();
      if (val === 'VAG' || val === 'VGS') val = 'VGA';
      return { unit: val, source: 'explicit_destination', evidence: `${field}: ${val}` };
    }
  }

  // 3. Mapeamento por cidade/rota (base temporária hardcoded para o caso BHZ/VGA, ou geral)
  const normCidade = (ctrc.normCidade || ctrc.cidade || ctrc.cidade_ent || '').toUpperCase().trim();
  const normRota = (ctrc.effectiveRoute || ctrc.normRota || '').toUpperCase().trim();

  // Mapeamento operacional conhecido temporário:
  // TODO: Em fase futura, usar base de Cidades/Rotas associada à operação
  const vgaCities = [
    'TRES CORACOES', 'TRÊS CORAÇÕES',
    'CAXAMBU',
    'VARGINHA',
    'LAVRAS',
    'ALFENAS',
    'POUSO ALEGRE',
    'SAO LOURENCO', 'SÃO LOURENÇO',
    'EXTREMA',
    'ITAJUBA', 'ITAJUBÁ',
    'PASSOS',
    'BOA ESPERANCA', 'BOA ESPERANÇA',
    'CAMBUQUIRA',
    'LAMBARI',
    'POCOS DE CALDAS', 'POÇOS DE CALDAS'
  ];
  
  if (normCidade && vgaCities.includes(normCidade)) {
    return { unit: 'VGA', source: 'cidade_rota', evidence: `cidade: ${normCidade}` };
  }

  if (normCidade === 'BELO HORIZONTE' || normCidade === 'CONTAGEM' || normCidade === 'BETIM' || normCidade === 'NOVA LIMA') {
    return { unit: 'BHZ', source: 'cidade_rota', evidence: `cidade: ${normCidade}` };
  }

  // 4. Fallback por série/unid do documento originador
  const unid = (ctrc.unid || '').toUpperCase().trim();
  if (unid) {
    let val = unid;
    if (val === 'VGS' || val === 'VAG') val = 'VGA';
    return { unit: val, source: 'unid_fallback', evidence: `unid: ${unid}` };
  }
  
  // 5. Fallback por pracaHub, sendo a última opção pois pode ser apenas local de passagem
  const hub = (ctrc.pracaHub || '').toUpperCase().trim();
  if (hub) {
    let val = hub;
    if (val === 'VAG' || val === 'VGS') val = 'VGA';
    return { unit: val, source: 'pracaHub_fallback', evidence: `pracaHub: ${hub}` };
  }

  // 6. Fallback final
  return { unit: 'DESCONHECIDA', source: 'unknown', evidence: 'nenhuma informação de destino encontrada' };
}

export function getMesaOperationalUnit(ctrc: RoteirizacaoItem): string {
  const result = resolveMesaOperationalUnit(ctrc);
  
  if (DEBUG_PRACA_DESTINO && Math.random() < 0.05) {
    console.log('[DEBUG_PRACA_DESTINO]', {
      id: ctrc.id,
      pracaDestino: (ctrc as any).pracaDestino,
      unid: ctrc.unid,
      cidade: (ctrc as any).cidade,
      localizacao: ctrc.localizacao,
      resolvedUnit: result.unit,
      source: result.source,
      evidence: result.evidence
    });
  }

  return result.unit;
}

export function isEligibleForUnit(ctrc: RoteirizacaoItem, targetUnit: string): boolean {
  const unitUpper = (targetUnit || '').toUpperCase();
  if (unitUpper === 'TODAS') return true;

  const operationalUnit = getMesaOperationalUnit(ctrc);
  
  if (operationalUnit === unitUpper) return true;
  
  // Aliases safety just in case
  if (unitUpper === 'VGA' && operationalUnit === 'VAG') return true;
  if (unitUpper === 'VAG' && operationalUnit === 'VGA') return true;

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
  const [excelOcorrSectorFilter, setExcelOcorrSectorFilter] = useState<string[] | null>(
    DEFAULT_ROUTE_SECTORS.map((s) => s.toUpperCase().trim())
  );

  const [isPrefLoaded, setIsPrefLoaded] = useState<boolean>(false);
  const username = adminUser?.username || '';

  // Load preferences
  useEffect(() => {
    if (!username) return;
    setIsPrefLoaded(false);

    const loadAndSyncFilters = async () => {
      try {
        // Fetch local cached preferences first
        const localPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
        if (localPref?.preferences?.roteirizacao) {
          const p = localPref.preferences.roteirizacao;
          if (p.selectedUnit !== undefined) setSelectedUnit(p.selectedUnit);
          if (p.selectedSector !== undefined) setSelectedSector(p.selectedSector);
          if (p.selectedLocationFilter !== undefined) setSelectedLocationFilter(p.selectedLocationFilter);
          if (p.searchQuery !== undefined) setSearchQuery(p.searchQuery);
          if (p.showOtherUnits !== undefined) setShowOtherUnits(p.showOtherUnits);
          if (p.logisticScope !== undefined) setLogisticScope(p.logisticScope);
          if (p.activeTacticalFilter !== undefined) setActiveTacticalFilter(p.activeTacticalFilter);
          if (p.selectedEligibility !== undefined) setSelectedEligibility(p.selectedEligibility);
          if (p.selectedOccurrenceSectors !== undefined) setSelectedOccurrenceSectors(p.selectedOccurrenceSectors);
          if (p.sortField !== undefined) setSortField(p.sortField);
          if (p.sortDirection !== undefined) setSortDirection(p.sortDirection);
          if (p.excelRouteFilter !== undefined) setExcelRouteFilter(p.excelRouteFilter);
          if (p.excelCityFilter !== undefined) setExcelCityFilter(p.excelCityFilter);
          if (p.excelDestFilter !== undefined) setExcelDestFilter(p.excelDestFilter);
          if (p.excelPrevFilter !== undefined) setExcelPrevFilter(p.excelPrevFilter);
          if (p.excelStatusFilter !== undefined) setExcelStatusFilter(p.excelStatusFilter);
          if (p.excelLocationFilter !== undefined) setExcelLocationFilter(p.excelLocationFilter);
          if (p.excelSenderFilter !== undefined) setExcelSenderFilter(p.excelSenderFilter);
          if (p.excelOcorrSectorFilter !== undefined) setExcelOcorrSectorFilter(p.excelOcorrSectorFilter);
        }
        setIsPrefLoaded(true);

        // Sync cloud in background (non-blocking)
        UserPreferenceRepository.syncUserPreferences(username).then(async () => {
          const syncedPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
          if (syncedPref?.preferences?.roteirizacao) {
            const p = syncedPref.preferences.roteirizacao;
            if (p.selectedUnit !== undefined) setSelectedUnit(p.selectedUnit);
            if (p.selectedSector !== undefined) setSelectedSector(p.selectedSector);
            if (p.selectedLocationFilter !== undefined) setSelectedLocationFilter(p.selectedLocationFilter);
            if (p.searchQuery !== undefined) setSearchQuery(p.searchQuery);
            if (p.showOtherUnits !== undefined) setShowOtherUnits(p.showOtherUnits);
            if (p.logisticScope !== undefined) setLogisticScope(p.logisticScope);
            if (p.activeTacticalFilter !== undefined) setActiveTacticalFilter(p.activeTacticalFilter);
            if (p.selectedEligibility !== undefined) setSelectedEligibility(p.selectedEligibility);
            if (p.selectedOccurrenceSectors !== undefined) setSelectedOccurrenceSectors(p.selectedOccurrenceSectors);
            if (p.sortField !== undefined) setSortField(p.sortField);
            if (p.sortDirection !== undefined) setSortDirection(p.sortDirection);
            if (p.excelRouteFilter !== undefined) setExcelRouteFilter(p.excelRouteFilter);
            if (p.excelCityFilter !== undefined) setExcelCityFilter(p.excelCityFilter);
            if (p.excelDestFilter !== undefined) setExcelDestFilter(p.excelDestFilter);
            if (p.excelPrevFilter !== undefined) setExcelPrevFilter(p.excelPrevFilter);
            if (p.excelStatusFilter !== undefined) setExcelStatusFilter(p.excelStatusFilter);
            if (p.excelLocationFilter !== undefined) setExcelLocationFilter(p.excelLocationFilter);
            if (p.excelSenderFilter !== undefined) setExcelSenderFilter(p.excelSenderFilter);
            if (p.excelOcorrSectorFilter !== undefined) setExcelOcorrSectorFilter(p.excelOcorrSectorFilter);
          }
        }).catch((err) => {
          console.warn('[useRoteirizacaoFilters] Falha de sync remota de preferências:', err);
        });

      } catch (err) {
        console.error('[useRoteirizacaoFilters] Falha ao carregar preferências:', err);
        setIsPrefLoaded(true);
      }
    };

    loadAndSyncFilters();
  }, [username]);

  // Debounced Save Preferences
  useEffect(() => {
    if (!isPrefLoaded || !username) return;

    const timer = setTimeout(async () => {
      try {
        const localPref = await UserPreferenceRepository.getLocalPreference(username, 'roteirizacao');
        const existingRoteirizacao = localPref?.preferences?.roteirizacao || {};
        
        const newRoteirizacao = {
          ...existingRoteirizacao,
          selectedUnit,
          selectedSector,
          selectedLocationFilter,
          searchQuery,
          showOtherUnits,
          logisticScope,
          activeTacticalFilter,
          selectedEligibility,
          selectedOccurrenceSectors,
          sortField,
          sortDirection,
          excelRouteFilter,
          excelCityFilter,
          excelDestFilter,
          excelPrevFilter,
          excelStatusFilter,
          excelLocationFilter,
          excelSenderFilter,
          excelOcorrSectorFilter,
        };

        const updated = await UserPreferenceRepository.saveLocalPreference(
          username,
          'roteirizacao',
          { ...localPref?.preferences, roteirizacao: newRoteirizacao }
        );

        // Try pushing to cloud in background (non-blocking)
        UserPreferenceRepository.pushUserPreferenceToCloud(updated).catch((err) => {
          console.warn('[useRoteirizacaoFilters] Erro silencioso ao tentar sincronizar preferência com nuvem:', err);
        });
      } catch (err) {
        console.error('[useRoteirizacaoFilters] Erro ao salvar preferências:', err);
      }
    }, 500); // Debounce of 500ms (between 300 and 800ms)

    return () => clearTimeout(timer);
  }, [
    username,
    isPrefLoaded,
    selectedUnit,
    selectedSector,
    selectedLocationFilter,
    searchQuery,
    showOtherUnits,
    logisticScope,
    activeTacticalFilter,
    selectedEligibility,
    selectedOccurrenceSectors,
    sortField,
    sortDirection,
    excelRouteFilter,
    excelCityFilter,
    excelDestFilter,
    excelPrevFilter,
    excelStatusFilter,
    excelLocationFilter,
    excelSenderFilter,
    excelOcorrSectorFilter
  ]);

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

  const applyFilters = (
    items: RoteirizacaoItem[],
    options: {
      ignore?: 'route' | 'city' | 'dest' | 'prev' | 'status' | 'location' | 'sender' | 'occurrenceSector';
    } = {}
  ): RoteirizacaoItem[] => {
    let current = items;

    // Route Filter (ignore if ignore === 'route')
    if (options.ignore !== 'route' && excelRouteFilter !== null) {
      current = current.filter(c => {
        const val = (c.effectiveRoute || c.normRota || 'SEM ROTA').toUpperCase().trim();
        return excelRouteFilter.includes(val);
      });
    }

    // Occurrence Sector Filter (ignore if ignore === 'occurrenceSector')
    if (options.ignore !== 'occurrenceSector' && excelOcorrSectorFilter !== null) {
      current = current.filter(c => {
        const val = (c.occurrenceSector || 'SEM SETOR').toUpperCase().trim();
        return excelOcorrSectorFilter.includes(val);
      });
    }

    // Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      current = current.filter((ctrc) => {
        const mId = (ctrc.id || '').toLowerCase().includes(query);
        const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
        const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
        const mCid = (ctrc.normCidade || ctrc.cidade || ctrc.cidade_ent || '').toLowerCase().includes(query);
        const mNf = (ctrc.nf || '').toLowerCase().includes(query);
        const mSetor = (ctrc.normSetor || '').toLowerCase().includes(query);
        const mRoute = (ctrc.effectiveRoute || '').toLowerCase().includes(query) || (ctrc.normRota || '').toLowerCase().includes(query);
        const mLoc = (ctrc.locationLabel || '').toLowerCase().includes(query) || (ctrc.localizacao || '').toLowerCase().includes(query);
        const mNote = (ctrc.operationalNote || '').toLowerCase().includes(query);
        const mOcorrCode = (ctrc.occurrenceCode || '').toLowerCase().includes(query) || (ctrc.ocorrencia || '').toLowerCase().includes(query);
        const mOcorrDesc = (ctrc.occurrenceDescription || '').toLowerCase().includes(query) || (ctrc.descricao_ocorr || '').toLowerCase().includes(query);
        
        return (mId || mDest || mRem || mCid || mNf || mSetor || mLoc || mRoute || mNote || mOcorrCode || mOcorrDesc);
      });
    }

    // Logistics Compatibility Check
    current = current.filter((ctrc) => {
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

    // City Filter (ignore if ignore === 'city')
    if (options.ignore !== 'city' && excelCityFilter !== null) {
      current = current.filter(c => {
        const val = (c.normCidade || c.cidade || c.cidade_ent || 'SEM CIDADE').toUpperCase().trim();
        return excelCityFilter.includes(val);
      });
    }

    // Destinatario Filter (ignore if ignore === 'dest')
    if (options.ignore !== 'dest' && excelDestFilter !== null) {
      current = current.filter(c => {
        const val = (c.destinatario || 'SEM DESTINATÁRIO').toUpperCase().trim();
        return excelDestFilter.includes(val);
      });
    }

    // Previsao Filter (ignore if ignore === 'prev')
    if (options.ignore !== 'prev' && excelPrevFilter !== null) {
      current = current.filter(c => {
        const val = (c.prev_ent || 'SEM PREVISÃO').toUpperCase().trim();
        return excelPrevFilter.includes(val);
      });
    }

    // Status/Occurrence Filter (ignore if ignore === 'status')
    if (options.ignore !== 'status' && excelStatusFilter !== null) {
      current = current.filter(c => {
        let label = 'SEM OCORRÊNCIA';
        if (c.occurrenceCode) {
          const code = String(c.occurrenceCode);
          const occName = c.occurrenceDescription === 'Ocorrência não mapeada' ? 'OCORRÊNCIA' : (c.occurrenceDescription || 'OCORRÊNCIA').toUpperCase();
          label = `OC ${code} · ${occName}`;
        }
        return excelStatusFilter.includes(label.toUpperCase().trim());
      });
    }

    // Location Filter (ignore if ignore === 'location')
    if (options.ignore !== 'location' && excelLocationFilter !== null) {
      current = current.filter(c => {
        const normLoc = c.locationLabel ? c.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
        const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLoc;
        return excelLocationFilter.includes(displayLoc.toUpperCase().trim());
      });
    }

    // Sender Filter (ignore if ignore === 'sender')
    if (options.ignore !== 'sender' && excelSenderFilter !== null) {
      current = current.filter(c => {
        const val = (c.remetente || 'SEM REMETENTE').toUpperCase().trim();
        return excelSenderFilter.includes(val);
      });
    }

    return current;
  };

  const excelUniqueRoutes = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'route' });
    const list = contextualItems.map(c => (c.effectiveRoute || c.normRota || 'SEM ROTA').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter]);

  const excelUniqueCities = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'city' });
    const list = contextualItems.map(c => (c.normCidade || c.cidade || c.cidade_ent || 'SEM CIDADE').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter]);

  const excelUniqueDests = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'dest' });
    const list = contextualItems.map(c => (c.destinatario || 'SEM DESTINATÁRIO').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter]);

  const excelUniquePrevs = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'prev' });
    const list = contextualItems.map(c => (c.prev_ent || 'SEM PREVISÃO').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter]);

  const excelUniqueStatuses = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'status' });
    const list = contextualItems.map(c => {
      if (c.occurrenceCode) {
        const code = String(c.occurrenceCode);
        const occName = c.occurrenceDescription === 'Ocorrência não mapeada' ? 'OCORRÊNCIA' : (c.occurrenceDescription || 'OCORRÊNCIA').toUpperCase();
        return `OC ${code} · ${occName}`;
      }
      return 'SEM OCORRÊNCIA';
    });
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelPrevFilter, excelLocationFilter, excelSenderFilter]);

  const excelUniqueLocs = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'location' });
    const list = contextualItems.map(c => {
      const normLoc = c.locationLabel ? c.locationLabel.replace(/📍/g, '').replace(/BOX\s*:?/ig, '').trim() : '';
      const displayLoc = (!normLoc || normLoc === '' || normLoc === 'SEM BOX' || normLoc === 'NÃO INFORMADO') ? 'S/ LOCALIZAÇÃO' : normLoc;
      return displayLoc.toUpperCase().trim();
    });
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelSenderFilter]);

  const excelUniqueSenders = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'sender' });
    const list = contextualItems.map(c => (c.remetente || 'SEM REMETENTE').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, excelOcorrSectorFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter]);

  const excelUniqueOcorrSectors = useMemo(() => {
    const contextualItems = applyFilters(afterUnitCtrcs, { ignore: 'occurrenceSector' });
    const list = contextualItems.map(c => (c.occurrenceSector || 'SEM SETOR').toUpperCase().trim());
    return Array.from(new Set(list)).sort();
  }, [afterUnitCtrcs, excelRouteFilter, searchQuery, selectedUnit, adminUser, logisticScope, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter]);

  // Apply sequential filtering and sorting logic
  const { filteredCtrcs, filterCounts } = useMemo(() => {
    // Step 1: Filial target check
    const afterUnit = ctrcs.filter((ctrc) => {
      const activeUnit = adminUser.is_master
        ? selectedUnit
        : (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
      return isEligibleForUnit(ctrc, activeUnit);
    });

    const finalFiltered = applyFilters(afterUnit, {});
    const sortedList = sortRoteirizacaoItems(finalFiltered, sortField, sortDirection);

    // Step 2: Route/Sector filtering (excelRouteFilter) - Single source of truth (for diagnostic counts)
    const afterRoute = excelRouteFilter === null 
      ? afterUnit 
      : afterUnit.filter(c => {
          const val = (c.effectiveRoute || c.normRota || 'SEM ROTA').toUpperCase().trim();
          return excelRouteFilter.includes(val);
        });

    // Step 3: Setor Ocorrência Filter (excelOcorrSectorFilter) - Single source of truth (for diagnostic counts)
    const afterOccurrence = excelOcorrSectorFilter === null
      ? afterRoute 
      : afterRoute.filter(c => {
          const val = (c.occurrenceSector || 'SEM SETOR').toUpperCase().trim();
          return excelOcorrSectorFilter.includes(val);
        });

    // Step 4: Case-insensitive unified query search (for diagnostic counts)
    const afterSearch = afterOccurrence.filter((ctrc) => {
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const mId = (ctrc.id || '').toLowerCase().includes(query);
        const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
        const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
        const mCid = (ctrc.normCidade || ctrc.cidade || ctrc.cidade_ent || '').toLowerCase().includes(query);
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

    // Step 5: Logistics Compatibility Check (for diagnostic counts)
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

    // Step 6: Status/Fase Check (unfiltered at this stage) (for diagnostic counts)
    const afterStatus = afterLogistic;

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
  }, [ctrcs, adminUser, selectedUnit, searchQuery, logisticScope, sortField, sortDirection, excelRouteFilter, excelCityFilter, excelDestFilter, excelPrevFilter, excelStatusFilter, excelLocationFilter, excelSenderFilter, excelOcorrSectorFilter]);

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

  const uniqueUnits = useMemo(() => {
    const list = ctrcs.map(c => getMesaOperationalUnit(c));
    return Array.from(new Set(list)).filter(u => u !== '' && u !== 'TODAS').sort();
  }, [ctrcs]);

  return {
    selectedUnit,
    setSelectedUnit,
    uniqueUnits,
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
