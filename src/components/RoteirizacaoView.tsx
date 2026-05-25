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

// Utility to cleanly parse vehicle capacities to kg
function parseVehicleCapacity(capacityStr: string): number {
  const cleaned = capacityStr.toLowerCase();
  const matchFloat = cleaned.match(/([\d.]+)\s*t/);
  if (matchFloat && matchFloat[1]) {
    return parseFloat(matchFloat[1]) * 1000; // in kg
  }
  const matchNum = cleaned.match(/(\d+)/);
  if (matchNum && matchNum[1]) {
    const num = parseInt(matchNum[1], 10);
    if (num < 150) { // e.g., "57t" or "6t" -> probably tons
      return num * 1000;
    }
    return num; // raw kg e.g. "3500"
  }
  return 4000; // Default capacity 4t
}

export default function RoteirizacaoView({
  availableCtrcs = [],
  vehicles = [],
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
  curvaAClients = [],
}: RoteirizacaoViewProps) {
  // Staging Draft assignments: mappings of { [ctrcId]: vehicleId }
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draggedCtrcId, setDraggedCtrcId] = useState<string | null>(null);
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null);

  // Grouping mode: 'direct' | 'city' | 'sector'
  const [groupingMode, setGroupingMode] = useState<'direct' | 'city' | 'sector'>('direct');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});

  // Column visibility for the spreadsheet-like grid view (persisted offline)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('roteirizacao_visible_columns_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use fallback default setup
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

  // Sorting columns
  const [sortField, setSortField] = useState<string>('cidade_ent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Interactive Resizable Column Widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    ctrc: 140,
    cidade_ent: 130,
    setor: 110,
    prev_ent: 110,
    destinatario: 220,
    remetente: 185,
    nf: 80,
    ocorrencia: 190,
    valor: 110,
    volume: 80,
    weight: 120,
    disponibilidade: 115,
    localizacao: 155,
  });

  // Active terminal unit state filter
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (!adminUser.is_master) {
      return (adminUser.unid || 'SPO').toUpperCase();
    }
    return 'TODAS';
  });

  // Secondary normalization state variables from Database triggers
  const [normalizedCtrcs, setNormalizedCtrcs] = useState<NormalizedCtrc[]>([]);
  const [isNormalizing, setIsNormalizing] = useState<boolean>(true);
  const [dbOccurrences, setDbOccurrences] = useState<Record<string, DeliveryOccurrence>>({});

  // Autopilot status flag for correction engine lookup
  const [autoPilotNormalization, setAutoPilotNormalization] = useState<boolean>(true);

  // Load occurrences cache
  useEffect(() => {
    const loadCache = async () => {
      try {
        const occList = await OccurrenceRepository.getAll();
        const map: Record<string, DeliveryOccurrence> = {};
        occList.forEach((occ) => {
          map[occ.codigo] = occ;
        });
        setDbOccurrences(map);
      } catch (e) {
        console.error('[Roteirizacao] Erro carregando dicionário de ocorrências:', e);
      }
    };
    loadCache();
  }, []);

  // Sync normalization process on available ctrcs
  useEffect(() => {
    const executeNormalize = async () => {
      setIsNormalizing(true);
      const items: NormalizedCtrc[] = [];

      for (const c of availableCtrcs) {
        const unitLabel = (c.unid || c.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();

        let normCidade = c.cidade_ent || c.cidade || 'NÃO ESPECIFICADO';
        normCidade = normCidade.split(',')[0].trim().toUpperCase();

        let normSetor = c.setor || 'NÃO DEFINIDO';
        let normRota = 'ROTA INDEFINIDA';
        let normPrazo = 2; // Default Standard Transit Day D+2
        let normPriority: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA' = 'NORMAL';

        if (autoPilotNormalization) {
          try {
            const match = await CidadeRotaRepository.normalize(normCidade, c.setor);
            normCidade = match.cidade;
            normSetor = match.setor;
            normRota = match.rota;
            normPrazo = match.prazo;
            normPriority = match.prioridade;
          } catch (e) {
            // fallback gracefully
          }
        }

        // Match Curva A
        const isCurva = curvaAClients.some(
          (cl) =>
            cl.cliente_remetente.toUpperCase() === (c.remetente || '').toUpperCase() ||
            (c.cod && cl.cnpj_remetente.includes(c.cod))
        );
        const matchCurva = curvaAClients.find(
          (cl) =>
            cl.cliente_remetente.toUpperCase() === (c.remetente || '').toUpperCase() ||
            (c.cod && cl.cnpj_remetente.includes(c.cod))
        );

        // Map events
        let enrichedDesc = 'MERCADORIA EM TRÂNSITO / CONSOLIDAÇÃO';
        let enrichedTratativa = '';
        if (c.ocorrencia) {
          const occObj = dbOccurrences[c.ocorrencia];
          if (occObj) {
            enrichedDesc = occObj.descricao;
            enrichedTratativa = occObj.tratativa_solucao;
          } else {
            const cleanKey = c.ocorrencia.replace(/[^\d]/g, '');
            const fuzzy = dbOccurrences[cleanKey];
            if (fuzzy) {
              enrichedDesc = fuzzy.descricao;
              enrichedTratativa = fuzzy.tratativa_solucao;
            }
          }
        }

        items.push({
          ...c,
          unid: unitLabel,
          normCidade,
          normSetor,
          normRota,
          normPrazo,
          normPriority,
          isCurvaA: isCurva,
          curvaAClass: matchCurva?.curva_a || 'A',
          enrichedOcorrenciaDesc: enrichedDesc,
          enrichedOcorrenciaTratativa: enrichedTratativa,
        });
      }

      setNormalizedCtrcs(items);
      setIsNormalizing(false);
    };

    executeNormalize();
  }, [availableCtrcs, autoPilotNormalization, dbOccurrences, curvaAClients]);

  // Handle visible columns configuration
  const handleToggleColumn = (colId: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [colId]: !prev[colId] };
      localStorage.setItem('roteirizacao_visible_columns_v3', JSON.stringify(updated));
      return updated;
    });
  };

  // Safe selection row toggling
  const handleToggleRow = (id: string, e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('select')) {
        return;
      }
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Clean Draft assignments which are no longer present in availableCtrcs
  useEffect(() => {
    const validIds = availableCtrcs.map((c) => c.id);
    setDraftAssignments((prev) => {
      const cleaned: Record<string, string> = {};
      Object.keys(prev).forEach((id) => {
        if (validIds.includes(id)) {
          cleaned[id] = prev[id];
        }
      });
      return cleaned;
    });
  }, [availableCtrcs]);

  // Left Section Filtered list (excluding items assigned to vehicles)
  const availablePendingCtrcs = normalizedCtrcs.filter((ctrc) => {
    // Exclude if already drafted to a vehicle
    if (draftAssignments[ctrc.id]) return false;

    // Filter status constraints
    if (!adminUser.is_master) {
      const profileUnid = (adminUser.unid || 'SPO').toUpperCase();
      if (ctrc.unid !== profileUnid) return false;
    } else {
      if (selectedUnit !== 'TODAS' && ctrc.unid !== selectedUnit) return false;
    }

    if (selectedSector !== 'all' && ctrc.normSetor !== selectedSector) return false;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const mId = (ctrc.id || '').toLowerCase().includes(query);
      const mDest = (ctrc.destinatario || '').toLowerCase().includes(query);
      const mRem = (ctrc.remetente || '').toLowerCase().includes(query);
      const mCid = (ctrc.normCidade || '').toLowerCase().includes(query);
      const mNf = (ctrc.nf || '').toLowerCase().includes(query);
      if (!mId && !mDest && !mRem && !mCid && !mNf) return false;
    }

    return true;
  });

  // Extract sectors list for quick navigation dropdown
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

  // Excel sorting implementation
  const handleHeaderClick = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPendingCtrcs = [...availablePendingCtrcs].sort((a, b) => {
    let valA: any = a[sortField as keyof NormalizedCtrc] ?? '';
    let valB: any = b[sortField as keyof NormalizedCtrc] ?? '';

    // Field key assignments override
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
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Toggle master select checkboxes
  const handleToggleSelectAll = () => {
    const listIds = sortedPendingCtrcs.map((c) => c.id);
    const allChecked = listIds.length > 0 && listIds.every((id) => selectedIds.includes(id));
    if (allChecked) {
      setSelectedIds((prev) => prev.filter((id) => !listIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...listIds])));
    }
  };

  const isAllSelected =
    sortedPendingCtrcs.length > 0 &&
    sortedPendingCtrcs.map((c) => c.id).every((id) => selectedIds.includes(id));

  // Compute stats of currently checked items inside warehouse stage
  const selectedCtrcsList = availablePendingCtrcs.filter((c) => selectedIds.includes(c.id));
  const selectedWeight = selectedCtrcsList.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
  const selectedVolume = selectedCtrcsList.reduce((sum, c) => sum + (c.volume || 0), 0);
  const selectedValue = selectedCtrcsList.reduce((sum, c) => sum + (c.valor || 0), 0);

  // Grouping rows mapper for main table view
  const getGroupedData = () => {
    const registry: Record<string, NormalizedCtrc[]> = {};
    sortedPendingCtrcs.forEach((ctrc) => {
      const key =
        groupingMode === 'city'
          ? ctrc.normCidade
          : groupingMode === 'sector'
          ? ctrc.normSetor
          : 'PENDING_QUEUE';

      if (!registry[key]) {
        registry[key] = [];
      }
      registry[key].push(ctrc);
    });
    return registry;
  };

  const groupedPendingCtrcs = getGroupedData();

  // Drag and Drop operation controllers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCtrcId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, vehicleId: string) => {
    e.preventDefault();
    setHoveredVehicleId(vehicleId);
  };

  const handleDragLeave = () => {
    setHoveredVehicleId(null);
  };

  const handleDrop = (e: React.DragEvent, vehicleId: string) => {
    e.preventDefault();
    setHoveredVehicleId(null);
    const dropId = e.dataTransfer.getData('text/plain') || draggedCtrcId;
    if (!dropId) return;

    // Check if the dragged item is part of a multiple checked selection.
    // If yes, let's load ALL checked items at once! This is exceptionally epic UX!
    const toLoad = selectedIds.includes(dropId) ? selectedIds : [dropId];

    setDraftAssignments((prev) => {
      const updated = { ...prev };
      toLoad.forEach((id) => {
        updated[id] = vehicleId;
      });
      return updated;
    });

    setSelectedIds((prev) => prev.filter((id) => !toLoad.includes(id)));
    setDraggedCtrcId(null);
    setToastMessage(`⚡ ${toLoad.length} carga(s) consolidada(s) temporariamente na placa ${vehicleId}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Direct fast-shift dispatch via dropdown or selector buttons
  const assignSelectionToVehicle = (vehicleId: string) => {
    if (selectedIds.length === 0) {
      alert('Selecione ao menos um Conhecimento (CTRC) no grid operacional.');
      return;
    }
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      selectedIds.forEach((id) => {
        updated[id] = vehicleId;
      });
      return updated;
    });
    const len = selectedIds.length;
    setSelectedIds([]);
    setToastMessage(`🚛 ${len} item(ns) movido(s) para o veículo ${vehicleId}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Move individual item draft back to main unassigned warehouse
  const unassignCtrc = (ctrcId: string) => {
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      delete updated[ctrcId];
      return updated;
    });
  };

  // Clean entire draft manifest of a specific vehicle
  const clearVehicleDraft = (vehicleId: string) => {
    setDraftAssignments((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        if (updated[id] === vehicleId) {
          delete updated[id];
        }
      });
      return updated;
    });
  };

  // Calculate high-fidelity details of all vehicles under active draft list
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');

  // Operational metrics for the top Centro Tático Cockpit
  const totalCtrcsInQueue = availablePendingCtrcs.length;
  const delayedSlaCtrcsCount = availablePendingCtrcs.filter((ctrc) => {
    if (!ctrc.prev_ent) return false;
    const parts = ctrc.prev_ent.split('/');
    if (parts.length < 3) return false;
    const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const referenceDate = new Date(2026, 4, 25); // May 25, 2026
    return itemDate.getTime() < referenceDate.getTime();
  }).length;

  const d1SlaCtrcsCount = availablePendingCtrcs.filter((ctrc) => {
    if (!ctrc.prev_ent) return false;
    const parts = ctrc.prev_ent.split('/');
    if (parts.length < 3) return false;
    const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const referenceDate = new Date(2026, 4, 25);
    const diffMs = itemDate.getTime() - referenceDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) === 1;
  }).length;

  const curvaACountInQueue = availablePendingCtrcs.filter((c) => c.isCurvaA).length;
  const totalWeightInQueue = availablePendingCtrcs.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
  const totalVolumeInQueue = availablePendingCtrcs.reduce((sum, c) => sum + (c.volume || 0), 0);

  // Compute totals across all vehicles of current draft is loaded
  const assignedCtrcsCount = Object.keys(draftAssignments).length;

  // Final Action: complete and emit official manifest to IndexedDB and parent API
  const handleFinalizeRomaneio = (vehicleId: string) => {
    // Collect all actual CTRC objects mapped dynamically to this vehicle
    const vehicleDraftCtrcs = normalizedCtrcs.filter((c) => draftAssignments[c.id] === vehicleId);
    
    if (vehicleDraftCtrcs.length === 0) {
      alert('Arraste ou designe cargamento para este veículo antes de emitir o romaneio.');
      return;
    }

    // Call applet's parent triggers
    vehicleDraftCtrcs.forEach((c) => {
      onAssignCtre(c.id, vehicleId);
    });

    // Clear draft assignments for assigned ones
    const assignedIds = vehicleDraftCtrcs.map(c => c.id);
    setDraftAssignments(prev => {
      const copy = { ...prev };
      assignedIds.forEach(id => delete copy[id]);
      return copy;
    });

    onConsolidateRomaneio(vehicleId, vehicleDraftCtrcs);
  };

  // Resizing columns controller
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

  // Rendering resizable headers
  const renderHeaderCell = (colId: string, label: string, isNumeric = false) => {
    if (!visibleColumns[colId]) return null;
    const width = columnWidths[colId];
    const isSorted = sortField === colId;

    return (
      <th
        id={`th-col-${colId}`}
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        className={`p-2 border border-outline-variant/50 relative select-none truncate group bg-[#090e1a] hover:bg-[#121c33] transition-colors cursor-pointer ${
          isNumeric ? 'text-right' : 'text-left'
        }`}
        onClick={() => handleHeaderClick(colId)}
      >
        <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
          <span className="font-sans font-bold text-slate-300 text-[10px] uppercase tracking-wider">{label}</span>
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
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, colId);
          }}
          className="absolute right-0 top-0 bottom-0 w-1 px-0.5 cursor-col-resize hover:bg-primary/50 border-r border-transparent hover:border-primary/50 transition-colors z-10"
        />
      </th>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden text-on-surface">
      {/* CENTRO TÁTICO OPERACIONAL (Tactical Command Center) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 p-3 bg-surface-container-low border-b border-outline-variant/60 shrink-0">
        
        {/* STATS 1: Pendentes */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/15">
            <span className="material-symbols-outlined text-sky-400 text-[19px]">pending_actions</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Pilha Pendente</p>
            <p className="text-lg font-mono font-extrabold text-white mt-1 leading-none">{totalCtrcsInQueue}</p>
            <p className="text-[9px] text-[#2ebd85] font-semibold mt-1">Carregados: {assignedCtrcsCount}</p>
          </div>
        </div>

        {/* STATS 2: Overdue SLA Alerts */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/15">
            <span className="material-symbols-outlined text-red-400 text-[19px] animate-pulse">warning</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider leading-none">SLAs Estourados</p>
            <p className="text-lg font-mono font-extrabold text-red-400 mt-1 leading-none">{delayedSlaCtrcsCount}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-1">D+0 ou Excedido</p>
          </div>
        </div>

        {/* STATS 3: D+1 Delivery Target */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
            <span className="material-symbols-outlined text-amber-300 text-[19px]">schedule</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider leading-none">Cargas D+1 (Amanhã)</p>
            <p className="text-lg font-mono font-extrabold text-amber-200 mt-1 leading-none">{d1SlaCtrcsCount}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-1">Alvo prioritário</p>
          </div>
        </div>

        {/* STATS 4: Critical Curva A clients */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/15">
            <span className="material-symbols-outlined text-pink-300 text-[19px]">stars</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-pink-300 font-bold uppercase tracking-wider leading-none">Curva A Pendente</p>
            <p className="text-lg font-mono font-extrabold text-pink-300 mt-1 leading-none">{curvaACountInQueue}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-1">SLA Governança rigorosa</p>
          </div>
        </div>

        {/* STATS 5: Total Weight */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
            <span className="material-symbols-outlined text-emerald-400 text-[19px]">weight</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider leading-none">Peso em Espera</p>
            <p className="text-lg font-mono font-extrabold text-emerald-300 mt-1 leading-none">
              {(totalWeightInQueue / 1000).toFixed(2)} t
            </p>
            <p className="text-[9px] text-slate-400 font-medium mt-1">{totalVolumeInQueue} Volumes físicos</p>
          </div>
        </div>

        {/* STATS 6: Connected status */}
        <div className="bg-[#0b101f] border border-outline-variant/65 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/15">
            <span className="material-symbols-outlined text-purple-400 text-[19px]">dns</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider leading-none">Console Operativa</p>
            <p className="text-sm font-sans font-extrabold mt-1 text-[#4edea3] leading-tight">SUPABASE ACTIVE</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-[#4edea3] rounded-full animate-ping"></span>
              <span className="text-[8.5px] text-slate-400 font-mono">100% Sincronizado</span>
            </div>
          </div>
        </div>

      </div>

      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#162138] border border-primary text-[#adc6ff] rounded-xl px-4 py-3 shadow-2xl text-xs font-bold font-sans flex items-center gap-2.5 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#4edea3]">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* WORKSPACE AREA: DUAL COLUMN LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: Queue of available CTRCs to route */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 border-r border-outline-variant/60">
          
          {/* Controls and filters strip */}
          <div className="p-2.5 bg-[#0f1525] border border-outline-variant/50 rounded-xl mb-3 flex flex-col md:flex-row gap-3 items-center justify-between text-left shrink-0">
            <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
              
              {/* Unit terminal select */}
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-slate-400 text-[17px]">location_on</span>
                {adminUser.is_master ? (
                  <select
                    id="select-unit-admin"
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="bg-[#0b0f19] border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-white font-semibold focus:outline-none focus:border-primary cursor-pointer hover:border-slate-500 transition-colors"
                  >
                    <option value="TODAS">TODAS FILIAIS</option>
                    <option value="SPO">SÃO PAULO (SPO)</option>
                    <option value="VGA">VARGINHA (VGA)</option>
                    <option value="BHS">BELO HORIZONTE (BHS)</option>
                    <option value="RIO">RIO DE JANEIRO (RIO)</option>
                    <option value="CWB">CURITIBA (CWB)</option>
                  </select>
                ) : (
                  <span className="bg-[#4d8eff]/10 text-primary border border-[#4d8eff]/20 font-bold font-sans text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#4edea3] rounded-full animate-pulse" />
                    Filial: {selectedUnit}
                  </span>
                )}
              </div>

              {/* Autopilot toggle */}
              <button
                id="btn-switch-autopilot"
                onClick={() => {
                  setAutoPilotNormalization((v) => !v);
                  setToastMessage(
                    autoPilotNormalization
                      ? 'Normalização BD_CIDADES_ROTAS desativada (Usando dados brutos do ERP)'
                      : 'Auto-Pilot Ativado: Mapeamento canônico do BD_CIDADES_ROTAS restaurado'
                  );
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans border transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                  autoPilotNormalization
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-[#4edea3]'
                    : 'bg-slate-900 border-outline-variant text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {autoPilotNormalization ? 'offline_bolt' : 'notifications_off'}
                </span>
                Mapeador de Rotas
              </button>

              {/* Sector Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 font-semibold font-sans">Setor:</span>
                <select
                  id="select-sector-filter"
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="bg-[#0b0f19] border border-outline-variant rounded-lg px-2 py-1.5 font-sans text-xs text-white font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="all">TODOS SETORES</option>
                  {uniqueSectorsList.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex items-center flex-wrap gap-2 w-full md:w-auto md:justify-end">
              {/* Search filter input */}
              <div className="relative w-full sm:w-56 shrink-0">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[16px]">
                  search
                </span>
                <input
                  id="input-query-routing"
                  type="text"
                  placeholder="Escrita rápida (ID, destinatario, NF)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0b0f19] border border-outline-variant rounded-lg pl-8 pr-2.5 py-1.5 font-sans text-xs text-white placeholder-slate-500 hover:border-slate-500 focus:outline-none focus:border-primary w-full uppercase"
                />
              </div>

              {/* Grouping Selectors buttons */}
              <div className="flex items-center bg-[#070b14] border border-outline-variant rounded-lg p-0.5 shrink-0">
                <button
                  id="btn-group-direct"
                  onClick={() => setGroupingMode('direct')}
                  className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded transition-all cursor-pointer ${
                    groupingMode === 'direct' ? 'bg-[#4d8eff] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Listagem direta"
                >
                  Pura
                </button>
                <button
                  id="btn-group-city"
                  onClick={() => setGroupingMode('city')}
                  className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded transition-all cursor-pointer ${
                    groupingMode === 'city' ? 'bg-[#4d8eff] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Agrupamento por cidade"
                >
                  Cidades
                </button>
                <button
                  id="btn-group-sector"
                  onClick={() => setGroupingMode('sector')}
                  className={`px-2.5 py-1 text-[10px] font-bold font-sans rounded transition-all cursor-pointer ${
                    groupingMode === 'sector' ? 'bg-[#4d8eff] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Agrupamento por setor operativo"
                >
                  Setores
                </button>
              </div>
            </div>
          </div>

          {/* Quick Active Column Selector panel */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2 px-1 text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Colunas Ativas:</span>
            <div className="flex flex-wrap gap-1">
              {Object.keys(visibleColumns).map((col) => {
                const active = visibleColumns[col];
                const labelMap: Record<string, string> = {
                  ctrc: 'CTRC',
                  cidade_ent: 'Cidade/Praça',
                  setor: 'Setor',
                  prev_ent: 'SLA',
                  destinatario: 'Destino',
                  remetente: 'Remetente',
                  nf: 'NF',
                  ocorrencia: 'Ocorrência',
                  valor: 'Valor',
                  volume: 'Vol',
                  weight: 'Peso',
                  disponibilidade: 'Status',
                  localizacao: 'Box',
                };
                return (
                  <button
                    key={col}
                    id={`btn-coltoggle-${col}`}
                    onClick={() => handleToggleColumn(col)}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono leading-tight font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#4d8eff]/10 text-primary border-primary/30'
                        : 'bg-slate-900 text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                  >
                    {labelMap[col] || col}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SPREADSHEET TABLE GRID CONTAINER */}
          <div className="flex-1 overflow-auto bg-[#070b15] border border-outline-variant/60 rounded-xl relative shadow-2xl">
            {isNormalizing ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans">
                <span className="material-symbols-outlined text-[39px] text-primary block animate-spin mb-3">
                  sync
                </span>
                <p className="text-sm font-bold text-white">Consolidando normalização canônica...</p>
                <p className="text-xs text-slate-400/80">Validando dicionário BD_CIDADES_ROTAS</p>
              </div>
            ) : (
              <table className="text-left border-collapse whitespace-nowrap text-xs font-mono w-full table-fixed">
                <thead className="sticky top-0 z-20 shadow-md">
                  <tr className="text-[10.5px] font-semibold text-slate-400 border-b border-outline-variant">
                    {/* Multi select master check column */}
                    <th className="p-2 w-10 text-center bg-[#090e1a] border border-outline-variant/50 sticky left-0 z-30 shadow-[3px_0_5px_rgba(0,0,0,0.15)]">
                      <input
                        id="chk-master-select"
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-outline-variant bg-[#0b0f19] text-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    {renderHeaderCell('ctrc', 'Nº CTRC / UNID')}
                    {renderHeaderCell('cidade_ent', 'Praça de Destino')}
                    {renderHeaderCell('setor', 'Setor de Rota')}
                    {renderHeaderCell('prev_ent', 'Prev. SLA')}
                    {renderHeaderCell('destinatario', 'Razão Destinatário')}
                    {renderHeaderCell('remetente', 'Remetente')}
                    {renderHeaderCell('nf', 'NF')}
                    {renderHeaderCell('ocorrencia', 'Histórico Ocorrência')}
                    {renderHeaderCell('valor', 'Valor (R$)', true)}
                    {renderHeaderCell('volume', 'Qtde Vol', true)}
                    {renderHeaderCell('weight', 'Peso (KG)', true)}
                    {renderHeaderCell('disponibilidade', 'Status')}
                    {renderHeaderCell('localizacao', 'Localização')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-slate-300">
                  {Object.keys(groupedPendingCtrcs).map((groupKey) => {
                    const collection = groupedPendingCtrcs[groupKey];
                    const isGrouped = groupingMode !== 'direct';
                    const isCollapsed = isGrouped && !!expandedGroups[groupKey];

                    const totalGroupWeight = collection.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
                    const totalGroupValue = collection.reduce((sum, c) => sum + (c.valor || 0), 0);

                    return (
                      <React.Fragment key={groupKey}>
                        {isGrouped && (
                          <tr
                            onClick={() => {
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [groupKey]: !prev[groupKey],
                              }));
                            }}
                            className="bg-[#0f1526] hover:bg-[#131b30] border-b border-outline-variant/40 duration-150 cursor-pointer select-none"
                          >
                            <td colSpan={15} className="p-2 px-3 text-left font-sans text-xs font-bold text-[#dae2fd]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[17px] text-primary">
                                    {isCollapsed ? 'arrow_right' : 'arrow_drop_down'}
                                  </span>
                                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">
                                    {groupingMode === 'city' ? `📍 PRAÇA: ${groupKey}` : `🗺️ SETOR: ${groupKey}`}
                                  </span>
                                  <span className="text-slate-400 text-[11px] font-normal">
                                    ({collection.length} item(ns))
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-amber-200 text-[11px] font-semibold">
                                    Peso: {totalGroupWeight.toLocaleString('pt-BR')} kg
                                  </span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-emerald-400 text-[11px] font-semibold">
                                    Valor: R$ {totalGroupValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider">
                                  {isCollapsed ? 'Clique para ver detalhes' : 'Clique para ocultar'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {!isCollapsed &&
                          collection.map((ctrc) => {
                            const isChecked = selectedIds.includes(ctrc.id);
                            
                            // Color accents depending on priority and client group
                            const rowBorderHighlight = ctrc.isCurvaA
                              ? 'border-l-[3px] border-l-pink-400 bg-pink-500/[0.02]'
                              : ctrc.normPriority === 'CRÍTICA'
                              ? 'border-l-[3px] border-l-red-500 bg-red-500/[0.02]'
                              : '';

                            // Determine SLA colors
                            const renderSlaBadge = (dateStr: string) => {
                              if (!dateStr) return <span className="text-slate-500 italic block">S/Dt</span>;
                              const parts = dateStr.split('/');
                              if (parts.length < 3) return <span>{dateStr}</span>;
                              const itemDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                              const refDate = new Date(2026, 4, 25); // Reference May 25, 2026
                              const daysDiff = Math.ceil((itemDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

                              if (daysDiff < 0) {
                                return (
                                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded-md font-bold block text-center animate-pulse">
                                    ATRASADO
                                  </span>
                                );
                              } else if (daysDiff === 0) {
                                return (
                                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded-md font-bold block text-center">
                                    HOJE D+0
                                  </span>
                                );
                              } else if (daysDiff === 1) {
                                return (
                                  <span className="bg-[#4d8eff]/10 text-[#adc6ff] border border-primary/20 text-[9px] px-1.5 py-0.5 rounded-md font-bold block text-center">
                                    AMANHÃ D+1
                                  </span>
                                );
                              }
                              return (
                                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold block text-center">
                                  PROGRAMADO
                                </span>
                              );
                            };

                            // Weight scale visualizer
                            const renderCompactWeightGauge = (kg: number) => {
                              let percentage = Math.min(100, (kg / 2000) * 100);
                              let barColor = 'bg-sky-450';
                              if (kg > 1500) barColor = 'bg-rose-500';
                              else if (kg > 600) barColor = 'bg-orange-500';
                              else if (kg > 300) barColor = 'bg-amber-400';

                              return (
                                <div className="space-y-1 block min-w-[70px] text-left">
                                  <span className="font-bold text-white text-[10px]">{kg.toLocaleString('pt-BR')} kg</span>
                                  <div className="h-1 bg-slate-800 rounded-full w-full block overflow-hidden">
                                    <div className={`h-full ${barColor}`} style={{ width: `${percentage}%` }} />
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <tr
                                key={ctrc.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ctrc.id)}
                                onClick={(e) => handleToggleRow(ctrc.id, e)}
                                className={`hover:bg-[#131d33]/50 transition-colors border-b border-outline-variant/20 duration-150 cursor-grab active:cursor-grabbing ${
                                  isChecked ? 'bg-[#15233c] text-white' : 'bg-transparent'
                                } ${rowBorderHighlight}`}
                              >
                                {/* Checkbox cell */}
                                <td className="p-2 border border-outline-variant/20 text-center sticky left-0 bg-[#080d19] z-10 shadow-[3px_0_5px_rgba(0,0,0,0.15)]">
                                  <input
                                    id={`chk-ctrc-${ctrc.id}`}
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleRow(ctrc.id)}
                                    className="rounded border-outline-variant bg-[#0b0f19] text-primary cursor-pointer w-4 h-4"
                                  />
                                </td>

                                {/* CTRC / UNID code */}
                                {visibleColumns.ctrc && (
                                  <td className="p-2 border border-outline-variant/20 font-sans text-[11px] font-bold text-white truncate">
                                    <div className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px] text-slate-500 cursor-move">
                                        drag_indicator
                                      </span>
                                      <span className="bg-[#4d8eff]/10 border border-primary/20 text-primary font-mono text-[9px] px-1 py-0.2 rounded font-extrabold text-[8px]">
                                        {ctrc.unid}
                                      </span>
                                      <span className="text-primary truncate" title={ctrc.id}>{ctrc.id}</span>
                                    </div>
                                  </td>
                                )}

                                {/* Praça / Cidade */}
                                {visibleColumns.cidade_ent && (
                                  <td className="p-2 border border-outline-variant/20 truncate font-sans text-xs font-extrabold text-[#dae2fd]">
                                    {ctrc.normCidade}
                                  </td>
                                )}

                                {/* Setor */}
                                {visibleColumns.setor && (
                                  <td className="p-2 border border-outline-variant/20 truncate text-sky-300 font-semibold focus:outline-none">
                                    {ctrc.normSetor}
                                  </td>
                                )}

                                {/* SLA BADGES */}
                                {visibleColumns.prev_ent && (
                                  <td className="p-2 border border-outline-variant/20">
                                    {renderSlaBadge(ctrc.prev_ent || '')}
                                  </td>
                                )}

                                {/* RECIPIENT */}
                                {visibleColumns.destinatario && (
                                  <td className="p-2 border border-outline-variant/20 font-sans truncate text-white" title={ctrc.destinatario}>
                                    <div className="flex items-center justify-between gap-1 w-full truncate">
                                      <span className="truncate font-semibold text-[11px]">{ctrc.destinatario}</span>
                                      {ctrc.pagador === ctrc.destinatario && (
                                        <span className="bg-primary/15 border border-primary/20 text-primary text-[8.5px] font-extrabold font-sans px-1 rounded-sm">
                                          FOB
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* SENDER CURVA A */}
                                {visibleColumns.remetente && (
                                  <td className="p-2 border border-outline-variant/20 truncate font-sans text-slate-350" title={ctrc.remetente}>
                                    <div className="flex items-center justify-between gap-1 truncate w-full">
                                      <span className="truncate text-slate-400 text-[11px]">{ctrc.remetente}</span>
                                      {ctrc.isCurvaA && (
                                        <span
                                          className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[8.5px] px-1 rounded-sm font-extrabold font-sans animate-pulse shrink-0"
                                          title={`Clasificado como Curva A: SLA prioritário`}
                                        >
                                          ⭐ CURVA {ctrc.curvaAClass || 'A'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* NOTE FISCAL */}
                                {visibleColumns.nf && (
                                  <td className="p-2 border border-outline-variant/20 font-semibold text-slate-450 truncate text-center">
                                    {ctrc.nf || '-'}
                                  </td>
                                )}

                                {/* EXTREME OCORRENCIAS ENRICHER */}
                                {visibleColumns.ocorrencia && (
                                  <td className="p-2 border border-outline-variant/20 font-sans truncate" title={`${ctrc.ocorrencia || 'Sem Ocorrência'} - ${ctrc.enrichedOcorrenciaDesc}`}>
                                    <div className="flex flex-col text-[10.5px]">
                                      <div className="flex items-center gap-1 font-mono text-[9px] text-[#2ebd85]">
                                        <span className="font-bold">{ctrc.ocorrencia || '57 PEND'}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-slate-300 truncate lowercase uppercase">{ctrc.enrichedOcorrenciaDesc}</span>
                                      </div>
                                      {ctrc.enrichedOcorrenciaTratativa && (
                                        <span className="text-[8px] text-orange-200 italic truncate font-sans">
                                          Rsl: {ctrc.enrichedOcorrenciaTratativa}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* VALOR DECLARADO */}
                                {visibleColumns.valor && (
                                  <td className="p-2 border border-outline-variant/20 text-right font-bold text-slate-300">
                                    {(ctrc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                )}

                                {/* QUANTIDADE VOLUMES */}
                                {visibleColumns.volume && (
                                  <td className="p-2 border border-outline-variant/20 text-right text-sky-300 font-bold">
                                    {ctrc.volume} vol
                                  </td>
                                )}

                                {/* PESO KG / GUAGE */}
                                {visibleColumns.weight && (
                                  <td className="p-2 border border-outline-variant/20 text-right">
                                    {renderCompactWeightGauge(ctrc.peso_r || ctrc.weight || 0)}
                                  </td>
                                )}

                                {/* STATUS */}
                                {visibleColumns.disponibilidade && (
                                  <td className="p-2 border border-outline-variant/20 text-center font-sans text-[10px]">
                                    <span className="bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20 text-[8px] px-1 py-0.2 rounded font-extrabold uppercase">
                                      {ctrc.status || 'Disponível'}
                                    </span>
                                  </td>
                                )}

                                {/* LOCALIZACAO GAIOLA */}
                                {visibleColumns.localizacao && (
                                  <td className="p-2 border border-outline-variant/20 text-slate-400 font-bold font-sans">
                                    {ctrc.localizacao || 'GAIOLA SPO - BOX R1'}
                                  </td>
                                )}

                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}

                  {sortedPendingCtrcs.length === 0 && (
                    <tr>
                      <td colSpan={15} className="text-center py-20 bg-surface text-slate-400 font-sans">
                        <span className="material-symbols-outlined text-[42px] mb-2 text-slate-600 block">
                          info_outline
                        </span>
                        <p className="font-bold text-white text-sm">Pilha Operativa Vazia</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Nenhum conhecimento operacional disponível para roteirização nesta filial, com os filtros ou agrupamentos vigentes.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* SPREADSHEET FOOTER CONTROL OVER CHECKS */}
          <div className="bg-[#0f1525] border border-outline-variant/60 rounded-xl p-3 shrink-0 flex flex-col sm:flex-row justify-between items-center mt-3 gap-3">
            <div className="flex items-center gap-4 text-left font-sans text-xs w-full sm:w-auto">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[16px] text-[#4d8eff]">checklist</span>
                <span>Itens selecionados:</span>
                <span className="font-mono text-white text-xs font-black">{selectedIds.length}</span>
              </span>
              <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
              <div className="flex gap-4">
                <span className="text-slate-400 text-[11px]">
                  Peso total: <span className="font-mono text-amber-200 font-bold">{selectedWeight.toLocaleString('pt-BR')} kg</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  Contagem: <span className="font-mono text-sky-300 font-bold">{selectedVolume} vol</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  Mercadoria: <span className="font-mono text-emerald-400 font-bold">R$ {selectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedIds.length > 0 && (
                <>
                  <button
                    id="btn-clear-checks"
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] text-slate-400 hover:text-white transition-colors font-sans font-bold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                  <select
                    id="select-load-quick"
                    onChange={(e) => {
                      if (e.target.value) {
                        assignSelectionToVehicle(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-primary hover:bg-[#4d8eff] text-on-primary font-bold font-sans text-[11px] rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-lg"
                  >
                    <option value="">⚙️ MANOBRAR SELEÇÃO PARA...</option>
                    {activeVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.id} - {v.driverName} ({v.type})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: COCKPIT DE CONSOLIDAÇÃO DA FROTA (Fleet Manifest Assignation Hub) */}
        <div className="w-full lg:w-[32%] shrink-0 flex flex-col overflow-hidden p-3 bg-surface-container/30 text-left">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-outline-variant/60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_shipping
              </span>
              <div>
                <h3 className="font-sans font-extrabold text-[#dae2fd] text-sm uppercase leading-none tracking-wide">FROTAS & EXPEDIÇÃO</h3>
                <span className="text-[9px] text-[#4edea3] font-bold font-sans tracking-widest uppercase">Console Central</span>
              </div>
            </div>
            {/* Live blinking alert indicator if any draft exceeds limit */}
            <div className="flex items-center gap-1.5 bg-[#090e1a] px-2 py-0.5 rounded-full border border-outline-variant/50">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span className="text-[9px] text-slate-400 font-mono font-bold">{activeVehicles.length} Veículos Ativos</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans mb-3 leading-relaxed">
            Arraste os conhecimentos <span className="font-semibold text-white">CTRC</span> do grid à esquerda e solte-os em cima do veículo desejado para consolidar os pesos e as cargas instantaneamente.
          </p>

          {/* List of active vehicle drop panels */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activeVehicles.map((v) => {
              // Gather CTRCs currently drafted local state to this specific vehicle
              const draftedCtrcs = normalizedCtrcs.filter((c) => draftAssignments[c.id] === v.id);
              const vehicleMaxCapacity = parseVehicleCapacity(v.capacity);
              
              const totalDraftWeight = draftedCtrcs.reduce((sum, c) => sum + (c.peso_r || c.weight || 0), 0);
              const totalDraftVolume = draftedCtrcs.reduce((sum, c) => sum + (c.volume || 0), 0);
              const totalDraftValue = draftedCtrcs.reduce((sum, c) => sum + (c.valor || 0), 0);

              const saturationPercentage = vehicleMaxCapacity > 0 ? (totalDraftWeight / vehicleMaxCapacity) * 100 : 0;
              const isOverloaded = totalDraftWeight > vehicleMaxCapacity;
              const isCloseToOverload = !isOverloaded && saturationPercentage >= 85;

              // Generate status banner
              let saturationBanner = 'DORMANT / Vazio';
              let meterColor = 'bg-slate-705';
              let gaugeBorderColor = 'border-slate-800';
              if (totalDraftWeight > 0) {
                if (isOverloaded) {
                  saturationBanner = '🚨 EXCESSO DE PESO - BALANÇA EM RISCO';
                  meterColor = 'bg-rose-500';
                  gaugeBorderColor = 'border-rose-500/50';
                } else if (isCloseToOverload) {
                  saturationBanner = '⚠️ CARGA MÁXIMA - LIMITE OPERACIONAL';
                  meterColor = 'bg-orange-500';
                  gaugeBorderColor = 'border-orange-500/50';
                } else {
                  saturationBanner = '👍 CARGA OTIMIZADA';
                  meterColor = 'bg-[#4edea3]';
                  gaugeBorderColor = 'border-[#4edea3]/40';
                }
              }

              const isDropHovered = hoveredVehicleId === v.id;
              const isExpanded = !!expandedVehicles[v.id];

              return (
                <div
                  key={v.id}
                  id={`card-vehicle-${v.id}`}
                  onDragOver={(e) => handleDragOver(e, v.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, v.id)}
                  className={`border rounded-xl p-3 text-left transition-all relative overflow-hidden ${
                    isDropHovered
                      ? 'bg-[#142340] border-[#4d8eff] scale-[1.01] shadow-xl border-dashed border-2'
                      : isOverloaded
                      ? 'bg-[#180e14] border-red-500/35 hover:border-red-500/50 shadow-md'
                      : 'bg-[#0a0f1c] border-outline-variant/65 hover:border-slate-500 shadow-sm'
                  }`}
                >
                  
                  {/* Vehicle Identity Line */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm uppercase text-white tracking-wider">
                          {v.id}
                        </span>
                        <span
                          className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            v.status === 'Disponível'
                              ? 'bg-[#4edea3]/10 text-[#4edea3]'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-1">
                        Motorista: <span className="text-white font-bold">{v.driverName}</span>
                      </p>
                    </div>

                    <div className="text-right font-mono text-[10px] space-y-0.5">
                      <span className="bg-[#1b253b] border border-outline-variant text-[#dae2fd] text-[9.5px] px-2 py-0.5 rounded font-extrabold uppercase">
                        {v.type}
                      </span>
                      <p className="text-slate-400 mt-1">Limite: <span className="font-bold text-slate-200">{v.capacity}</span></p>
                    </div>
                  </div>

                  {/* LOADING DENSITY PROGRESS GAUGE */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex justify-between text-[10.5px] font-sans">
                      <span className="text-slate-400">Capacidade Carregada</span>
                      <span className={`font-mono font-bold ${isOverloaded ? 'text-red-400' : 'text-white'}`}>
                        {totalDraftWeight.toLocaleString('pt-BR')} kg / {vehicleMaxCapacity.toLocaleString('pt-BR')} kg ({saturationPercentage.toFixed(1)}%)
                      </span>
                    </div>

                    {/* Rich progress bar */}
                    <div className="h-2 bg-slate-900 rounded-full w-full overflow-hidden block border border-outline-variant/30">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${meterColor}`}
                        style={{ width: `${Math.min(100, saturationPercentage)}%` }}
                      />
                    </div>

                    {/* Saturation Helper banner */}
                    <div className="flex justify-between items-center text-[9px] pt-0.5">
                      <span className={`font-semibold tracking-wider font-sans ${isOverloaded ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                        {saturationBanner}
                      </span>
                      {draftedCtrcs.length > 0 && (
                        <span className="font-mono font-extrabold text-[#dae2fd]">
                          {totalDraftVolume} volumes • R$ {totalDraftValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DRAWER TOGGLE & ACTION WORKSPACE COLLAPSIBLE */}
                  {draftedCtrcs.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-outline-variant/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          id={`btn-collapse-veh-${v.id}`}
                          onClick={() => {
                            setExpandedVehicles((prev) => ({
                              ...prev,
                              [v.id]: !prev[v.id],
                            }));
                          }}
                          className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          <span>Itens Carregados ({draftedCtrcs.length})</span>
                        </button>
                        
                        <button
                          id={`btn-clear-draft-${v.id}`}
                          onClick={() => {
                            if (confirm('Esvaziar todo o cargamento draft deste veículo?')) {
                              clearVehicleDraft(v.id);
                            }
                          }}
                          className="text-[9.5px] text-red-400 hover:underline hover:text-red-300 font-sans cursor-pointer"
                        >
                          Esvaziar Carga
                        </button>
                      </div>

                      {/* Expandable Loaded items list */}
                      {isExpanded && (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto bg-[#060a14] p-2 rounded-lg border border-outline-variant/40 divide-y divide-outline-variant/20 scrollbar-none">
                          {draftedCtrcs.map((item) => (
                            <div key={item.id} className="pt-1.5 pb-1 flex items-center justify-between text-[10px] font-mono">
                              <div className="min-w-0 flex-1 pr-2 align-middle">
                                <p className="font-bold text-white truncate max-w-[170px] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0"></span>
                                  {item.id}
                                </p>
                                <p className="text-slate-400 text-[9px] font-sans truncate" title={item.destinatario}>
                                  Dest: {item.destinatario}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 font-mono shrink-0">
                                <span className="text-amber-200 font-bold">{(item.peso_r || item.weight || 0)} kg</span>
                                <button
                                  id={`btn-unload-ctrc-${item.id}`}
                                  onClick={() => unassignCtrc(item.id)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 rounded cursor-pointer duration-100"
                                  title="Retirar item da carga"
                                >
                                  <span className="material-symbols-outlined text-[13px]">close</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Consolidate Master button */}
                      <button
                        id={`btn-finalize-romaneio-${v.id}`}
                        onClick={() => handleFinalizeRomaneio(v.id)}
                        className={`w-full py-2 px-3 rounded-lg font-bold font-sans text-xs text-center duration-150 transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-lg ${
                          isOverloaded
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-[#4d8eff] hover:bg-[#3d7edf] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>Emitir Romaneio oficial - {v.id}</span>
                      </button>

                    </div>
                  )}

                  {draftedCtrcs.length === 0 && (
                    <div className="mt-3.5 py-4 px-2 border border-dashed border-outline-variant/50 rounded-lg text-center bg-[#070b14]/50 select-none">
                      <span className="material-symbols-outlined text-[20px] text-slate-600 block mb-1">
                        archive
                      </span>
                      <p className="text-[10px] text-slate-500 font-sans">Canal Draft de Carga Vazio</p>
                    </div>
                  )}

                </div>
              );
            })}

            {activeVehicles.length === 0 && (
              <p className="text-xs italic text-slate-500 text-center py-8">
                Nenhum veículo disponível de frota cadastrado no terminal.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
