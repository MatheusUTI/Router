import React, { useState, useEffect } from 'react';
import { Ctrc, Vehicle, AppUser } from '../types';

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
  adminUser: AppUser;
}

export default function RoteirizacaoView({
  availableCtrcs,
  vehicles,
  onAssignCtre,
  onConsolidateRomaneio,
  adminUser,
}: RoteirizacaoViewProps) {
  // Pre-select 'SPO684122-2' in offline or fallback if present so the view is interactive
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Column widths state for Excel-like column resizing behavior
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    unid: 70,
    ctrc: 120,
    cidade_ent: 110,
    setor: 90,
    prev_ent: 95,
    pagador: 140,
    remetente: 140,
    destinatario: 180,
    cod: 80,
    ocorrencia: 90,
    descricao: 160,
    data_ocorrencia: 110,
    nf: 70,
    valor: 100,
    frete: 100,
    volume: 75,
    weight: 95,
    disponibilidade: 110,
    localizacao: 155,
  });

  // active unit filter state (non-masters are strictly locked to their assigned profiles)
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (!adminUser.is_master) {
      return (adminUser.unid || 'SPO').toUpperCase();
    }
    return (adminUser.unid || 'TODAS').toUpperCase();
  });

  // Track state changes reactively if logged-in profile updates
  useEffect(() => {
    if (!adminUser.is_master) {
      setSelectedUnit((adminUser.unid || 'SPO').toUpperCase());
    } else {
      setSelectedUnit((adminUser.unid || 'TODAS').toUpperCase());
    }
  }, [adminUser]);

  // If there's an initial pre-selectable CTRC on first boot, mark it
  useEffect(() => {
    if (availableCtrcs.some(c => c.id === 'SPO684122-2')) {
      setSelectedIds(['SPO684122-2']);
    }
  }, [availableCtrcs]);

  // Column Resizer Handler with Mouse Event Listeners to bypass iframe sandboxes constraints
  const handleMouseDown = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colId];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setColumnWidths((prev) => ({
        ...prev,
        [colId]: Math.max(45, startWidth + deltaX),
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Track assigned vehicle state
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(activeVehicles[0]?.id || 'RTA3G45');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Dynamic Unique Sectors fetch from actual database CTRCs depending on chosen unit view
  const uniqueSectors = Array.from(
    new Set(
      availableCtrcs
        .filter((c) => {
          const ctrcUnid = (c.unid || c.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();
          if (!adminUser.is_master) {
            return ctrcUnid === (adminUser.unid || 'SPO').toUpperCase();
          } else {
            if (selectedUnit !== 'TODAS') return ctrcUnid === selectedUnit;
          }
          return true;
        })
        .map((c) => c.setor)
        .filter((s): s is string => !!s)
    )
  ).sort();

  // Reset selected sector filter if it's no longer present when unit switches
  useEffect(() => {
    if (selectedSector !== 'all' && !uniqueSectors.includes(selectedSector)) {
      setSelectedSector('all');
    }
  }, [selectedUnit, uniqueSectors, selectedSector]);

  // Unit, Sector & Fuzzy Match Search filter chain
  const filteredCtrcs = availableCtrcs.filter((ctrc) => {
    // 1. UNID Access Enforcement
    const ctrcUnid = (ctrc.unid || ctrc.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();
    if (!adminUser.is_master) {
      const userUnid = (adminUser.unid || 'SPO').toUpperCase();
      if (ctrcUnid !== userUnid) return false;
    } else {
      if (selectedUnit !== 'TODAS') {
        if (ctrcUnid !== selectedUnit) return false;
      }
    }

    // 2. Sector filter
    if (selectedSector !== 'all') {
      if (ctrc.setor !== selectedSector) return false;
    }

    // 3. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = (ctrc.id || '').toLowerCase().includes(q);
      const matchDest = (ctrc.destinatario || '').toLowerCase().includes(q);
      const matchRem = (ctrc.remetente || '').toLowerCase().includes(q);
      const matchCid = (ctrc.cidade || '').toLowerCase().includes(q);
      const matchNf = (ctrc.nf || '').toLowerCase().includes(q);
      if (!matchId && !matchDest && !matchRem && !matchCid && !matchNf) {
        return false;
      }
    }

    return true;
  });

  // Safe row selection state toggling
  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredCtrcs.map((c) => c.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const isAllSelected =
    filteredCtrcs.length > 0 &&
    filteredCtrcs.map((c) => c.id).every((id) => selectedIds.includes(id));

  // Romaneio outputs calculations
  const selectedCtrcsList = availableCtrcs.filter((c) => selectedIds.includes(c.id));
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
      setToastMessage(`Veículo de destino alterado para ${veh.id} (${veh.driverName})`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Generate outgoing Romaneio Manifest
  const handleGenerateManifest = () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um Conhecimento de Transporte (CTRC) da lista para consolidar a carga.');
      return;
    }

    if (!selectedVehicleId) {
      alert('Atribua um veículo de frota antes de gerar o manifesto de saída.');
      setIsVehicleModalOpen(true);
      return;
    }

    // Trigger state machine callbacks
    selectedCtrcsList.forEach((c) => {
      onAssignCtre(c.id, selectedVehicleId);
    });

    onConsolidateRomaneio(selectedVehicleId, selectedCtrcsList);
  };

  // Sum total columns pixels for rigid HTML table sizing
  const totalTableWidth = (Object.values(columnWidths).reduce((a, b) => (a as number) + (b as number), 0) as number) + 40; // 40 for checkmark column

  // Render Resizable Header Cell Helper
  const renderHeaderCell = (colId: string, label: string, isNumeric = false) => {
    const width = columnWidths[colId];
    return (
      <th
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        className={`p-2.5 border border-outline-variant relative select-none truncate group ${
          isNumeric ? 'text-right' : 'text-left'
        }`}
        title={label}
      >
        <span>{label}</span>
        {/* Resize Handle Drag Area */}
        <div
          onMouseDown={(e) => handleMouseDown(e, colId)}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 border-r border-transparent hover:border-primary/50 transition-colors z-10"
        />
      </th>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden select-none">
      {/* Page Header Area */}
      <div className="pb-4 flex flex-col md:flex-row md:items-end justify-between border-b border-outline-variant bg-surface shrink-0 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight">Roteirização Geral</h2>
            <span className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Work Unit Controller
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Compare e selecione CTRCs faturados para formar o arquivo consolidado de carregamento físico da frota.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {/* Unit Filter (Locked for standard users, filterable for Master users) */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline-variant text-[18px]">location_on</span>
            {adminUser.is_master ? (
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-on-surface font-semibold focus:outline-none focus:border-primary cursor-pointer hover:border-outline transition-colors"
                title="Selecione qual unidade gerencial filtrar na roteirização"
              >
                <option value="TODAS">Unidade: Todas</option>
                <option value="SPO">Unidade: SPO (São Paulo)</option>
                <option value="PPY">Unidade: PPY (Pouso Alegre)</option>
                <option value="ALF">Unidade: ALF (Alfenas)</option>
                <option value="VGA">Unidade: VGA (Varginha)</option>
              </select>
            ) : (
              <span className="bg-[#4d8eff]/10 text-primary border border-[#4d8eff]/20 font-bold font-sans text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Unidade: {selectedUnit}
              </span>
            )}
          </div>

          {/* Fuzzy Search query input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filtro CTRC, destinatário, NF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 font-sans text-xs text-[#dae2fd] focus:outline-none focus:border-primary placeholder-on-surface-variant/60 w-52 transition-colors uppercase"
            />
          </div>

          {/* Dynamic Unique Sectors dropdown filter */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline-variant text-[18px]">filter_list</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 font-sans text-xs text-[#dae2fd] focus:outline-none focus:border-primary cursor-pointer hover:border-outline transition-colors uppercase font-medium"
            >
              <option value="all">Setor: Todos</option>
              {uniqueSectors.map((sec) => (
                <option key={sec} value={sec}>
                  Setor: {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-tertiary-container text-on-tertiary-container border border-tertiary/30 rounded-xl px-4 py-2.5 shadow-2xl text-xs font-bold font-sans flex items-center gap-2 animate-fade-in animate-pulse">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {toastMessage}
        </div>
      )}

      {/* High Density Column-Resizable Excel Table Panel */}
      <div className="flex-1 overflow-auto bg-surface relative rounded-xl border border-outline-variant shadow-inner">
        <table
          style={{ width: `${totalTableWidth}px`, tableLayout: 'fixed' }}
          className="text-left border-collapse whitespace-nowrap text-xs font-sans"
        >
          <thead className="bg-[#12192a] sticky top-0 z-20 shadow border-b-2 border-outline-variant">
            <tr className="text-[11px] text-[#dae2fd]/70 font-semibold uppercase tracking-wider">
              {/* Fixed Row checkbox column header */}
              <th className="p-2 border border-outline-variant w-10 text-center bg-[#12192a] sticky left-0 z-30 shadow-[4px_0_8px_rgba(0,0,0,0.1)]">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer w-4 h-4"
                />
              </th>
              {renderHeaderCell('unid', 'UNID')}
              {renderHeaderCell('ctrc', 'CTRC Invoice ID')}
              {renderHeaderCell('cidade_ent', 'Praça / Cidade')}
              {renderHeaderCell('setor', 'Setor de Rota')}
              {renderHeaderCell('prev_ent', 'Previsão de Entrega')}
              {renderHeaderCell('pagador', 'Remetente Pagador')}
              {renderHeaderCell('remetente', 'Cliente Faturamento')}
              {renderHeaderCell('destinatario', 'Cliente Destinatário')}
              {renderHeaderCell('cod', 'Código ERP')}
              {renderHeaderCell('ocorrencia', 'Cód. Ocorrência')}
              {renderHeaderCell('descricao', 'Última Tratativa')}
              {renderHeaderCell('data_ocorrencia', 'Data Ocorrência')}
              {renderHeaderCell('nf', 'Nota Fiscal (NF)')}
              {renderHeaderCell('valor', 'Valor Declarado (R$)', true)}
              {renderHeaderCell('frete', 'Valor de Frete (R$)', true)}
              {renderHeaderCell('volume', 'Qtde Volumes', true)}
              {renderHeaderCell('weight', 'Peso Real (Kg)', true)}
              {renderHeaderCell('disponibilidade', 'Estoque / Status')}
              {renderHeaderCell('localizacao', 'Gaiola / Depósito')}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant text-on-surface-variant font-medium text-[11px] font-mono">
            {filteredCtrcs.map((ctrc) => {
              const checked = selectedIds.includes(ctrc.id);
              
              // Status column styling map
              let statusStyle = 'text-tertiary';
              if (ctrc.status === 'Em Rota') statusStyle = 'text-primary font-bold';
              else if (ctrc.status === 'Transferência') statusStyle = 'text-[#e0e2ec]';
              else if (ctrc.status === 'Agendamento') statusStyle = 'text-secondary font-bold';

              // Sector dynamic aesthetic formatting tags
              const isSpecialSector = ctrc.setor === 'ROTA 99' || ctrc.setor === '99';
              const sectorStyle = isSpecialSector
                ? 'text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded'
                : 'text-on-surface';

              const isUrgentDate = ctrc.id === 'VAG998877-1';

              // Normalizing derived details for high density alignment accuracy
              const unidVal = (ctrc.unid || ctrc.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();
              const pagadorVal = ctrc.pagador || `${ctrc.remetente || 'REMETENTE'} (FOB)`;
              const codVal = ctrc.cod || `C-${ctrc.id.slice(-6)}`;
              const descricaoOcorrVal = ctrc.descricao_ocorr || 'MERCADORIA EM CONGELADO / AUDITADO';
              const dataOcorrenciaVal = ctrc.data_ocorrencia || ctrc.data_ocorr || '22/05/2026';
              const pesoReal = ctrc.peso_r || ctrc.weight || 0;
              const dispVal = ctrc.disponibilidade || ctrc.status.toUpperCase();
              const locVal = ctrc.localizacao || 'BOX 01 / CORREDOR NORTE';

              return (
                <tr
                  key={ctrc.id}
                  onClick={() => handleToggleRow(ctrc.id)}
                  className={`hover:bg-[#1a233b]/40 border-b border-outline-variant/30 group cursor-pointer transition-colors ${
                    checked ? 'bg-[#1b2b4d]/75 text-white' : 'bg-surface'
                  }`}
                >
                  {/* Fixed Row checkbox cell */}
                  <td
                    className="p-1.5 border border-outline-variant text-center sticky left-0 bg-[#0d1321] group-hover:bg-[#151c30] z-10 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleRow(ctrc.id)}
                      className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer w-4 h-4"
                    />
                  </td>

                  {/* UNID */}
                  <td
                    style={{ width: `${columnWidths.unid}px`, minWidth: `${columnWidths.unid}px`, maxWidth: `${columnWidths.unid}px` }}
                    className="p-1.5 border border-outline-variant font-bold text-[#dae2fd] truncate select-all"
                  >
                    {unidVal}
                  </td>

                  {/* CTRC Invoice ID */}
                  <td
                    style={{ width: `${columnWidths.ctrc}px`, minWidth: `${columnWidths.ctrc}px`, maxWidth: `${columnWidths.ctrc}px` }}
                    className="p-1.5 border border-outline-variant text-primary font-bold truncate select-all font-mono"
                  >
                    {ctrc.id}
                  </td>

                  {/* Delivery City */}
                  <td
                    style={{ width: `${columnWidths.cidade_ent}px`, minWidth: `${columnWidths.cidade_ent}px`, maxWidth: `${columnWidths.cidade_ent}px` }}
                    className="p-1.5 border border-outline-variant text-[#dae2fd]/95 truncate font-sans font-medium"
                  >
                    {ctrc.cidade_ent || ctrc.cidade.split(',')[0].toUpperCase()}
                  </td>

                  {/* Sector */}
                  <td
                    style={{ width: `${columnWidths.setor}px`, minWidth: `${columnWidths.setor}px`, maxWidth: `${columnWidths.setor}px` }}
                    className="p-1.5 border border-outline-variant truncate"
                  >
                    <span className={sectorStyle}>{ctrc.setor || '-'}</span>
                  </td>

                  {/* Estimated Delivery Date */}
                  <td
                    style={{ width: `${columnWidths.prev_ent}px`, minWidth: `${columnWidths.prev_ent}px`, maxWidth: `${columnWidths.prev_ent}px` }}
                    className={`p-1.5 border border-outline-variant truncate ${
                      isUrgentDate ? 'text-error bg-error-container/10 font-bold px-2 py-0.5 rounded' : 'text-slate-400'
                    }`}
                  >
                    {ctrc.prev_ent || '25/05/2026'}
                  </td>

                  {/* PAGADOR */}
                  <td
                    style={{ width: `${columnWidths.pagador}px`, minWidth: `${columnWidths.pagador}px`, maxWidth: `${columnWidths.pagador}px` }}
                    className="p-1.5 border border-outline-variant font-sans text-[11px] truncate text-slate-300"
                    title={pagadorVal}
                  >
                    {pagadorVal}
                  </td>

                  {/* Sender Name */}
                  <td
                    style={{ width: `${columnWidths.remetente}px`, minWidth: `${columnWidths.remetente}px`, maxWidth: `${columnWidths.remetente}px` }}
                    className="p-1.5 border border-outline-variant font-sans text-[11px] truncate text-slate-300"
                    title={ctrc.remetente || 'REMETENTE'}
                  >
                    {ctrc.remetente || 'REMETENTE'}
                  </td>

                  {/* Recipient Name */}
                  <td
                    style={{ width: `${columnWidths.destinatario}px`, minWidth: `${columnWidths.destinatario}px`, maxWidth: `${columnWidths.destinatario}px` }}
                    className="p-1.5 border border-outline-variant font-sans text-[11.5px] text-white font-semibold truncate"
                    title={ctrc.destinatario}
                  >
                    {ctrc.destinatario}
                  </td>

                  {/* COD */}
                  <td
                    style={{ width: `${columnWidths.cod}px`, minWidth: `${columnWidths.cod}px`, maxWidth: `${columnWidths.cod}px` }}
                    className="p-1.5 border border-outline-variant font-mono text-slate-400 truncate"
                  >
                    {codVal}
                  </td>

                  {/* Occurrence code Text */}
                  <td
                    style={{ width: `${columnWidths.ocorrencia}px`, minWidth: `${columnWidths.ocorrencia}px`, maxWidth: `${columnWidths.ocorrencia}px` }}
                    className="p-1.5 border border-outline-variant font-mono text-slate-400 truncate"
                  >
                    {ctrc.ocorrencia || '57 CONFE OK'}
                  </td>

                  {/* DESCRICAO OCORRENCIA */}
                  <td
                    style={{ width: `${columnWidths.descricao}px`, minWidth: `${columnWidths.descricao}px`, maxWidth: `${columnWidths.descricao}px` }}
                    className="p-1.5 border border-outline-variant uppercase text-slate-300 truncate font-sans text-[11px]"
                    title={descricaoOcorrVal}
                  >
                    {descricaoOcorrVal}
                  </td>

                  {/* Occurence Date */}
                  <td
                    style={{ width: `${columnWidths.data_ocorrencia}px`, minWidth: `${columnWidths.data_ocorrencia}px`, maxWidth: `${columnWidths.data_ocorrencia}px` }}
                    className="p-1.5 border border-outline-variant tabular-nums text-slate-400 truncate"
                  >
                    {dataOcorrenciaVal}
                  </td>

                  {/* Invoice Code */}
                  <td
                    style={{ width: `${columnWidths.nf}px`, minWidth: `${columnWidths.nf}px`, maxWidth: `${columnWidths.nf}px` }}
                    className="p-1.5 border border-outline-variant font-mono font-bold text-slate-300 truncate"
                  >
                    {ctrc.nf || '-'}
                  </td>

                  {/* Value (R$) */}
                  <td
                    style={{ width: `${columnWidths.valor}px`, minWidth: `${columnWidths.valor}px`, maxWidth: `${columnWidths.valor}px` }}
                    className="p-1.5 border border-outline-variant text-right font-mono text-[#dae2fd] font-semibold truncate"
                  >
                    {(ctrc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Freight Cost */}
                  <td
                    style={{ width: `${columnWidths.frete}px`, minWidth: `${columnWidths.frete}px`, maxWidth: `${columnWidths.frete}px` }}
                    className="p-1.5 border border-outline-variant text-right font-mono text-slate-400 truncate"
                  >
                    {(ctrc.frete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Quantity Volumes */}
                  <td
                    style={{ width: `${columnWidths.volume}px`, minWidth: `${columnWidths.volume}px`, maxWidth: `${columnWidths.volume}px` }}
                    className="p-1.5 border border-outline-variant text-right font-mono font-bold text-sky-300 truncate"
                  >
                    {ctrc.volume}
                  </td>

                  {/* Weight kg - PESO_R */}
                  <td
                    style={{ width: `${columnWidths.weight}px`, minWidth: `${columnWidths.weight}px`, maxWidth: `${columnWidths.weight}px` }}
                    className="p-1.5 border border-outline-variant text-right font-mono text-amber-200 font-bold truncate"
                  >
                    {pesoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  {/* DISPONIBILIDADE */}
                  <td
                    style={{ width: `${columnWidths.disponibilidade}px`, minWidth: `${columnWidths.disponibilidade}px`, maxWidth: `${columnWidths.disponibilidade}px` }}
                    className={`p-1.5 border border-outline-variant ${statusStyle} uppercase font-bold text-[10px] truncate`}
                  >
                    {dispVal}
                  </td>

                  {/* LOCALIZAÇÃO */}
                  <td
                    style={{ width: `${columnWidths.localizacao}px`, minWidth: `${columnWidths.localizacao}px`, maxWidth: `${columnWidths.localizacao}px` }}
                    className="p-1.5 border border-outline-variant text-[#dae2fd]/70 font-medium truncate"
                  >
                    {locVal}
                  </td>
                </tr>
              );
            })}

            {filteredCtrcs.length === 0 && (
              <tr>
                {/* Visual state illustration for empty grid */}
                <td colSpan={21} className="text-center py-20 bg-surface">
                  <span className="material-symbols-outlined text-[42px] mb-2 text-on-surface-variant/30 block animate-pulse">
                    error
                  </span>
                  <p className="text-sm font-bold text-white">Nenhum CTRC correspondente nesta unidade/setor.</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1 max-w-sm mx-auto">
                    Ajuste os filtros de Unidade (UNID), Setor de Rota ou limpe os termos pesquisados.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom calculations control panel widget */}
      <div className="bg-surface border-t border-outline-variant p-4 flex flex-col sm:flex-row justify-between items-center z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.3)] gap-4 shrink-0">
        <div className="flex items-center gap-6 flex-wrap justify-between sm:justify-start w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {selectedIds.length > 0 ? 'check_box' : 'check_box_outline_blank'}
            </span>
            <span className="font-sans text-xs text-on-surface">
              <span className="font-bold">{selectedIds.length}</span> CTRCs selecionados
            </span>
          </div>

          <div className="h-6 w-px bg-outline-variant/60 hidden sm:block"></div>

          <div className="flex gap-6 font-sans text-xs flex-wrap">
            <div>
              <span className="text-on-surface-variant mr-1.5">Peso Total:</span>
              <span className="text-amber-200 font-mono font-bold">
                {totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Volume Total:</span>
              <span className="text-sky-300 font-mono font-bold">
                {totalVolume} vol
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Valor Total:</span>
              <span className="text-emerald-400 font-mono font-bold">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleClearSelection}
              className="px-3.5 py-2 hover:bg-slate-800 text-on-surface-variant hover:text-white text-xs font-semibold rounded-lg transition-colors border border-outline-variant/50"
            >
              Desmarcar Todos
            </button>
          )}

          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-[#dae2fd] text-xs font-bold rounded-lg transition-all border border-outline-variant/60 flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-[15px] text-[#4d8eff]">local_shipping</span>
            Veículo: <span className="text-[#dae2fd] uppercase font-mono">{selectedVehicleId}</span>
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

      {/* Floating Modal for vehicle assignment picker */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left">
            <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                <span className="font-bold text-white text-sm">Selecione Veículo de Destino</span>
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
                        : 'bg-surface border-outline-variant/50 hover:border-outline text-on-surface'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs uppercase text-white">{v.id}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          v.status === 'Disponível'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-primary/20 text-primary'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Motorista: <span className="font-bold text-on-surface-variant font-sans text-xs">{v.driverName}</span>
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
