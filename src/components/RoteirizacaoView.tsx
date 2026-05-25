import React, { useState, useEffect } from 'react';
import { Ctrc, Vehicle, AppUser, CurvaAClient, CidadeRota, DeliveryOccurrence } from '../types';
import { CidadeRotaRepository } from '../infrastructure/localdb/repositories/cidadeRotaRepository';
import { OccurrenceRepository } from '../infrastructure/localdb/repositories/occurrenceRepository';

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
  adminUser: AppUser;
  curvaAClients?: CurvaAClient[];
}

interface NormalizedCtrc extends Ctrc {
  normCidade: string;
  normSetor: string;
  normRota: string;
  normPrazo: number;
  normPriority: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA';
  isCurvaA: boolean;
  curvaAClass?: string;
  enrichedOcorrenciaDesc?: string;
  enrichedOcorrenciaTratativa?: string;
}

export default function RoteirizacaoView({
  availableCtrcs,
  vehicles,
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
}: RoteirizacaoViewProps) {
  // Routing local states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Grouping modes: 'direct' (raw list), 'city' (grouped by town), 'sector' (grouped by sector)
  const [groupingMode, setGroupingMode] = useState<'direct' | 'city' | 'sector'>('direct');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Column visibilities state with offline persistence in LocalStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('roteirizacao_visible_columns_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback default visibilities
      }
    }
    return {
      ctrc: true,
      cidade_ent: true,
      setor: true,
      prev_ent: true,
      destinatario: true,
      remetente: true,
      nf: true,
      ocorrencia: true,
      valor: true,
      volume: true,
      weight: true,
      disponibilidade: true,
      localizacao: true,
    };
  });

  // Sorting columns states
  const [sortField, setSortField] = useState<string>('ctrc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column widths state for resizing behavior
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    ctrc: 140,
    cidade_ent: 110,
    setor: 100,
    prev_ent: 105,
    destinatario: 220,
    remetente: 180,
    nf: 80,
    ocorrencia: 180,
    valor: 100,
    volume: 80,
    weight: 100,
    disponibilidade: 110,
    localizacao: 150,
  });

  // Active unit filter state
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (!adminUser.is_master) {
      return (adminUser.unid || 'SPO').toUpperCase();
    }
    return (adminUser.unid || 'TODAS').toUpperCase();
  });

  // Normalized available CTRCs holding state
  const [normalizedCtrcs, setNormalizedCtrcs] = useState<NormalizedCtrc[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);
  const [dbOccurrences, setDbOccurrences] = useState<Record<string, DeliveryOccurrence>>({});

  // Auto-Pilot toggle mode: If active, it forces standard city nomenclature correction from BD_CIDADES_ROTAS
  const [autoPilotNormalization, setAutoPilotNormalization] = useState<boolean>(true);

  // Load occurrences and setup normalization chain
  useEffect(() => {
    const initEnrichers = async () => {
      try {
        const occList = await OccurrenceRepository.getAll();
        const occMap: Record<string, DeliveryOccurrence> = {};
        occList.forEach((occ) => {
          occMap[occ.codigo] = occ;
        });
        setDbOccurrences(occMap);
      } catch (e) {
        console.error('[Roteirizacao] Erro ao carregar dicionário de ocorrências:', e);
      }
    };
    initEnrichers();
  }, []);

  // Set initial selected vehicle
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');
  useEffect(() => {
    if (activeVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(activeVehicles[0].id);
    }
  }, [activeVehicles, selectedVehicleId]);

  // Execute async normalization over incoming Ctrcs
  useEffect(() => {
    const processNormalization = async () => {
      setIsNormalizing(true);
      const output: NormalizedCtrc[] = [];

      for (const c of availableCtrcs) {
        // Determine unit
        const ctrcUnid = (c.unid || c.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();

        // 1. Local Normalization lookup against BD_CIDADES_ROTAS
        let normCidade = c.cidade_ent || c.cidade || 'NÃO ESPECIFICADO';
        normCidade = normCidade.split(',')[0].trim().toUpperCase();

        let normSetor = c.setor || 'NÃO DEFINIDO';
        let normRota = 'ROTA INDEFINIDA';
        let normPrazo = 2; // Default Standard lead SLA D+2
        let normPriority: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA' = 'NORMAL';

        if (autoPilotNormalization) {
          try {
            const corrected = await CidadeRotaRepository.normalize(normCidade, c.setor);
            normCidade = corrected.cidade;
            normSetor = corrected.setor;
            normRota = corrected.rota;
            normPrazo = corrected.prazo;
            normPriority = corrected.prioridade;
          } catch (e) {
            // Fallback rules on DB failure
          }
        }

        // 2. Curva A identification by matching sender cnpj or name
        const matchCurva = curvaAClients.find(
          (cl) =>
            cl.cliente_remetente.toUpperCase() === (c.remetente || '').toUpperCase() ||
            (c.cod && cl.cnpj_remetente.includes(c.cod))
        );
        const isCurvaA = !!matchCurva;
        const curvaAClass = matchCurva?.curva_a;

        // 3. Ocorrências lookup
        let enrichedOcorrenciaDesc = 'MERCADORIA EM TRÂNSITO / CONSOLIDAÇÃO';
        let enrichedOcorrenciaTratativa = '';
        if (c.ocorrencia) {
          const matchedOcc = dbOccurrences[c.ocorrencia];
          if (matchedOcc) {
            enrichedOcorrenciaDesc = matchedOcc.descricao;
            enrichedOcorrenciaTratativa = matchedOcc.tratativa_solucao;
          } else {
            // Fuzzy code cleaner
            const codeClean = c.ocorrencia.replace(/[^\d]/g, '');
            const fuzzyMatch = dbOccurrences[codeClean];
            if (fuzzyMatch) {
              enrichedOcorrenciaDesc = fuzzyMatch.descricao;
              enrichedOcorrenciaTratativa = fuzzyMatch.tratativa_solucao;
            }
          }
        }

        output.push({
          ...c,
          unid: ctrcUnid,
          normCidade,
          normSetor,
          normRota,
          normPrazo,
          normPriority,
          isCurvaA,
          curvaAClass,
          enrichedOcorrenciaDesc,
          enrichedOcorrenciaTratativa,
        });
      }

      setNormalizedCtrcs(output);
      setIsNormalizing(false);
    };

    processNormalization();
  }, [availableCtrcs, autoPilotNormalization, dbOccurrences, curvaAClients]);

  // Persist visible columns to LocalStorage on updates
  const handleToggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('roteirizacao_visible_columns_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // Safe row selection state toggling
  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    if (e) {
      // Prevent row toggling if click originates from an interactive element
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('select')) {
        return;
      }
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Master lists filters chain
  const filteredNormalizedCtrcs = normalizedCtrcs.filter((ctrc) => {
    // 1. UNID Access restrictions
    if (!adminUser.is_master) {
      const userUnid = (adminUser.unid || 'SPO').toUpperCase();
      if (ctrc.unid !== userUnid) return false;
    } else {
      if (selectedUnit !== 'TODAS') {
        if (ctrc.unid !== selectedUnit) return false;
      }
    }

    // 2. Sector Filter dropdown
    if (selectedSector !== 'all') {
      if (ctrc.normSetor !== selectedSector) return false;
    }

    // 3. Search text filters
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = (ctrc.id || '').toLowerCase().includes(q);
      const matchDest = (ctrc.destinatario || '').toLowerCase().includes(q);
      const matchRem = (ctrc.remetente || '').toLowerCase().includes(q);
      const matchCid = (ctrc.normCidade || '').toLowerCase().includes(q);
      const matchNf = (ctrc.nf || '').toLowerCase().includes(q);
      if (!matchId && !matchDest && !matchRem && !matchCid && !matchNf) {
        return false;
      }
    }

    return true;
  });

  // Dynamic sectors filter extraction depending on unit selected
  const uniqueSectorsList = Array.from(
    new Set(
      normalizedCtrcs
        .filter((c) => {
          if (!adminUser.is_master) {
            return c.unid === (adminUser.unid || 'SPO').toUpperCase();
          } else {
            if (selectedUnit !== 'TODAS') return c.unid === selectedUnit;
          }
          return true;
        })
        .map((c) => c.normSetor)
        .filter(Boolean)
    )
  ).sort();

  // Reset sector filter if unit changes and sector is no longer selectable
  useEffect(() => {
    if (selectedSector !== 'all' && !uniqueSectorsList.includes(selectedSector)) {
      setSelectedSector('all');
    }
  }, [selectedUnit, uniqueSectorsList, selectedSector]);

  // Interactive Excel columns Sorting logic
  const handleHeaderClick = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCtrcs = [...filteredNormalizedCtrcs].sort((a, b) => {
    let valA: any = a[sortField as keyof NormalizedCtrc] ?? '';
    let valB: any = b[sortField as keyof NormalizedCtrc] ?? '';

    // Field fallbacks
    if (sortField === 'ctrc') {
      valA = a.id;
      valB = b.id;
    } else if (sortField === 'cidade_ent') {
      valA = a.normCidade;
      valB = b.normCidade;
    } else if (sortField === 'setor') {
      valA = a.normSetor;
      valB = b.normSetor;
    } else if (sortField === 'prev_ent') {
      valA = a.prev_ent || '';
      valB = b.prev_ent || '';
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Toggle mass selection inside viewport
  const handleToggleSelectAll = () => {
    const allFilteredIds = sortedCtrcs.map((c) => c.id);
    const areAllSelected =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const isAllSelected =
    sortedCtrcs.length > 0 &&
    sortedCtrcs.map((c) => c.id).every((id) => selectedIds.includes(id));

  // Calculations
  const selectedCtrcsList = normalizedCtrcs.filter((c) => selectedIds.includes(c.id));
  const totalWeight = selectedCtrcsList.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
  const totalVolume = selectedCtrcsList.reduce((sum, c) => sum + (c.volume || 0), 0);
  const totalValue = selectedCtrcsList.reduce((sum, c) => sum + (c.valor || 0), 0);

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handlePickVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsVehicleModalOpen(false);

    const veh = vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      setToastMessage(`Veículo alterado para ${veh.id} (${veh.driverName})`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleGenerateManifest = () => {
    if (selectedIds.length === 0) {
      alert('Selecione ao menos um Conhecimento de Transporte (CTRC) a ser roteirizado.');
      return;
    }

    if (!selectedVehicleId) {
      alert('Selecione primeiro um veículo de frota.');
      setIsVehicleModalOpen(true);
      return;
    }

    // Trigger parent callbacks
    selectedCtrcsList.forEach((c) => {
      onAssignCtre(c.id, selectedVehicleId);
    });

    onConsolidateRomaneio(selectedVehicleId, selectedCtrcsList);
  };

  // Copy helper
  const handleCopyClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setToastMessage(`CTRC ${text} copiado para a área de transferência.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Resizing columns controller using core event handles
  const handleMouseDown = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colId];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: Math.max(50, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Grouping rows engine
  const groupRows = () => {
    const groups: Record<string, NormalizedCtrc[]> = {};
    sortedCtrcs.forEach((ctrc) => {
      const key =
        groupingMode === 'city'
          ? ctrc.normCidade
          : groupingMode === 'sector'
          ? ctrc.normSetor
          : 'DIRECT';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ctrc);
    });
    return groups;
  };

  const groupedCtrcsRegistry = groupRows();

  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Calculate widths
  const getVisibleTableWidth = () => {
    let sum = 45; // Row check size
    Object.keys(visibleColumns).forEach((k) => {
      if (visibleColumns[k]) {
        sum += columnWidths[k] || 100;
      }
    });
    return sum;
  };

  // Render Resizable Header cells
  const renderHeaderCell = (colId: string, label: string, isNumeric = false) => {
    if (!visibleColumns[colId]) return null;
    const width = columnWidths[colId];
    const isSorted = sortField === colId;

    return (
      <th
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        className={`p-2.5 border border-outline-variant relative select-none truncate group bg-[#0f1525] hover:bg-[#141d33] transition-colors cursor-pointer ${
          isNumeric ? 'text-right' : 'text-left'
        }`}
        onClick={() => handleHeaderClick(colId)}
        title={`Clique para ordenar por ${label}`}
      >
        <div className={`flex items-center gap-1 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
          <span className="font-sans font-bold text-[#dae2fd] text-[10.5px] uppercase tracking-wider">{label}</span>
          {isSorted ? (
            <span className="material-symbols-outlined text-[13px] text-primary">
              {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          ) : (
            <span className="material-symbols-outlined text-[13px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
              swap_vert
            </span>
          )}
        </div>
        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, colId);
          }}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 border-r border-transparent hover:border-primary/50 transition-colors z-10"
        />
      </th>
    );
  };

  // High density SLA comparative warning engine (Reference Time: May 25, 2026)
  const renderSLAPill = (prevEntStr: string) => {
    if (!prevEntStr) return <span className="text-slate-400 font-sans text-xs">Sem data</span>;

    // Normalizing standard date parsing Brazilian structure dd/mm/yyyy
    const parts = prevEntStr.split('/');
    if (parts.length < 3) return <span className="text-slate-400 font-sans text-xs">{prevEntStr}</span>;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const itemDate = new Date(year, month, day);

    // Current system reference is: 2026-05-25 (Local system timeline)
    const refDate = new Date(2026, 4, 25); // May 25, 2026
    const diffMs = itemDate.getTime() - refDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[9.5px] font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wide inline-flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
          {prevEntStr} (Atrasado)
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="bg-primary/10 text-primary border border-primary/20 text-[9.5px] font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wide inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
          {prevEntStr} (Hoje)
        </span>
      );
    } else if (diffDays === 1) {
      return (
        <span className="bg-amber-500/10 text-amber-200 border border-amber-500/20 text-[9.5px] font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wide inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
          {prevEntStr} (Amanhã)
        </span>
      );
    } else {
      return (
        <span className="bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20 text-[9.5px] font-sans px-2 py-0.5 rounded font-bold uppercase tracking-wide inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></span>
          {prevEntStr} (Programado)
        </span>
      );
    }
  };

  // Compact visual heat indicator for weights bands
  const renderWeightGauge = (kg: number) => {
    let level = 'LEVE';
    let labelColor = 'text-blue-200 bg-blue-500/10 border-blue-500/20';
    let barWidth = 'w-[20%]';
    let barBg = 'bg-sky-400';

    if (kg > 1500) {
      level = 'MAX CRÍTICA';
      labelColor = 'text-red-300 bg-red-500/15 border-red-500/30 font-extrabold';
      barWidth = 'w-[100%] animate-pulse';
      barBg = 'bg-rose-500';
    } else if (kg > 600) {
      level = 'PESADO';
      labelColor = 'text-orange-300 bg-orange-500/10 border-orange-500/25';
      barWidth = 'w-[80%]';
      barBg = 'bg-orange-500';
    } else if (kg > 300) {
      level = 'MÉDIO';
      labelColor = 'text-amber-300 bg-amber-500/10 border-amber-500/20';
      barWidth = 'w-[50%]';
      barBg = 'bg-amber-400';
    }

    return (
      <div className="space-y-1 my-0.5" title={`Carga: ${kg.toLocaleString()} kg (${level})`}>
        <div className="flex items-center justify-between font-mono text-[9px]">
          <span className="font-bold text-slate-100">{kg.toLocaleString('pt-BR')} kg</span>
          <span className={`px-1 rounded border text-[8px] leading-tight font-sans tracking-wide ${labelColor}`}>{level}</span>
        </div>
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden block">
          <div className={`h-full ${barWidth} ${barBg} rounded-full transition-all duration-300`} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden select-none">
      {/* Top Banner Area */}
      <div className="pb-4 border-b border-outline-variant bg-surface shrink-0 gap-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Roteirização e Cargas</h2>
              <span className="text-[10px] font-mono bg-sky-500/15 border border-sky-500/25 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Consolação Operacional
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Consolide CTRCs pendentes e valide SLAs antes do embarque na frota. Se o Auto-Pilot estiver ativo, as praças, aliases e operativas do ERP são normalizadas em tempo real via <span className="text-primary font-mono font-bold">BD_CIDADES_ROTAS</span>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Unit Filter */}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-outline-variant text-[18px]">location_on</span>
              {adminUser.is_master ? (
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-on-surface font-semibold focus:outline-none focus:border-primary cursor-pointer hover:border-outline transition-colors"
                >
                  <option value="TODAS">TODAS FILIAIS</option>
                  <option value="SPO">SÃO PAULO (SPO)</option>
                  <option value="VGA">VARGINHA (VGA)</option>
                  <option value="BHS">BELO HORIZONTE (BHS)</option>
                  <option value="RIO">RIO DE JANEIRO (RIO)</option>
                  <option value="CWB">CURITIBA (CWB)</option>
                </select>
              ) : (
                <span className="bg-[#4d8eff]/10 text-primary border border-[#4d8eff]/20 font-bold font-sans text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Filial: {selectedUnit}
                </span>
              )}
            </div>

            {/* Normalization Pilot switch */}
            <button
              onClick={() => {
                setAutoPilotNormalization((v) => !v);
                setToastMessage(
                  autoPilotNormalization
                    ? 'Normalização BD_CIDADES_ROTAS desativada (Usando dados puros do ERP)'
                    : 'Auto-Pilot Ativado: Mapeamento canonical de praças operacional!'
                );
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                autoPilotNormalization
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900 border-outline-variant text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {autoPilotNormalization ? 'offline_bolt' : 'notifications_off'}
              </span>
              Auto-Pilot de Rotas
            </button>

            {/* Grouping switcher dropdown */}
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-outline-variant text-[18px]">grid_view</span>
              <select
                value={groupingMode}
                onChange={(e) => setGroupingMode(e.target.value as any)}
                className="bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-[#dae2fd] focus:outline-none focus:border-primary cursor-pointer font-semibold"
              >
                <option value="direct">LISTAGEM DIRETA</option>
                <option value="city">AGRUPAR POR CIDADE</option>
                <option value="sector">AGRUPAR POR SETOR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Controls Strip */}
        <div className="mt-4 flex flex-col md:flex-row gap-2 items-center justify-between text-left">
          <div className="flex gap-2.5 w-full md:w-auto items-center flex-wrap">
            {/* Search text input */}
            <div className="relative w-full sm:w-60">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Filtrar Ctrc, destinatário, nf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 font-sans text-xs text-white focus:outline-none focus:border-primary placeholder-on-surface-variant/60 w-full uppercase"
              />
            </div>

            {/* Sectors list filter */}
            <div className="flex items-center gap-1 relative">
              <span className="text-xs text-on-surface-variant font-medium">Setores:</span>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-white focus:outline-none focus:border-primary cursor-pointer uppercase"
              >
                <option value="all">TODOS</option>
                {uniqueSectorsList.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Column Toggle Customizer */}
          <div className="flex items-center gap-2 self-end h-7 md:self-auto flex-wrap">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Colunas Ativas:</span>
            <div className="flex gap-1 items-center bg-[#0d1321] p-1 border border-outline-variant/60 rounded-lg select-none overflow-x-auto max-w-[450px] scrollbar-none">
              {Object.keys(visibleColumns).map((col) => {
                const active = visibleColumns[col];
                const labels: Record<string, string> = {
                  ctrc: 'CTRC',
                  cidade_ent: 'Cidade',
                  setor: 'Setor',
                  prev_ent: 'SLA',
                  destinatario: 'Cliente',
                  remetente: 'Remetente',
                  nf: 'NF',
                  ocorrencia: 'Ocorrência',
                  valor: 'Valor',
                  volume: 'Vol',
                  weight: 'Peso',
                  disponibilidade: 'Status',
                  localizacao: 'Gaiola',
                };
                return (
                  <button
                    key={col}
                    onClick={() => handleToggleColumn(col)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono transition-all select-none cursor-pointer uppercase border ${
                      active
                        ? 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'
                        : 'bg-slate-900 text-slate-600 hover:text-slate-400 border-transparent'
                    }`}
                  >
                    {labels[col]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1e293b] border border-primary/30 text-white rounded-xl px-4 py-2.5 shadow-2xl text-xs font-bold font-sans flex items-center gap-2 animate-fade-in shadow-black/80">
          <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
          {toastMessage}
        </div>
      )}

      {/* Primary Cockpit Table view */}
      <div className="flex-1 overflow-auto bg-surface relative rounded-xl border border-outline-variant shadow-inner">
        {isNormalizing ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant font-sans">
            <span className="material-symbols-outlined text-[39px] text-primary block animate-spin">
              sync
            </span>
            <p className="text-sm font-bold mt-2 text-white">Normalizando bases operacionais...</p>
            <p className="text-xs text-on-surface-variant/70">Mapeando aliases e prazos do BD_CIDADES_ROTAS</p>
          </div>
        ) : (
          <table
            style={{ width: `${getVisibleTableWidth()}px`, tableLayout: 'fixed' }}
            className="text-left border-collapse whitespace-nowrap text-xs font-sans"
          >
            <thead className="bg-[#0f1525] sticky top-0 z-20 shadow border-b border-outline-variant">
              <tr className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                {/* Fixed check Column */}
                <th className="p-2 border border-outline-variant w-11 text-center bg-[#0d1321] sticky left-0 z-30 shadow-[3px_0_5px_rgba(0,0,0,0.15)]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-outline-variant bg-surface-container text-primary cursor-pointer w-4 h-4 shadow"
                  />
                </th>
                {renderHeaderCell('ctrc', 'CTRC Invoice ID')}
                {renderHeaderCell('cidade_ent', 'Praça / Cidade')}
                {renderHeaderCell('setor', 'Setor de Rota')}
                {renderHeaderCell('prev_ent', 'Previsão / SLA')}
                {renderHeaderCell('destinatario', 'Cliente Destinatário / FOB')}
                {renderHeaderCell('remetente', 'Cliente Remetente / Curva A')}
                {renderHeaderCell('nf', 'NFs')}
                {renderHeaderCell('ocorrencia', 'Tratativa de Ocorrência')}
                {renderHeaderCell('valor', 'Vlr Mercadoria R$', true)}
                {renderHeaderCell('volume', 'Qtde Vol', true)}
                {renderHeaderCell('weight', 'Peso KG / Heat', true)}
                {renderHeaderCell('disponibilidade', 'Estoque / Status')}
                {renderHeaderCell('localizacao', 'Localização / Gaiola')}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-on-surface-variant font-medium text-[11px] font-mono leading-normal">
              {Object.keys(groupedCtrcsRegistry).map((groupKey) => {
                const groupItems = groupedCtrcsRegistry[groupKey];
                const isGrouped = groupingMode !== 'direct';
                const isCollapsed = isGrouped && !!expandedGroups[groupKey];

                const groupTotalWeight = groupItems.reduce(
                  (sum, c) => sum + (c.peso_r || c.weight || 0),
                  0
                );
                const groupTotalCtrcs = groupItems.length;

                return (
                  <React.Fragment key={groupKey}>
                    {/* Collapsible grouping Subheader row */}
                    {isGrouped && (
                      <tr
                        onClick={() => toggleGroupExpand(groupKey)}
                        className="bg-[#10192e] hover:bg-[#14213d] group cursor-pointer border-b border-outline-variant select-none animate-fade-in text-[#98a2c2]"
                      >
                        <td
                          colSpan={15}
                          className="p-2 px-3 text-left font-sans text-xs font-bold sticky left-0 z-10"
                        >
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-[#dae2fd]">
                              <span className="material-symbols-outlined text-[18px] text-primary transition-transform">
                                {isCollapsed ? 'keyboard_arrow_right' : 'keyboard_arrow_down'}
                              </span>
                              <span className="text-white text-[12px] font-extrabold uppercase bg-primary-container-highest px-2 py-0.5 rounded leading-none text-primary">
                                {groupingMode === 'city' ? `📍 PIN: ${groupKey}` : `🗺️ ROTA: ${groupKey}`}
                              </span>
                              <span className="font-medium text-slate-400">
                                ({groupTotalCtrcs} {groupTotalCtrcs === 1 ? 'CTRC' : 'CTRCs'})
                              </span>
                              <span className="text-slate-500 font-normal">|</span>
                              <span className="text-amber-200">
                                Peso Total: {groupTotalWeight.toLocaleString('pt-BR')} kg
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 mr-2 uppercase tracking-wide group-hover:text-white transition-colors">
                              {isCollapsed ? 'Clique para Expandir' : 'Clique para Recolher'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isCollapsed &&
                      groupItems.map((ctrc) => {
                        const checked = selectedIds.includes(ctrc.id);

                        // Highlight rows if it belongs to a critical Curva A client
                        const curvaBorderClass = ctrc.isCurvaA
                          ? 'border-l-4 border-l-amber-400 bg-amber-500/5'
                          : '';

                        const isFob = ctrc.pagador === ctrc.destinatario;

                        return (
                          <tr
                            key={ctrc.id}
                            onClick={(e) => handleToggleRow(ctrc.id, e)}
                            className={`hover:bg-[#15203a]/60 duration-150 border-b border-outline-variant/30 select-text cursor-pointer transition-colors ${
                              checked ? 'bg-[#1b2b4d] text-white' : 'bg-[#0b0f19]'
                            } ${curvaBorderClass}`}
                          >
                            {/* Checkbox item cells */}
                            <td
                              className="p-2 border border-outline-variant/35 text-center sticky left-0 bg-[#070c14] hover:bg-[#111929] z-10 shadow-[3px_0_5px_rgba(0,0,0,0.15)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleRow(ctrc.id)}
                                className="rounded border-outline-variant bg-[#0b0f19] text-primary cursor-pointer w-4 h-4"
                              />
                            </td>

                            {/* CTRC Invoice cell (Holds embedded hidden UNIDADE badge) */}
                            {visibleColumns.ctrc && (
                              <td
                                style={{
                                  width: `${columnWidths.ctrc}px`,
                                  minWidth: `${columnWidths.ctrc}px`,
                                  maxWidth: `${columnWidths.ctrc}px`,
                                }}
                                className="p-2 border border-outline-variant/35 text-white font-bold truncate font-sans text-xs select-all"
                              >
                                <div className="flex items-center gap-1.5">
                                  {/* Unidade Indicator badge (Secondary hidden layout) */}
                                  <span
                                    className="px-1 py-0.2 rounded font-mono font-bold text-[9px] uppercase tracking-wide flex items-center shrink-0 bg-[#4d8eff]/10 text-primary border border-[#4d8eff]/20"
                                    title={`Filial Operadora: ${ctrc.unid}`}
                                  >
                                    {ctrc.unid}
                                  </span>
                                  <span className="truncate text-primary" title={ctrc.id}>
                                    {ctrc.id}
                                  </span>
                                  {/* Copy command helper */}
                                  <button
                                    onClick={(e) => handleCopyClipboard(ctrc.id, e)}
                                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-800 text-slate-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shrink-0"
                                    title="Copiar ID da CTRC"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">
                                      content_copy
                                    </span>
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* Cidade Canonical */}
                            {visibleColumns.cidade_ent && (
                              <td
                                style={{
                                  width: `${columnWidths.cidade_ent}px`,
                                  minWidth: `${columnWidths.cidade_ent}px`,
                                  maxWidth: `${columnWidths.cidade_ent}px`,
                                }}
                                className="p-2 border border-outline-variant/35 truncate font-sans font-extrabold text-[#dae2fd]"
                              >
                                {ctrc.normCidade}
                              </td>
                            )}

                            {/* Setor de Rota */}
                            {visibleColumns.setor && (
                              <td
                                style={{
                                  width: `${columnWidths.setor}px`,
                                  minWidth: `${columnWidths.setor}px`,
                                  maxWidth: `${columnWidths.setor}px`,
                                }}
                                className="p-2 border border-outline-variant/35 truncate text-sky-300 font-semibold"
                              >
                                {ctrc.normSetor}
                              </td>
                            )}

                            {/* Previsão data SLA warnings */}
                            {visibleColumns.prev_ent && (
                              <td
                                style={{
                                  width: `${columnWidths.prev_ent}px`,
                                  minWidth: `${columnWidths.prev_ent}px`,
                                  maxWidth: `${columnWidths.prev_ent}px`,
                                }}
                                className="p-2 border border-outline-variant/35 truncate text-center"
                              >
                                {renderSLAPill(ctrc.prev_ent || '')}
                              </td>
                            )}

                            {/* Cliente Destinatário + FOB badge */}
                            {visibleColumns.destinatario && (
                              <td
                                style={{
                                  width: `${columnWidths.destinatario}px`,
                                  minWidth: `${columnWidths.destinatario}px`,
                                  maxWidth: `${columnWidths.destinatario}px`,
                                }}
                                className="p-2 border border-outline-variant/35 font-sans truncate text-white"
                                title={ctrc.destinatario}
                              >
                                <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                  <span className="font-semibold text-[11.5px] truncate text-white">
                                    {ctrc.destinatario}
                                  </span>
                                  {isFob && (
                                    <span
                                      className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.2 rounded font-sans font-bold float-right shrink-0 block"
                                      title="FOB: Frete por conta do Destinatário"
                                    >
                                      FOB
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Cliente Remetente + Curva A badge */}
                            {visibleColumns.remetente && (
                              <td
                                style={{
                                  width: `${columnWidths.remetente}px`,
                                  minWidth: `${columnWidths.remetente}px`,
                                  maxWidth: `${columnWidths.remetente}px`,
                                }}
                                className="p-2 border border-outline-variant/35 font-sans truncate text-slate-300"
                                title={ctrc.remetente}
                              >
                                <div className="flex items-center justify-between gap-1.5 overflow-hidden">
                                  <span className="text-slate-400 truncate">{ctrc.remetente}</span>
                                  {ctrc.isCurvaA && (
                                    <span
                                      className="bg-[#ffe8a3]/10 text-amber-300 border border-[#ffe8a3]/20 text-[8.5px] px-1.5 py-0.2 rounded font-sans font-extrabold flex items-center gap-0.5 shrink-0"
                                      title={`Clientes Prioridade de Curva A- SLA de Governança Estrito (${ctrc.curvaAClass || 'A'})`}
                                    >
                                      🥇 CURVA {ctrc.curvaAClass || 'A'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Nota fiscal */}
                            {visibleColumns.nf && (
                              <td
                                style={{
                                  width: `${columnWidths.nf}px`,
                                  minWidth: `${columnWidths.nf}px`,
                                  maxWidth: `${columnWidths.nf}px`,
                                }}
                                className="p-2 border border-outline-variant/35 font-semibold text-slate-400 font-mono truncate text-center"
                              >
                                {ctrc.nf || '-'}
                              </td>
                            )}

                            {/* Ocorrências com Tratativa */}
                            {visibleColumns.ocorrencia && (
                              <td
                                style={{
                                  width: `${columnWidths.ocorrencia}px`,
                                  minWidth: `${columnWidths.ocorrencia}px`,
                                  maxWidth: `${columnWidths.ocorrencia}px`,
                                }}
                                className="p-2 border border-outline-variant/35 truncate font-sans text-xs text-slate-200"
                                title={`${ctrc.ocorrencia || 'Sem Ocorrência'} - ${
                                  ctrc.enrichedOcorrenciaDesc
                                }`}
                              >
                                <div className="flex flex-col text-[10.5px]">
                                  <div className="flex items-center gap-1 font-mono text-[9px] text-[#2ebd85]">
                                    <span className="font-bold">
                                      {ctrc.ocorrencia || '57 OK'}
                                    </span>
                                    <span className="text-slate-500">•</span>
                                    <span className="text-slate-300 truncate uppercase">
                                      {ctrc.enrichedOcorrenciaDesc}
                                    </span>
                                  </div>
                                  {ctrc.enrichedOcorrenciaTratativa && (
                                    <span className="text-[8.5px] text-orange-200 font-sans italic truncate">
                                      Resolução: {ctrc.enrichedOcorrenciaTratativa}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Valor Declarado */}
                            {visibleColumns.valor && (
                              <td
                                style={{
                                  width: `${columnWidths.valor}px`,
                                  minWidth: `${columnWidths.valor}px`,
                                  maxWidth: `${columnWidths.valor}px`,
                                }}
                                className="p-2 border border-outline-variant/35 text-right font-mono font-bold text-slate-300"
                              >
                                {(ctrc.valor || 0).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            )}

                            {/* volumes count */}
                            {visibleColumns.volume && (
                              <td
                                style={{
                                  width: `${columnWidths.volume}px`,
                                  minWidth: `${columnWidths.volume}px`,
                                  maxWidth: `${columnWidths.volume}px`,
                                }}
                                className="p-2 border border-outline-variant/35 text-right text-sky-300 font-bold"
                              >
                                {ctrc.volume} vol
                              </td>
                            )}

                            {/* Peso KG / Heat Gauges */}
                            {visibleColumns.weight && (
                              <td
                                style={{
                                  width: `${columnWidths.weight}px`,
                                  minWidth: `${columnWidths.weight}px`,
                                  maxWidth: `${columnWidths.weight}px`,
                                }}
                                className="p-2 border border-outline-variant/35 text-right"
                              >
                                {renderWeightGauge(ctrc.peso_r || ctrc.weight || 0)}
                              </td>
                            )}

                            {/* Disponibilidade Status marker */}
                            {visibleColumns.disponibilidade && (
                              <td
                                style={{
                                  width: `${columnWidths.disponibilidade}px`,
                                  minWidth: `${columnWidths.disponibilidade}px`,
                                  maxWidth: `${columnWidths.disponibilidade}px`,
                                }}
                                className="p-2 border border-outline-variant/35 truncate text-center font-sans text-[10px]"
                              >
                                <span
                                  className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                                    ctrc.status === 'Disponível'
                                      ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20'
                                      : ctrc.status === 'Em Rota'
                                      ? 'bg-primary/20 text-primary border border-primary/30'
                                      : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                  }`}
                                >
                                  {ctrc.status}
                                </span>
                              </td>
                            )}

                            {/* Localização / Gaiola */}
                            {visibleColumns.localizacao && (
                              <td
                                style={{
                                  width: `${columnWidths.localizacao}px`,
                                  minWidth: `${columnWidths.localizacao}px`,
                                  maxWidth: `${columnWidths.localizacao}px`,
                                }}
                                className="p-2 border border-outline-variant/35 font-sans font-bold text-slate-300 truncate"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-sky-400">
                                    shelves
                                  </span>
                                  <span>{ctrc.localizacao || 'GAIOLA CENTRAL - BOX SPO'}</span>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}

              {sortedCtrcs.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-20 bg-surface">
                    <span className="material-symbols-outlined text-[42px] mb-2 text-on-surface-variant/30 block animate-pulse">
                      error_outline
                    </span>
                    <p className="text-sm font-bold text-white">Nenhum Conhecimento (CTRC) correspondente.</p>
                    <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm mx-auto">
                      Atividade zerada nesta unidade ou setor ou filtro de busca. Experimente redefinir os filtros de unidade.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Sticky footer manifest summary panel */}
      <div className="bg-surface border-t border-outline-variant p-4 flex flex-col sm:flex-row justify-between items-center z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.45)] gap-4 shrink-0">
        <div className="flex items-center gap-6 flex-wrap justify-between sm:justify-start w-full sm:w-auto text-left">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {selectedIds.length > 0 ? 'check_box' : 'check_box_outline_blank'}
            </span>
            <span className="font-sans text-xs text-on-surface">
              <span className="font-bold text-white text-sm">{selectedIds.length}</span> CTRCs
              selecionados
            </span>
          </div>

          <div className="h-6 w-px bg-outline-variant/60 hidden sm:block"></div>

          <div className="flex gap-6 font-sans text-xs flex-wrap">
            <div>
              <span className="text-on-surface-variant mr-1.5">Peso Total:</span>
              <span className="text-amber-200 font-mono font-bold text-sm">
                {totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Cubagem:</span>
              <span className="text-sky-300 font-mono font-bold text-sm">
                {totalVolume} vol
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Valor Total:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Console Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-2 hover:bg-slate-800 text-on-surface-variant hover:text-white text-xs font-semibold rounded-lg transition-colors border border-outline-variant/50"
            >
              Limpar Seleção
            </button>
          )}

          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-[#dae2fd] text-xs font-bold rounded-lg transition-all border border-outline-variant/60 flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[15px] text-[#4d8eff]">
              local_shipping
            </span>
            Embarque: <span className="text-white uppercase font-mono">{selectedVehicleId || 'RTA3G45'}</span>
          </button>

          <button
            onClick={handleGenerateManifest}
            className="px-5 py-2 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold font-sans rounded-lg transition-transform active:scale-[0.98] shadow-lg flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Consolidar Romaneio
          </button>
        </div>
      </div>

      {/* Assigned Vehicle Selector modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left">
            <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                <span className="font-bold text-white text-sm">Designar Veículo / Motorista</span>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-on-surface-variant hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 bg-[#121828]">
              {activeVehicles.map((v) => {
                const isSelected = v.id === selectedVehicleId;
                return (
                  <div
                    key={v.id}
                    onClick={() => handlePickVehicle(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-container/20 border-primary text-primary'
                        : 'bg-surface border-outline-variant/50 hover:border-outline text-on-surface hover:bg-surface-bright'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs uppercase text-white">
                          {v.id}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            v.status === 'Disponível'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Motorista:{' '}
                        <span className="font-bold text-white font-sans text-xs">
                          {v.driverName}
                        </span>
                      </p>
                    </div>

                    <div className="text-right font-mono text-[10px] space-y-0.5">
                      <p className="font-bold text-white">{v.capacity}</p>
                      <p className="text-on-surface-variant">{v.type}</p>
                    </div>
                  </div>
                );
              })}

              {activeVehicles.length === 0 && (
                <p className="text-xs italic text-on-surface-variant text-center py-6">
                  Nenhum veículo disponível de frota cadastrado no sistema.
                </p>
              )}
            </div>

            <div className="p-3 bg-surface border-t border-outline-variant/60 flex justify-end">
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#dae2fd] hover:text-white hover:bg-surface-bright rounded-lg transition-colors border border-outline-variant/50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
