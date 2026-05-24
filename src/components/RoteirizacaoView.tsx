import { useState } from 'react';
import { Ctrc, Vehicle } from '../types';

interface RoteirizacaoViewProps {
  availableCtrcs: Ctrc[];
  vehicles: Vehicle[];
  onAssignCtre: (ctrcId: string, vehicleId: string) => void;
  onConsolidateRomaneio: (vehicleId: string, assignedCtrcs: Ctrc[]) => void;
}

export default function RoteirizacaoView({
  availableCtrcs,
  vehicles,
  onAssignCtre,
  onConsolidateRomaneio,
}: RoteirizacaoViewProps) {
  // Mockup pre-selects 'SPO684122-2' so the screen is initially interactive
  const [selectedIds, setSelectedIds] = useState<string[]>(['SPO684122-2']);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Track assigned vehicle state
  const activeVehicles = vehicles.filter((v) => v.status === 'Disponível' || v.status === 'Em Rota');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(activeVehicles[0]?.id || 'RTA3G45');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Sector filtering
  const filteredCtrcs = availableCtrcs.filter((ctrc) => {
    // Sector filter
    if (selectedSector !== 'all') {
      if (ctrc.setor !== selectedSector) return false;
    }

    // Search query filter
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

  // Checkbox functions
  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredCtrcs.map((c) => c.id);
    const areAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      // Uncheck all filtered rows
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      // Check all filtered rows
      setSelectedIds((prev) => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const isAllSelected =
    filteredCtrcs.length > 0 &&
    filteredCtrcs.map((c) => c.id).every((id) => selectedIds.includes(id));

  // Profit/Metric calculations for selected documents
  const selectedCtrcsList = availableCtrcs.filter((c) => selectedIds.includes(c.id));
  const totalWeight = selectedCtrcsList.reduce((sum, c) => sum + c.weight, 0);
  const totalVolume = selectedCtrcsList.reduce((sum, c) => sum + c.volume, 0); // volumes count
  const totalValue = selectedCtrcsList.reduce((sum, c) => sum + (c.valor || 0), 0);

  // Clear selections action button
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Assign vehicle confirmed
  const handlePickVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsVehicleModalOpen(false);
    
    const veh = vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      setToastMessage(`Veículo de destino alterado para ${veh.id} (${veh.driverName})`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Generate Manifest (Consolidate) Action
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

    // Trigger row level assign events for compliance with state machine
    selectedCtrcsList.forEach((c) => {
      onAssignCtre(c.id, selectedVehicleId);
    });

    // Consolidate and switch to checklist finalization screen
    onConsolidateRomaneio(selectedVehicleId, selectedCtrcsList);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden select-none">
      {/* Page Header Area */}
      <div className="p-margin-desktop pb-4 flex flex-col md:flex-row md:items-end justify-between border-b border-outline-variant bg-surface shrink-0 gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Roteirização</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
            Compare e vincule CTRCs disponíveis para otimizar os manifestos físicos de frota.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {/* Component Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filtrar por CTRC, Destinatário, NF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 font-sans text-xs text-on-surface focus:outline-none focus:border-primary placeholder-on-surface-variant/60 w-52 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-outline-variant text-[18px]">filter_list</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 font-sans text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer hover:border-outline transition-colors"
            >
              <option value="all">Setor: Todos</option>
              <option value="ROTA 02">ROTA 02</option>
              <option value="ROTA 99">ROTA 99</option>
            </select>
          </div>

          <div className="flex items-center gap-3 border-l border-outline-variant pl-4">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase text-xs">Status:</span>
            <span className="bg-tertiary-container/20 text-tertiary font-bold font-sans text-[11px] px-3 py-1 rounded-full border border-tertiary/30">
              System Active
            </span>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-tertiary-container text-on-tertiary-container border border-tertiary/30 rounded-xl px-4 py-2.5 shadow-2xl text-xs font-bold font-sans flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {toastMessage}
        </div>
      )}

      {/* High Density Excel-Style Data Table Panel */}
      <div className="flex-1 overflow-auto bg-surface relative">
        <table className="w-full text-left border-collapse whitespace-nowrap text-xs font-sans">
          <thead className="bg-surface-container-high sticky top-0 z-20 shadow-sm border-b-2 border-outline">
            <tr className="text-[11px] text-on-surface font-semibold uppercase tracking-wider">
              <th className="p-2 border border-outline-variant w-10 text-center bg-surface-container-high sticky left-0 z-30">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-surface cursor-pointer w-4 h-4"
                />
              </th>
              <th className="p-2.5 border border-outline-variant">UNID</th>
              <th className="p-2.5 border border-outline-variant">CTRC</th>
              <th className="p-2.5 border border-outline-variant">CIDADE_ENT</th>
              <th className="p-2.5 border border-outline-variant">SETOR</th>
              <th className="p-2.5 border border-outline-variant">PREV_ENT</th>
              <th className="p-2.5 border border-outline-variant">PAGADOR</th>
              <th className="p-2.5 border border-outline-variant">REMETENTE</th>
              <th className="p-2.5 border border-outline-variant">DESTINATARIO</th>
              <th className="p-2.5 border border-outline-variant">COD</th>
              <th className="p-2.5 border border-outline-variant">OCORRENCIA</th>
              <th className="p-2.5 border border-outline-variant">DESCRICAO</th>
              <th className="p-2.5 border border-outline-variant">DATA_OCORRENCIA</th>
              <th className="p-2.5 border border-outline-variant">NF</th>
              <th className="p-2.5 border border-outline-variant text-right font-semibold">VALOR (R$)</th>
              <th className="p-2.5 border border-outline-variant text-right font-semibold">FRETE (R$)</th>
              <th className="p-2.5 border border-outline-variant text-right">QT_VOL</th>
              <th className="p-2.5 border border-outline-variant text-right">PESO_R (kg)</th>
              <th className="p-2.5 border border-outline-variant">DISPONIBILIDADE</th>
              <th className="p-2.5 border border-outline-variant">LOCALIZAÇÃO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant text-on-surface-variant font-medium text-[11px]">
            {filteredCtrcs.map((ctrc) => {
              const checked = selectedIds.includes(ctrc.id);
              
              // Status formatting map
              let statusStyle = 'text-tertiary';
              if (ctrc.status === 'Em Rota') statusStyle = 'text-primary font-bold';
              else if (ctrc.status === 'Transferência') statusStyle = 'text-on-surface';
              else if (ctrc.status === 'Agendamento') statusStyle = 'text-secondary font-bold';

              // Sector formatting map
              const isSpecialSector = ctrc.setor === 'ROTA 99';
              const sectorStyle = isSpecialSector
                ? 'text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded'
                : 'text-on-surface';

              // Delivery Alert Condition (Mockup highlights past row 6 key dates in red)
              const isUrgentDate = ctrc.id === 'VAG998877-1';

              // Fallbacks & derived properties to match columns
              const unidVal = ctrc.unid || ctrc.id.split(/[0-9]/)[0] || 'SPO';
              const pagadorVal = ctrc.pagador || `${ctrc.remetente} (CIF)`;
              const codVal = ctrc.cod || `C-${ctrc.id.slice(-6)}`;
              const descricaoOcorrVal = ctrc.descricao_ocorr || 'CONFERIDO E PROCESSADO';
              const dataOcorrenciaVal = ctrc.data_ocorrencia || ctrc.data_ocorr || '22/05/2026';
              const pesoReal = ctrc.peso_r || ctrc.weight;
              const obsVal = ctrc.obs || 'Nenhuma';
              const dispVal = ctrc.disponibilidade || ctrc.status.toUpperCase();
              const locVal = ctrc.localizacao || 'PRÉDIO A / GAIOLA 02';

              return (
                <tr
                  key={ctrc.id}
                  onClick={() => handleToggleRow(ctrc.id)}
                  className={`hover:bg-surface-container transition-colors group cursor-pointer ${
                    checked ? 'bg-surface-container-highest/60' : 'bg-surface'
                  }`}
                >
                  {/* Row Checkbox Column */}
                  <td
                    className="p-1.5 border border-outline-variant text-center sticky left-0 bg-surface group-hover:bg-surface-container z-10"
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
                  <td className="p-1.5 border border-outline-variant font-bold text-on-surface">
                    {unidVal}
                  </td>

                  {/* CTRC Invoice ID */}
                  <td className="p-1.5 border border-outline-variant font-mono text-primary font-bold">
                    {ctrc.id}
                  </td>

                  {/* Delivery City */}
                  <td className="p-1.5 border border-outline-variant text-on-surface uppercase">
                    {ctrc.cidade_ent || ctrc.cidade.split(',')[0].toUpperCase()}
                  </td>

                  {/* Sector */}
                  <td className="p-1.5 border border-outline-variant">
                    <span className={sectorStyle}>{ctrc.setor || 'ROTA 02'}</span>
                  </td>

                  {/* Estimated Delivery Date */}
                  <td className={`p-1.5 border border-outline-variant ${
                    isUrgentDate ? 'text-error bg-error-container/10 font-bold px-2 py-0.5 rounded' : 'text-tertiary'
                  }`}>
                    {ctrc.prev_ent || '25/05/2026'}
                  </td>

                  {/* PAGADOR */}
                  <td className="p-1.5 border border-outline-variant truncate max-w-[150px] text-on-surface-variant" title={pagadorVal}>
                    {pagadorVal}
                  </td>

                  {/* Sender Name */}
                  <td className="p-1.5 border border-outline-variant truncate max-w-[150px] text-on-surface-variant" title={ctrc.remetente}>
                    {ctrc.remetente || 'REMETENTE BRASIL'}
                  </td>

                  {/* Recipient Name */}
                  <td className="p-1.5 border border-outline-variant truncate max-w-[150px] text-on-surface font-semibold" title={ctrc.destinatario}>
                    {ctrc.destinatario}
                  </td>

                  {/* COD */}
                  <td className="p-1.5 border border-outline-variant font-mono text-on-surface-variant">
                    {codVal}
                  </td>

                  {/* Occurrence code Text */}
                  <td className="p-1.5 border border-outline-variant font-mono text-on-surface-variant">
                    {ctrc.ocorrencia || '57 CONFE OK'}
                  </td>

                  {/* DESCRICAO OCORRENCIA */}
                  <td className="p-1.5 border border-outline-variant uppercase text-on-surface-variant select-all truncate max-w-[180px]" title={descricaoOcorrVal}>
                    {descricaoOcorrVal}
                  </td>

                  {/* Occurence Date */}
                  <td className="p-1.5 border border-outline-variant tabular-nums text-on-surface-variant">
                    {dataOcorrenciaVal}
                  </td>

                  {/* Invoice Code */}
                  <td className="p-1.5 border border-outline-variant font-mono font-bold text-on-surface">
                    {ctrc.nf || '174795'}
                  </td>

                  {/* Value (R$) */}
                  <td className="p-1.5 border border-outline-variant text-right font-mono text-on-surface font-semibold">
                    {(ctrc.valor || 1250.0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Freight Cost */}
                  <td className="p-1.5 border border-outline-variant text-right font-mono text-on-surface-variant">
                    {(ctrc.frete || 120.0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Quantity Volumes */}
                  <td className="p-1.5 border border-outline-variant text-right font-mono font-bold text-on-surface">
                    {ctrc.volume}
                  </td>

                  {/* Weight kg - PESO_R */}
                  <td className="p-1.5 border border-outline-variant text-right font-mono text-tertiary font-bold">
                    {pesoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  {/* DISPONIBILIDADE */}
                  <td className={`p-1.5 border border-outline-variant ${statusStyle} uppercase font-bold text-[10px]`}>
                    {dispVal}
                  </td>

                  {/* LOCALIZAÇÃO */}
                  <td className="p-1.5 border border-outline-variant text-tertiary font-medium">
                    {locVal}
                  </td>
                </tr>
              );
            })}

            {filteredCtrcs.length === 0 && (
              <tr>
                <td colSpan={20} className="text-center py-20 text-on-surface-variant bg-surface">
                  <span className="material-symbols-outlined text-[42px] mb-2 text-on-surface-variant/30 block">
                    error
                  </span>
                  <p className="text-sm font-bold">Nenhum Conhecimento (CTRC) correspondente.</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1">
                    Remova filtros ou digite outro termo de busca.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom Action Bar with calculations of chosen rows */}
      <div className="bg-surface border-t border-outline-variant p-4 flex flex-col sm:flex-row justify-between items-center z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.3)] gap-4 shrink-0">
        <div className="flex items-center gap-6 flex-wrap justify-between sm:justify-start w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {selectedIds.length > 0 ? 'check_box' : 'check_box_outline_blank'}
            </span>
            <span className="font-sans text-xs text-on-surface">
              <span className="font-bold">{selectedIds.length}</span> selecionados
            </span>
          </div>

          <div className="h-6 w-px bg-outline-variant/60 hidden sm:block"></div>

          <div className="flex gap-6 font-sans text-xs flex-wrap">
            <div>
              <span className="text-on-surface-variant mr-1.5">Peso total:</span>
              <span className="text-on-surface font-mono font-bold">
                {totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Volumes:</span>
              <span className="text-on-surface font-mono font-bold">
                {totalVolume}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant mr-1.5">Valor total:</span>
              <span className="text-on-surface font-mono font-bold text-primary">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Action button grouping */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Active vehicle badge display */}
          <div className="hidden lg:flex flex-col items-end text-right leading-tight pr-1 font-sans">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Veículo Atribuído</span>
            <span className="text-xs text-tertiary font-bold font-mono uppercase">
              {selectedVehicle ? `${selectedVehicle.id} • ${selectedVehicle.driverName}` : 'Nenhum'}
            </span>
          </div>

          <button
            onClick={handleClearSelection}
            disabled={selectedIds.length === 0}
            className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-colors font-sans ${
              selectedIds.length === 0
                ? 'border-outline-variant/35 text-on-surface-variant/40 cursor-not-allowed'
                : 'border-outline-variant text-on-surface hover:bg-surface-bright'
            }`}
          >
            Limpar Seleção
          </button>

          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-surface-container-high text-primary hover:bg-surface-container-highest border border-primary/20 transition-colors text-xs font-bold font-sans flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">directions_car</span>
            Mudar Veículo
          </button>

          <button
            onClick={handleGenerateManifest}
            disabled={selectedIds.length === 0}
            className={`px-6 py-2 rounded-lg text-xs font-bold font-sans transition-all duration-200 flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.98] ${
              selectedIds.length === 0
                ? 'bg-outline-variant/30 text-on-surface-variant/40 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-fixed text-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              assignment_add
            </span>
            Gerar Manifesto
          </button>
        </div>
      </div>

      {/* Floating Audit Log Log Info Panel */}
      <div className="absolute bottom-20 right-4 bg-surface-container/90 backdrop-blur border border-outline-variant px-3 py-2 rounded-xl z-30 pointer-events-none hidden sm:block shadow-xl">
        <p className="font-sans text-[10px] text-on-surface-variant flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-[14px]">history</span>
          Last updated by System Admin • Today, 14:32
        </p>
      </div>

      {/* Premium Dark Vehicle Selector Overlay Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#171f33] border border-outline-variant rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-on-surface animate-fade-in text-left">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-[#131b2e]">
              <div>
                <h3 className="font-bold font-sans text-sm text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">local_shipping</span>
                  Atribuição de Frota
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Selecione o veículo destinatário para consolidar as CTRCs marcadas
                </p>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-on-surface-variant hover:text-white p-1 rounded-full hover:bg-surface-bright/70 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[300px] space-y-2.5">
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
                        <span className="font-mono font-bold text-xs uppercase">{v.id}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          v.status === 'Disponível'
                            ? 'bg-tertiary-container/20 text-tertiary'
                            : 'bg-primary/20 text-primary'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">
                        Motorista: <span className="font-bold text-on-surface">{v.driverName}</span>
                      </p>
                    </div>

                    <div className="text-right font-mono text-[10px] space-y-0.5">
                      <p className="font-bold text-on-surface">{v.capacity}</p>
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

            <div className="p-3 bg-surface-container border-t border-outline-variant flex justify-end">
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#dae2fd] hover:text-white hover:bg-surface-bright rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
