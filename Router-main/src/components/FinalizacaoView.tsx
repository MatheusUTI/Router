import { useState, useEffect } from 'react';
import { Ctrc, Vehicle, AppUser } from '../types';
import {
  Printer,
  ArrowLeft,
  ClipboardList,
  CheckSquare,
  Square,
  Truck,
  FileText,
  UserPlus,
  Info,
  Check,
  Search,
  Trash2,
  Eye,
  History,
  X,
  ChevronRight
} from 'lucide-react';

interface FinalizacaoViewProps {
  linkedCtrcs: Ctrc[];
  onUpdateCtrcStatus: (id: string, status: 'Pendente' | 'Entregue' | 'Recusado') => void;
  expenses: any[]; // Ignored but kept to prevent compilation errors
  onAddExpense: (exp: any) => void; // Ignored but kept to prevent compilation errors
  onRemoveExpense: (id: string) => void; // Ignored but kept to prevent compilation errors
  onCloseRomaneio: () => void;
  activeVehicle?: Vehicle;
  savedRomaneios?: any[];
  onSaveRomaneio?: (romaneio: any) => void;
  onDeleteRomaneio?: (id: string) => void;
  adminUser?: AppUser;
}

export default function FinalizacaoView({
  linkedCtrcs,
  onCloseRomaneio,
  activeVehicle,
  savedRomaneios = [],
  onSaveRomaneio,
  onDeleteRomaneio,
  adminUser,
}: FinalizacaoViewProps) {
  // Navigation tab state: 'active' (Current separation logic) or 'history' (Saved routes list & reprint)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>(() => {
    return linkedCtrcs.length > 0 ? 'active' : 'history';
  });

  // Search filter for historical routes
  const [historySearch, setHistorySearch] = useState<string>('');

  // Selected historical romaneio for detailed preview and reprint
  const [previewRomaneio, setPreviewRomaneio] = useState<any | null>(null);

  // Administrative checklist variables for active romaneio
  const [manifestId, setManifestId] = useState<string>(() => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  });
  const [manifestDate, setManifestDate] = useState<string>(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = String(today.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  });
  const [helperName, setHelperName] = useState<string>('CARLOS DE SOUZA (CONFERENTE)');
  const [observations, setObservations] = useState<string>('');

  // Local state to track checked items on screen for current active romaneio
  const [separatedIds, setSeparatedIds] = useState<string[]>([]);
  // Local state to track checked items status inside the previewed historical sheet
  const [previewSeparatedIds, setPreviewSeparatedIds] = useState<string[]>([]);

  // Reset checked array when new active cargo links in
  useEffect(() => {
    setSeparatedIds([]);
  }, [linkedCtrcs]);

  // Sync separated ids for preview item if opened
  useEffect(() => {
    if (previewRomaneio) {
      setPreviewSeparatedIds(previewRomaneio.ctrcs.map((c: any) => c.id));
    }
  }, [previewRomaneio]);

  // Track toast response
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle checklist status
  const toggleSeparated = (id: string) => {
    setSeparatedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllSeparated = () => {
    if (separatedIds.length === linkedCtrcs.length) {
      setSeparatedIds([]);
    } else {
      setSeparatedIds(linkedCtrcs.map((c) => c.id));
    }
  };

  // Toggle checklist status in historical preview
  const togglePreviewSeparated = (id: string) => {
    setPreviewSeparatedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllPreviewSeparated = (cnt: number, ids: string[]) => {
    if (previewSeparatedIds.length === cnt) {
      setPreviewSeparatedIds([]);
    } else {
      setPreviewSeparatedIds(ids);
    }
  };

  // Action: Save romaneio to permanent state and finish
  const handleSaveAndConfirm = () => {
    if (!onSaveRomaneio) return;

    const newRom = {
      id: manifestId,
      date: manifestDate,
      vehicleId: activeVehicle?.id || 'RUE3B11',
      vehiclePlate: activeVehicle?.id || 'RUE3B11',
      driverName: activeVehicle?.driverName || 'HIAN THAYRON SOARES DE OLIVEIRA',
      helperName: helperName,
      ctrcs: [...linkedCtrcs],
      observations: observations,
      createdAt: new Date().toISOString()
    };

    onSaveRomaneio(newRom);
    triggerToast(`Romaneio #${manifestId} salvo com sucesso no histórico de rotas.`);
    
    // Clear the active drafting board
    onCloseRomaneio();

    // Reset default form inputs
    setManifestId(Math.floor(1000 + Math.random() * 9000).toString());
    setObservations('');

    // Divert focus automatically to history to reprint or review
    setActiveTab('history');
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe deletion helper for history
  const handleDeleteFromHistory = (id: string) => {
    if (confirm(`Tem certeza que deseja excluir o Romaneio #${id} permanentemente do histórico de separação?`)) {
      if (onDeleteRomaneio) {
        onDeleteRomaneio(id);
        triggerToast(`Romaneio #${id} removido do histórico.`);
        if (previewRomaneio?.id === id) {
          setPreviewRomaneio(null);
        }
      }
    }
  };

  // Total calculations for current draft
  const totalCtrcs = linkedCtrcs.length;
  const totalVolumes = linkedCtrcs.reduce((acc, c) => acc + (c.volume || 0), 0);
  const totalWeight = linkedCtrcs.reduce((acc, c) => acc + (c.peso_r || c.weight || 0), 0);

  // Filter historical saved routes by search token and active unit
  const filteredHistory = savedRomaneios.filter((rom) => {
    // 1. UNID Access Enforcement in history list
    if (adminUser && !adminUser.is_master) {
      const userUnid = (adminUser.unid || 'SPO').toUpperCase();
      const hasUnitCargos = !rom.ctrcs || rom.ctrcs.length === 0 || rom.ctrcs.some((c: Ctrc) => {
        const ctrcUnid = (c.unid || c.id.split(/[0-9]/)[0] || 'SPO').toUpperCase();
        return ctrcUnid === userUnid;
      });
      if (!hasUnitCargos) return false;
    }

    const term = historySearch.toLowerCase().trim();
    if (!term) return true;

    // Search by basic header metadata
    const matchesHeader = 
      rom.id.toLowerCase().includes(term) ||
      rom.vehiclePlate.toLowerCase().includes(term) ||
      rom.driverName.toLowerCase().includes(term) ||
      (rom.helperName && rom.helperName.toLowerCase().includes(term)) ||
      (rom.observations && rom.observations.toLowerCase().includes(term));

    // Recursive search into embedded routed CTRCs
    const matchesCtrcs = rom.ctrcs && rom.ctrcs.some((c: Ctrc) => 
      c.id.toLowerCase().includes(term) ||
      c.destinatario.toLowerCase().includes(term) ||
      c.cidade.toLowerCase().includes(term) ||
      (c.setor && c.setor.toLowerCase().includes(term)) ||
      (c.remetente && c.remetente.toLowerCase().includes(term))
    );

    return matchesHeader || matchesCtrcs;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Stylesheet injector for full physical desk print configurations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Enforce pure paper look & solid contrast */
          body, html, #root, main {
            background: white !important;
            color: #111827 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Wipe ambient overlays and navigational indicators */
          .no-print, header, nav, aside, button, .sidebar, .top-bar, .tab-bar {
            display: none !important;
          }

          /* Stretch matching elements to max page size */
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #111827 !important;
            display: block !important;
          }

          /* Force precise gray borders */
          .print-text-dark {
            color: #111827 !important;
          }
          .print-border {
            border-color: #7f8c8d !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
        }
      `}} />

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 bg-slate-900 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 max-w-sm animate-fade-in no-print">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs font-semibold leading-tight">{toastMessage}</p>
        </div>
      )}

      {/* Screen Title & Dual Navigation Mode Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/60 pb-5 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-primary w-6 h-6 animate-pulse-slow" />
            <span className="text-3xl font-bold text-on-surface tracking-tight">Romaneios de Expedição</span>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Geração de listas de separação para expedição em doca e controle de rotas de transporte consolidadas.
          </p>
        </div>

        {/* Action Toggle Switch */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/40 self-stretch md:self-auto tab-bar">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Separação Corrente
            {linkedCtrcs.length > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono animate-bounce">
                {linkedCtrcs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setPreviewRomaneio(null); // Clear preview when shifting back
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Rotas Prontas ({savedRomaneios.length})
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CASE 1: ACTIVE SEPARATION DRAFTING BOARD */}
      {/* ========================================================= */}
      {activeTab === 'active' && (
        linkedCtrcs.length === 0 ? (
          <div className="text-center py-20 bg-surface-container rounded-xl border border-dashed border-outline-variant no-print max-w-2xl mx-auto">
            <ClipboardList className="w-12 h-12 mx-auto text-on-surface-variant/40 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Nenhum Romaneio Ativo Sendo Roteirizado</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              Vá até o painel de <b>Roteirização</b>, atribua os CTRCs importados a uma placa e clique em "Consolidar Romaneio" para gerar sua lista de coleta física.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={onCloseRomaneio}
                className="px-4 py-2 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Painel Roteirização
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Ver Rotas Prontas
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Input Form Column (Left) */}
            <div className="lg:col-span-4 space-y-5 no-print">
              <div className="bg-surface-container border border-outline-variant p-5 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Truck className="w-4 h-4 text-primary" />
                  Dados do Loteamento
                </h3>

                <div className="space-y-4 text-xs text-left">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant font-bold mb-1 uppercase tracking-wide">ID do Manifesto</label>
                    <input
                      type="text"
                      value={manifestId}
                      onChange={(e) => setManifestId(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-on-surface-variant font-bold mb-1 uppercase tracking-wide">Data de Expedição</label>
                    <input
                      type="text"
                      value={manifestDate}
                      onChange={(e) => setManifestDate(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-on-surface-variant font-bold mb-1 uppercase tracking-wide flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-on-surface-variant" />
                      Ajudante / Conferente de Doca
                    </label>
                    <input
                      type="text"
                      value={helperName}
                      onChange={(e) => setHelperName(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="pt-2 border-t border-outline-variant/30">
                    <span className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">Motorista Vinculado</span>
                    <div className="bg-surface px-3 py-2 border border-outline-variant rounded-lg font-semibold text-white">
                      {activeVehicle?.driverName || "HIAN THAYRON SOARES DE OLIVEIRA"}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">Veículo Placa</span>
                    <div className="bg-surface px-3 py-1.5 border border-outline-variant rounded-lg font-mono font-bold text-primary uppercase text-sm">
                      {activeVehicle?.id || "RUE3B11"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doca Stats Card */}
              <div className="bg-[#12192a] border border-[#22304d] p-4 rounded-xl space-y-3.5">
                <span className="block text-[11px] font-mono font-bold text-[#9cb4e4] uppercase tracking-wider">
                  Status de Separação de Doca
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface p-2 rounded-lg border border-outline-variant/40">
                    <span className="block text-[9px] text-on-surface-variant">CTRCs</span>
                    <span className="text-xs font-bold text-white font-mono">{totalCtrcs}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-outline-variant/40">
                    <span className="block text-[9px] text-on-surface-variant">Volumes</span>
                    <span className="text-xs font-bold text-sky-300 font-mono">{totalVolumes}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-outline-variant/40">
                    <span className="block text-[9px] text-on-surface-variant">Peso Total</span>
                    <span className="text-[10px] font-bold text-amber-200 font-mono leading-none block pt-1">{totalWeight.toLocaleString('pt-BR')} kg</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1 text-xs text-left">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant text-[10px]">Conferidos:</span>
                    <span className="font-mono font-bold text-emerald-400 text-[10px]">
                      {separatedIds.length} / {linkedCtrcs.length} ({Math.round((separatedIds.length / linkedCtrcs.length) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(separatedIds.length / linkedCtrcs.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Form: Observações de Viagem */}
              <div className="bg-surface-container border border-outline-variant p-4 rounded-xl text-left space-y-2">
                <label className="block text-[11px] text-on-surface-variant font-bold uppercase font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-secondary" />
                  Ressalvas de Coleta
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2 h-20 text-xs text-on-surface italic focus:outline-none focus:border-primary resize-none"
                  placeholder="Instruções especiais da mercadoria ou observações de manuseamento..."
                />
              </div>

              {/* Action Board Conclusion */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSaveAndConfirm}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Salvar nos Romaneios Prontos
                </button>

                <button
                  onClick={handlePrint}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-705 border border-outline-variant text-[#dae2fd] hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Folha Corrente
                </button>
              </div>
            </div>

            {/* Checklist Column (Right) */}
            <div className="lg:col-span-8 space-y-4 print-area text-left bg-white text-gray-900 rounded-xl p-5 border border-outline-variant/30 print:border-none shadow-xl print:shadow-none">
              
              {/* Document Header */}
              <div className="border-b-2 border-gray-300 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 print-text-dark">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-bold text-gray-800 leading-tight">Checklist de Separação Física</h2>
                  <p className="text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wide">
                    CONTROLE INTERNO DE DOCA DE EMBARQUE
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-gray-800 text-sm">Manifesto #{manifestId}</div>
                  <div className="text-[11px] text-gray-500 font-mono font-semibold">Emissão: {manifestDate}</div>
                </div>
              </div>

              {/* Heavy Duty Parameters Overview */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-250 mb-4 text-[11px] text-gray-700 print-border">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Placa Carreta</span>
                  <span className="font-mono font-bold text-gray-900 text-xs">{activeVehicle?.id || "RUE3B11"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Motorista</span>
                  <span className="font-bold text-gray-900 text-xs">{activeVehicle?.driverName || "HIAN THAYRON SOARES DE OLIVEIRA"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Separador</span>
                  <span className="font-bold text-gray-900 text-xs truncate block">{helperName || "-"}</span>
                </div>
              </div>

              {/* Table Body Column structure */}
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-2 px-1 no-print">
                <button
                  onClick={toggleAllSeparated}
                  className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer text-[10px]"
                >
                  {separatedIds.length === linkedCtrcs.length ? (
                    <><CheckSquare className="w-4 h-4 text-emerald-600" /> Desmarcar Todos</>
                  ) : (
                    <><Square className="w-4 h-4" /> Selecionar Todos ({linkedCtrcs.length})</>
                  )}
                </button>
                <span>Cargas Roteirizadas</span>
              </div>

              {/* Printable Table column names */}
              <div className="border-b border-gray-300 bg-gray-150 p-2 hidden print:flex font-bold text-gray-700 text-[9px] uppercase tracking-wider print-border">
                <div className="w-[10%] text-center">Sim</div>
                <div className="w-[20%] font-mono">CTRC ID</div>
                <div className="w-[35%]">Destinatário</div>
                <div className="w-[20%]">Destino / Cidade</div>
                <div className="w-[15%] text-right font-mono">Volumes</div>
              </div>

              {/* The high density checker queue loop */}
              <div className="divide-y divide-gray-200 border-b border-gray-250 print-border">
                {linkedCtrcs.map((ctrc, idx) => {
                  const checked = separatedIds.includes(ctrc.id);
                  return (
                    <div
                      key={ctrc.id || idx}
                      className={`flex flex-col sm:flex-row items-start sm:items-center py-2.5 px-1 ${
                        checked ? 'bg-emerald-50/15 sm:bg-emerald-50/10' : 'hover:bg-gray-50/70'
                      }`}
                    >
                      {/* Check mark toggle column */}
                      <div className="w-full sm:w-[10%] flex items-center justify-between sm:justify-center mb-1 sm:mb-0">
                        <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden uppercase">SELECIONADO:</span>
                        <button
                          onClick={() => toggleSeparated(ctrc.id)}
                          className="w-4.5 h-4.5 border border-gray-400 rounded bg-white flex items-center justify-center shrink-0 cursor-pointer text-blue-600 focus:outline-none"
                        >
                          {checked && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />}
                        </button>
                      </div>

                      {/* Code identifier */}
                      <div className="w-full sm:w-[20%] font-mono text-gray-700 font-bold text-xs">
                        <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">CTRC:</span>
                        {ctrc.id}
                      </div>

                      {/* Consignee */}
                      <div className="w-full sm:w-[35%] select-text">
                        <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">DESTINATÁRIO:</span>
                        <div className="font-bold text-gray-900 text-xs leading-tight truncate">{ctrc.destinatario}</div>
                        {ctrc.remetente && (
                          <div className="text-[9px] text-gray-500 mt-0.5">Remetente: {ctrc.remetente}</div>
                        )}
                      </div>

                      {/* City Zone */}
                      <div className="w-full sm:w-[20%] text-gray-650 text-xs">
                        <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">CIDADE DESTINO:</span>
                        <div className="font-semibold text-gray-800">{ctrc.cidade_ent || ctrc.cidade}</div>
                        {ctrc.setor && (
                          <div className="text-[9px] text-gray-500">Setor: {ctrc.setor}</div>
                        )}
                      </div>

                      {/* Vol qty */}
                      <div className="w-full sm:w-[15%] text-left sm:text-right font-bold text-xs text-gray-800 font-mono">
                        <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">VOLUMES:</span>
                        {ctrc.volume} vol.
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desk confirmation parameters */}
              <div className="pt-8 mt-12 border-t border-gray-200 grid grid-cols-2 gap-6 text-[11px] font-bold text-gray-500 text-center">
                <div>
                  <div className="border-b border-gray-450 h-5 mb-1 mx-4"></div>
                  <span>Visto Conferente de Separador</span>
                </div>
                <div>
                  <div className="border-b border-gray-450 h-5 mb-1 mx-4"></div>
                  <span>Visto Motorista Transportador</span>
                </div>
              </div>
            </div>

          </div>
        )
      )}

      {/* ========================================================= */}
      {/* CASE 2: SAVED ROUTE LIBRARY / VERIFICATION & REPRINT */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        !previewRomaneio ? (
          /* General History List View */
          <div className="space-y-5 text-left no-print">
            <div className="bg-surface-container border border-outline-variant p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 o-4 text-on-surface-variant/60" />
                <input
                  type="text"
                  placeholder="Buscar por placa, motorista, ajudante, CTRC ou destinatário..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="text-right text-xs text-on-surface-variant shrink-0 font-medium">
                Filtrados: <b>{filteredHistory.length}</b> de <b>{savedRomaneios.length}</b> romaneios expedidos
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-24 bg-surface-container/60 rounded-xl border border-dashed border-outline-variant/60">
                <History className="w-10 h-10 mx-auto text-on-surface-variant/30 mb-2" />
                <h4 className="text-sm font-semibold text-white">Nenhum Romaneio Encontrado</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                  Não existem roteirizações arquivadas que correspondam à sua busca por <b>"{historySearch}"</b>.
                </p>
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((rom, rIdx) => {
                  const hVolumes = rom.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                  const hWeight = rom.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);

                  return (
                    <div
                      key={rom.id || rIdx}
                      className="bg-surface-container border border-outline-variant/70 hover:border-outline-variant p-4 rounded-xl flex flex-col justify-between gap-4 transition-all duration-200"
                    >
                      {/* Romaneio Header information banner */}
                      <div className="flex justify-between items-start gap-2 text-left">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase rounded font-mono">
                              Manifesto #{rom.id}
                            </span>
                            <span className="text-xs text-on-surface-variant font-medium font-mono">
                              ({rom.date})
                            </span>
                          </div>

                          <div className="font-mono text-base font-bold text-white uppercase flex items-center gap-1">
                            <Truck className="w-4 h-4 text-primary shrink-0" />
                            {rom.vehiclePlate}
                          </div>
                          
                          <div className="text-xs text-on-surface-variant">
                            <span className="font-bold text-white">Mot:</span> {rom.driverName}
                          </div>
                          
                          {rom.helperName && (
                            <div className="text-xs text-on-surface-variant/80">
                              <span className="font-bold text-white/80">Conf:</span> {rom.helperName}
                            </div>
                          )}
                        </div>

                        {/* Totals side panel indicator */}
                        <div className="text-right space-y-1">
                          <div className="bg-[#12192a] border border-[#22304d] px-2.5 py-1.5 rounded-lg text-center space-y-0.5 shrink-0">
                            <span className="block text-[8px] text-on-surface-variant font-semibold uppercase leading-none">CTRCs</span>
                            <span className="block text-xs font-bold text-sky-400 font-mono leading-none">{rom.ctrcs.length}</span>
                          </div>
                          
                          <span className="text-[10px] text-on-surface-variant bg-slate-900 border border-outline-variant/30 px-1.5 py-0.5 rounded font-mono font-bold block text-center">
                            {hWeight.toLocaleString('pt-BR')} kg
                          </span>
                        </div>
                      </div>

                      {/* Nested listed CTRCs Quick Peek */}
                      <div className="bg-surface/60 rounded-lg p-2.5 border border-outline-variant/30 text-[11px] space-y-1 max-h-[105px] overflow-y-auto block text-left">
                        <span className="text-[9px] text-on-surface-variant font-mono font-bold uppercase block pb-1 border-b border-outline-variant/20 tracking-wider">
                          Mercadorias Despachadas ({hVolumes} vol.)
                        </span>
                        {rom.ctrcs.map((c: any, cI: number) => (
                          <div key={cI} className="flex justify-between items-center text-on-surface-variant gap-2 leading-tight">
                            <span className="font-mono font-bold text-white shrink-0">{c.id}</span>
                            <span className="truncate flex-1 text-right">{c.destinatario}</span>
                          </div>
                        ))}
                      </div>

                      {rom.observations && (
                        <p className="text-[11px] text-on-surface-variant/80 bg-primary/5 border border-primary/10 p-2 rounded-lg italic line-clamp-2 text-left shrink-0">
                          "{rom.observations}"
                        </p>
                      )}

                      {/* Actions footer bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30">
                        <button
                          onClick={() => setPreviewRomaneio(rom)}
                          className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/20 hover:text-white border border-primary/30 text-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver & Re-imprimir
                        </button>

                        <button
                          onClick={() => handleDeleteFromHistory(rom.id)}
                          className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Excluir Romaneio Permanente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
            /* Historical Romaneio Expanded Preview Zone */
            <div className="space-y-6">
              
              {/* Back to library navigation header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print bg-surface-container border border-outline-variant p-4 rounded-xl text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 bg-slate-900 border border-outline-variant/50 px-2.5 py-0.5 rounded text-[10px] w-fit text-on-surface-variant font-bold uppercase font-mono">
                    Verificando Registro Histórico
                  </div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1">
                    Visualização do Romaneio e Coleta #{previewRomaneio.id}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Placa do Veículo: <b className="font-mono text-primary uppercase">{previewRomaneio.vehiclePlate}</b> ({previewRomaneio.date}) | Conferente de Doca: <b>{previewRomaneio.helperName || 'Mestre'}</b>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={() => setPreviewRomaneio(null)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#dae2fd] text-xs font-bold rounded-lg border border-outline-variant/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Histórico
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
                  >
                    <Printer className="w-4 h-4" />
                    Re-imprimir A4
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Embedded details controller pane (no-print) */}
                <div className="lg:col-span-4 space-y-4 no-print text-left">
                  <div className="bg-surface-container border border-outline-variant p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Truck className="w-4 h-4 text-primary" />
                      Manifestação de Carga
                    </h4>

                    <div className="space-y-4.5 text-xs text-on-surface-variant font-medium leading-relaxed">
                      <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                        <span>Manifesto ID:</span>
                        <b className="font-mono text-white text-sm">#{previewRomaneio.id}</b>
                      </div>
                      
                      <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                        <span>Data Emissão:</span>
                        <b className="font-mono text-white">{previewRomaneio.date}</b>
                      </div>

                      <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                        <span>Veículo Placa:</span>
                        <b className="font-mono text-primary text-sm uppercase">{previewRomaneio.vehiclePlate}</b>
                      </div>

                      <div className="space-y-0.5 border-b border-outline-variant/20 pb-2">
                        <span className="block text-[10px] text-on-surface-variant/70">Motorista Vinculado:</span>
                        <b className="block text-white font-sans">{previewRomaneio.driverName}</b>
                      </div>

                      <div className="space-y-0.5 border-b border-outline-variant/20 pb-2">
                        <span className="block text-[10px] text-on-surface-variant/70">Ajudante na Doca:</span>
                        <b className="block text-white font-sans">{previewRomaneio.helperName || "-"}</b>
                      </div>

                      {previewRomaneio.observations && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-on-surface-variant/70">Anotações da Viagem:</span>
                          <span className="block bg-surface p-2.5 border border-outline-variant/40 text-on-surface italic rounded-lg text-[11px]">
                            "{previewRomaneio.observations}"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-outline-variant p-4 rounded-xl text-left space-y-2">
                    <h5 className="text-[10px] font-bold text-[#dae2fd] uppercase tracking-wider font-mono">Ajuda Operacional</h5>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Ao re-imprimir a separação de um romaneio finalizado, toda a formatação de tabelas é adaptada estritamente para folhas A4 em preto e branco.
                    </p>
                  </div>
                </div>

                {/* Checklist Layout (printable print-area) */}
                <div className="lg:col-span-8 space-y-4 print-area text-left bg-white text-gray-900 rounded-xl p-5 sm:p-7 border border-outline-variant/30 print:border-none shadow-xl print:shadow-none">
                  
                  {/* Document Header */}
                  <div className="border-b-2 border-gray-300 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 print-text-dark">
                    <div className="space-y-0.5">
                      <h2 className="text-xl font-bold text-gray-800 leading-tight">Visto de Conferência Fiscal e Separação</h2>
                      <p className="text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wide">
                        REGISTRO DE EXPEDIÇÃO HISTÓRICA E RECONFERÊNCIA
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-gray-850 text-sm">Manifesto #{previewRomaneio.id}</div>
                      <div className="text-[10.5px] text-gray-500 font-mono font-semibold">Emissão: {previewRomaneio.date}</div>
                    </div>
                  </div>

                  {/* Driver parameters */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-250 mb-4 text-[11px] text-gray-700 print-border">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Placa Carreta</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{previewRomaneio.vehiclePlate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Motorista</span>
                      <span className="font-bold text-gray-900 text-xs">{previewRomaneio.driverName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block mb-0.5">Separador d`Carga</span>
                      <span className="font-bold text-gray-900 text-xs truncate block">{previewRomaneio.helperName || "-"}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-2 px-1 no-print">
                    <button
                      onClick={() => toggleAllPreviewSeparated(previewRomaneio.ctrcs.length, previewRomaneio.ctrcs.map((c: any) => c.id))}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer text-[10px]"
                    >
                      {previewSeparatedIds.length === previewRomaneio.ctrcs.length ? (
                        <><CheckSquare className="w-4 h-4 text-emerald-600" /> Desmarcar Todos</>
                      ) : (
                        <><Square className="w-4 h-4" /> Marcar Todos Como Separados ({previewRomaneio.ctrcs.length})</>
                      )}
                    </button>
                    <span>Cargas Expedidas</span>
                  </div>

                  {/* Printable table headers split */}
                  <div className="border-b border-gray-300 bg-gray-150 p-2 hidden print:flex font-bold text-gray-700 text-[9px] uppercase tracking-wider print-border">
                    <div className="w-[10%] text-center">Conferido</div>
                    <div className="w-[20%] font-mono">CTRC ID</div>
                    <div className="w-[35%]">Destinatário</div>
                    <div className="w-[20%]">Destino / Cidade</div>
                    <div className="w-[15%] text-right font-mono">Volumes</div>
                  </div>

                  {/* Dynamic checklist print output */}
                  <div className="divide-y divide-gray-200 border-b border-gray-250 print-border">
                    {previewRomaneio.ctrcs.map((ctrc: Ctrc, idx: number) => {
                      const checked = previewSeparatedIds.includes(ctrc.id);
                      return (
                        <div
                          key={ctrc.id || idx}
                          className={`flex flex-col sm:flex-row items-start sm:items-center py-2.5 px-1 ${
                            checked ? 'bg-emerald-50/15 sm:bg-emerald-50/10' : 'hover:bg-gray-50/70'
                          }`}
                        >
                          <div className="w-full sm:w-[10%] flex items-center justify-between sm:justify-center mb-1 sm:mb-0">
                            <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden uppercase">SELECIONADO:</span>
                            <button
                              onClick={() => togglePreviewSeparated(ctrc.id)}
                              className="w-4.5 h-4.5 border border-gray-400 rounded bg-white flex items-center justify-center shrink-0 cursor-pointer text-blue-600 focus:outline-none"
                            >
                              {checked && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />}
                            </button>
                          </div>

                          <div className="w-full sm:w-[20%] font-mono text-gray-700 font-bold text-xs">
                            <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">CTRC:</span>
                            {ctrc.id}
                          </div>

                          <div className="w-full sm:w-[35%] pointer-events-none select-text">
                            <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">DESTINATÁRIO:</span>
                            <div className="font-bold text-gray-900 text-xs leading-tight truncate">{ctrc.destinatario}</div>
                            {ctrc.remetente && (
                              <div className="text-[9px] text-gray-500 mt-0.5">Remetente: {ctrc.remetente}</div>
                            )}
                          </div>

                          <div className="w-full sm:w-[20%] text-gray-650 text-xs">
                            <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">CIDADE DESTINO:</span>
                            <div className="font-semibold text-gray-800">{ctrc.cidade_ent || ctrc.cidade}</div>
                            {ctrc.setor && (
                              <div className="text-[9px] text-gray-500">Setor: {ctrc.setor}</div>
                            )}
                          </div>

                          <div className="w-full sm:w-[15%] text-left sm:text-right font-bold text-xs text-gray-800 font-mono">
                            <span className="text-[8.5px] text-gray-400 font-bold font-mono tracking-wider sm:hidden block uppercase">VOLUMES:</span>
                            {ctrc.volume} vol.
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {previewRomaneio.observations && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-800 italic mt-3.5 print-border">
                      <span className="block text-[9px] text-gray-500 uppercase font-bold font-sans not-italic mb-1">Ressalvas de Coleta de Registro:</span>
                      "{previewRomaneio.observations}"
                    </div>
                  )}

                  {/* Verification guidelines */}
                  <div className="pt-8 mt-12 border-t border-gray-200 grid grid-cols-2 gap-6 text-[11px] font-bold text-gray-500 text-center">
                    <div>
                      <div className="border-b border-gray-450 h-5 mb-1 mx-4"></div>
                      <span>Assinatura Conferente de Doca</span>
                    </div>
                    <div>
                      <div className="border-b border-gray-450 h-5 mb-1 mx-4"></div>
                      <span>Assinatura Motorista Termo</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )
        )
      }
    </div>
  );
}
