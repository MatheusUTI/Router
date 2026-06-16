import { useState, useEffect } from 'react';
import { DEFAULT_OPERATIONAL_UNIT } from '../constants/operationalUnits';
import { Ctrc, Vehicle, AppUser, PreRomaneio } from '../types';
import { PreRomaneioRepository } from '../infrastructure/localdb/repositories/preRomaneioRepository';
import { CtrcRepository } from '../infrastructure/localdb/repositories/ctrcRepository';
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
  // Navigation tab state: 'programacao' (Programação do Dia), 'active' (Current separation logic), 'history' (Saved routes list & reprint) or 'preromaneio' (Pre-Romaneio listing)
  const [activeTab, setActiveTab] = useState<'programacao' | 'active' | 'history' | 'preromaneio'>('preromaneio');

  // Load initial tab from localStorage if specified (e.g., coming from generate pre-romaneio or consolidate)
  useEffect(() => {
    const saved = localStorage.getItem('finalizacao_initial_tab');
    if (saved === 'active' || saved === 'preromaneio' || saved === 'programacao' || saved === 'history') {
      setActiveTab(saved);
      localStorage.removeItem('finalizacao_initial_tab');
    }
  }, []);

  const isAgregadoVehicle = (vehiclePlate: string = '', driverName: string = '') => {
    const plateUpper = vehiclePlate.toUpperCase().replace(/\s/g, '');
    const driverUpper = driverName.toUpperCase();
    
    // Spec.md aggregate plates & drivers
    const aggregatePlates = ['BWZ4186', 'GUE3786', 'CSF5246', 'GQZ3157'];
    if (aggregatePlates.some(ap => plateUpper.includes(ap))) {
      return true;
    }
    
    if (plateUpper.includes('AGR') || driverUpper.includes('AGREGADO') || driverUpper.includes('AGR')) {
      return true;
    }
    
    return false;
  };

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

  const handlePrintPreRomaneio = (pr: PreRomaneio) => {
    setPrintPreRomaneios([pr]);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintAllPreRomaneios = () => {
    setPrintPreRomaneios([]);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const [preRomaneios, setPreRomaneios] = useState<PreRomaneio[]>([]);
  const [resolvedCtrcsMap, setResolvedCtrcsMap] = useState<Record<string, Ctrc>>({});
  const [loadingPreRomaneios, setLoadingPreRomaneios] = useState<boolean>(false);
  const [printPreRomaneios, setPrintPreRomaneios] = useState<PreRomaneio[]>([]);

  const convertManifestDateToPlanningDate = (mDate: string): string => {
    const parts = mDate.split('/');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      let year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
    return mDate;
  };

  const loadPreRomaneiosData = async () => {
    setLoadingPreRomaneios(true);
    try {
      const targetDate = convertManifestDateToPlanningDate(manifestDate);
      let prs = await PreRomaneioRepository.getByDate(targetDate);
      if (!prs || prs.length === 0) {
        prs = await PreRomaneioRepository.getAll();
      }
      
      const allCtrcIds = Array.from(new Set(prs.flatMap(p => p.ctrcIds || [])));
      if (allCtrcIds.length > 0) {
        const ctrcs = await CtrcRepository.getByIds(allCtrcIds);
        const map: Record<string, Ctrc> = {};
        ctrcs.forEach(c => {
          map[c.id] = c;
        });
        setResolvedCtrcsMap(map);
      }
      setPreRomaneios(prs);
    } catch (err) {
      console.error('Error loading Re-Romaneios/Pre-Romaneios:', err);
    } finally {
      setLoadingPreRomaneios(false);
    }
  };

  useEffect(() => {
    loadPreRomaneiosData();
  }, [manifestDate, activeTab]);

  const programacaoRows: any[] = [];

  // Filter and map preRomaneios that have either vehiclePlate or driverName filled
  const preRomaneiosToShip = preRomaneios.filter(
    (pr) => (pr.vehiclePlate && pr.vehiclePlate.trim() !== '') || (pr.driverName && pr.driverName.trim() !== '')
  );

  preRomaneiosToShip.forEach((pr) => {
    const matchingCtrcs = (pr.ctrcIds || [])
      .map((id) => resolvedCtrcsMap[id])
      .filter(Boolean);

    programacaoRows.push({
      id: pr.id,
      vehiclePlate: pr.vehiclePlate || 'S/P',
      driverName: pr.driverName || 'Não Informado',
      helperName: pr.helperName || 'Não Informado',
      ctrcs: matchingCtrcs,
      isDraft: false,
      observations: pr.observations || pr.notes || '',
      date: pr.planningDate,
      route: pr.route,
      gate: pr.gate
    });
  });

  const frotaRows = programacaoRows.filter(row => !isAgregadoVehicle(row.vehiclePlate, row.driverName));
  const agregadoRows = programacaoRows.filter(row => isAgregadoVehicle(row.vehiclePlate, row.driverName));

  const exportToExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #f3f4f6; border: 1px solid #d1d5db; font-weight: bold; padding: 8px; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 6px 8px; }
          .group-header { background-color: #e0e7ff; font-weight: bold; padding: 8px; }
          .footer-total { background-color: #f3f4f6; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>ROTA OPERATIONAL - PROGRAMAÇÃO DO DIA (${manifestDate})</h2>
        <table>
          <thead>
            <tr>
              <th>PLACA</th>
              <th>MOTORISTA</th>
              <th>AJUDANTE</th>
              <th>SETOR</th>
              <th>CIDADES</th>
              <th>QT NF</th>
              <th>PESO (kg)</th>
              <th>QT VOL</th>
            </tr>
          </thead>
          <tbody>
    `;

    html += `<tr class="group-header"><td colspan="8">FROTA</td></tr>`;
    frotaRows.forEach(row => {
      const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
      const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
      const qtNf = row.ctrcs.length;
      const peso = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
      const qtVol = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);

      html += `
        <tr>
          <td>${row.vehiclePlate}</td>
          <td>${row.driverName}</td>
          <td>${row.helperName}</td>
          <td>${s}</td>
          <td>${cits}</td>
          <td>${qtNf}</td>
          <td>${peso.toFixed(2)}</td>
          <td>${qtVol}</td>
        </tr>
      `;
    });

    html += `<tr class="group-header"><td colspan="8">AGREGADOS</td></tr>`;
    agregadoRows.forEach(row => {
      const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
      const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
      const qtNf = row.ctrcs.length;
      const peso = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
      const qtVol = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);

      html += `
        <tr>
          <td>${row.vehiclePlate}</td>
          <td>${row.driverName}</td>
          <td>${row.helperName}</td>
          <td>${s}</td>
          <td>${cits}</td>
          <td>${qtNf}</td>
          <td>${peso.toFixed(2)}</td>
          <td>${qtVol}</td>
        </tr>
      `;
    });

    const totalVehiclesCount = programacaoRows.length;
    const totalCtrcsCount = programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0);
    const totalPesoSum = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0);
    const totalVolSum = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0);

    html += `
          <tr class="footer-total">
            <td colspan="5">TOTAIS DOS VEÍCULOS (${totalVehiclesCount})</td>
            <td>${totalCtrcsCount}</td>
            <td>${totalPesoSum.toFixed(2)}</td>
            <td>${totalVolSum}</td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Programacao_do_Dia_${manifestDate.replace(/\//g, '-')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Programação do Dia exportada para o Excel com sucesso.');
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
      const userUnid = (adminUser.unid || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
      const hasUnitCargos = !rom.ctrcs || rom.ctrcs.length === 0 || rom.ctrcs.some((c: Ctrc) => {
        const ctrcUnid = (c.unid || c.id.split(/[0-9]/)[0] || DEFAULT_OPERATIONAL_UNIT).toUpperCase();
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
            border-color: #333333 !important;
          }

          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          @page {
            size: ${(activeTab === 'programacao' || activeTab === 'preromaneio') ? 'A4 landscape' : 'A4 portrait'} !important;
            margin: 8mm !important;
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
            onClick={() => {
              setActiveTab('preromaneio');
              setPreviewRomaneio(null);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'preromaneio'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Pré-Romaneios
          </button>

          <button
            onClick={() => {
              setActiveTab('programacao');
              setPreviewRomaneio(null);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'programacao'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Programação do Dia
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
      {/* CASE 0: PROGRAMAÇÃO DO DIA MASTER OPERATIONAL DASHBOARD */}
      {/* ========================================================= */}
      {activeTab === 'programacao' && (
        <div className="space-y-6 no-print text-left">
          
          {/* Header Action Card */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase">PROGRAMAÇÃO DO DIA</h1>
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono font-bold text-[9px] uppercase rounded">
                    Varginha Filial
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Data ativa do planejamento: <span className="font-mono font-bold text-white bg-slate-900 border border-white/10 px-2 py-0.5 rounded ml-1">{manifestDate}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch md:self-auto">
              <button
                onClick={exportToExcel}
                className="flex-1 md:flex-none px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                📊 Exportar Excel
              </button>
              
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                🖨 Imprimir A4 Landscape
              </button>
            </div>
          </div>

          {/* Quick Metrics stats ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-container border border-outline-variant/60 p-4 rounded-xl">
              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block tracking-wider mb-1">Total Veículos</span>
              <div className="text-2xl font-black text-white font-mono">{programacaoRows.length}</div>
            </div>
            
            <div className="bg-surface-container border border-outline-variant/60 p-4 rounded-xl">
              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block tracking-wider mb-1">Total CTRCs / NF</span>
              <div className="text-2xl font-black text-white font-mono">
                {programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0)}
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant/60 p-4 rounded-xl">
              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block tracking-wider mb-1">Peso Consolidado</span>
              <div className="text-2xl font-black text-white font-mono">
                {programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0).toLocaleString('pt-BR')} KG
              </div>
            </div>

            <div className="bg-surface-container border border-outline-variant/60 p-4 rounded-xl">
              <span className="text-[10px] text-on-surface-variant font-mono font-bold uppercase block tracking-wider mb-1">Volume Movimentado</span>
              <div className="text-2xl font-black text-white font-mono">
                {programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0)} VOL
              </div>
            </div>
          </div>

          {/* Core Table Grid layout */}
          <div className="bg-surface-container border border-outline-variant p-6 rounded-2xl space-y-6">
            
            {/* 1. FROTA SECTION */}
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2 mb-4">
                <h2 className="text-xs font-black text-sky-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-sky-400" />
                  Frota Própria Estável
                </h2>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  Veículos em rota: {frotaRows.length}
                </span>
              </div>

              {frotaRows.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant/40 text-xs italic bg-surface/30 rounded-xl border border-dashed border-outline-variant/40">
                  Nenhum veículo próprio alocado para hoje nesta central.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-on-surface-variant uppercase font-mono text-[10px] tracking-wider border-b border-outline-variant/40 bg-surface/40">
                        <th className="p-3">PLACA</th>
                        <th className="p-3">MOTORISTA</th>
                        <th className="p-3">AJUDANTE</th>
                        <th className="p-3">SETOR</th>
                        <th className="p-3">CIDADES</th>
                        <th className="p-3 text-center">QT NF</th>
                        <th className="p-3 text-right">PESO (kg)</th>
                        <th className="p-3 text-right">QT VOL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {frotaRows.map((row, rIdx) => {
                        const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
                        const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
                        const weightSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
                        const volSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                        return (
                          <tr key={row.id || rIdx} className="hover:bg-surface/50 font-medium">
                            <td className="p-3 font-mono font-bold text-primary">{row.vehiclePlate}</td>
                            <td className="p-3 text-white">{row.driverName}</td>
                            <td className="p-3 text-on-surface-variant">{row.helperName}</td>
                            <td className="p-3 font-mono text-on-surface-variant">{s}</td>
                            <td className="p-3 text-on-surface-variant max-w-[200px] truncate" title={cits}>{cits}</td>
                            <td className="p-3 text-center font-mono text-white">{row.ctrcs.length}</td>
                            <td className="p-3 text-right font-mono text-white">{weightSum.toLocaleString('pt-BR')} kg</td>
                            <td className="p-3 text-right font-mono text-white">{volSum}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. AGREGADOS SECTION */}
            <div>
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2 mb-4 pt-4">
                <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-amber-400" />
                  Frota de Apoio (Agregados)
                </h2>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  Veículos em rota: {agregadoRows.length}
                </span>
              </div>

              {agregadoRows.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant/40 text-xs italic bg-surface/30 rounded-xl border border-dashed border-outline-variant/40">
                  Nenhum veículo agregado/apoio alocado para hoje nesta central.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-on-surface-variant uppercase font-mono text-[10px] tracking-wider border-b border-outline-variant/40 bg-surface/40">
                        <th className="p-3">PLACA</th>
                        <th className="p-3">MOTORISTA</th>
                        <th className="p-3">AJUDANTE</th>
                        <th className="p-3">SETOR</th>
                        <th className="p-3">CIDADES</th>
                        <th className="p-3 text-center">QT NF</th>
                        <th className="p-3 text-right">PESO (kg)</th>
                        <th className="p-3 text-right">QT VOL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {agregadoRows.map((row, rIdx) => {
                        const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
                        const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
                        const weightSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
                        const volSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                        return (
                          <tr key={row.id || rIdx} className="hover:bg-surface/50 font-medium">
                            <td className="p-3 font-mono font-bold text-primary">{row.vehiclePlate}</td>
                            <td className="p-3 text-white">{row.driverName}</td>
                            <td className="p-3 text-on-surface-variant">{row.helperName}</td>
                            <td className="p-3 font-mono text-on-surface-variant">{s}</td>
                            <td className="p-3 text-on-surface-variant max-w-[200px] truncate" title={cits}>{cits}</td>
                            <td className="p-3 text-center font-mono text-white">{row.ctrcs.length}</td>
                            <td className="p-3 text-right font-mono text-white">{weightSum.toLocaleString('pt-BR')} kg</td>
                            <td className="p-3 text-right font-mono text-white">{volSum}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sub footer totals row inside screen table */}
            <div className="pt-4 mt-6 border-t border-outline-variant/50 flex flex-wrap gap-4 items-center justify-between font-mono font-semibold text-xs text-on-surface-variant">
              <div>VEÍCULOS PROGRAMADOS: <span className="text-white font-bold ml-1">{programacaoRows.length}</span></div>
              <div>CTRCs / NOTAS TOTAIS: <span className="text-white font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0)}</span></div>
              <div>CUBAGEM DE PESO INTEGRADA: <span className="text-emerald-400 font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0).toLocaleString('pt-BR')} kg</span></div>
              <div>VOLUMETRIA TOTAL: <span className="text-sky-400 font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0)} vol.</span></div>
            </div>

          </div>
        </div>
      )}

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

      {/* ========================================================= */}
      {/* CASE 3: PREROMANEIO SCREEN LIST AND STATUS MANAGEMENT AREA */}
      {/* ========================================================= */}
      {activeTab === 'preromaneio' && (
        <div className="space-y-6 no-print text-left">
          {/* Header Action Card */}
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl shrink-0">
                <ClipboardList className="w-8 h-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase">Pré-Romaneios de Separação</h1>
                  <span className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono font-bold text-[9px] uppercase rounded">
                    Docas de Separação
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Lista de pré-romaneios ativos por rota e portão para conferência física e carregamento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch md:self-auto">
              <button
                onClick={loadPreRomaneiosData}
                className="flex-1 md:flex-none px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                🔄 Atualizar Lista
              </button>
              
              <button
                onClick={handlePrintAllPreRomaneios}
                disabled={preRomaneios.length === 0}
                className="flex-1 md:flex-none px-4 py-2 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md bg-emerald-600"
              >
                <Printer className="w-4 h-4" />
                🖨 Imprimir Todos ({preRomaneios.length})
              </button>
            </div>
          </div>

          {/* Quick Info Alerts */}
          {preRomaneios.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant/40 bg-surface-container/50 rounded-2xl border border-dashed border-outline-variant/60">
              <div className="max-w-md mx-auto space-y-3">
                <ClipboardList className="w-12 h-12 mx-auto text-on-surface-variant/30" />
                <h3 className="text-base font-bold text-white">Nenhum pré-romaneio localizado</h3>
                <p className="text-xs text-center leading-relaxed">
                  Não foram encontrados pré-romaneios para o dia de planejamento ativo <span className="font-mono font-bold text-white">{manifestDate}</span>. Vá para a <span className="font-semibold text-primary">Mesa de Roteirização</span> para gerar pré-romaneios de separação.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {preRomaneios.map((pr) => {
                const totalW = pr.totalWeight || 0;
                const totalVol = pr.totalVolumes || 0;
                
                // Get pre_romaneio status color
                let statusBg = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                if (pr.status === 'EM_SEPARACAO') statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                if (pr.status === 'SEPARADO') statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                if (pr.status === 'COM_DIVERGENCIA') statusBg = 'bg-rose-500/10 border-rose-500/20 text-rose-450';
                if (pr.status === 'CANCELADO') statusBg = 'bg-red-500/10 border-red-500/20 text-red-500';
                if (pr.status === 'CONVERTIDO_ROMANEIO') statusBg = 'bg-blue-500/10 border-blue-500/20 text-blue-400';

                return (
                  <div key={pr.id} className="bg-surface-container border border-outline-variant/70 rounded-2xl p-5 hover:border-outline-variant transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-on-surface-variant block uppercase tracking-wider">ROTA / DESTINO</span>
                          <span className="text-base font-black text-white uppercase tracking-tight">{pr.route}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${statusBg}`}>
                          {pr.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-surface/40 p-3 rounded-xl border border-outline-variant/30 font-mono text-xs">
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Portão / Doca</span>
                          <span className="text-white font-bold">{pr.gate || 'Não Definido'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Data Planejada</span>
                          <span className="text-white font-bold">{pr.planningDate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">CTRCs / NFS</span>
                          <span className="text-white font-bold">{pr.ctrcIds.length} Itens</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Peso / Volume</span>
                          <span className="text-white font-bold">{totalW.toLocaleString('pt-BR')} kg / {totalVol} vol</span>
                        </div>
                      </div>

                      {/* Vehicle & Operational Assignment (V1) */}
                      <div className="border-t border-outline-variant/30 pt-3 mt-1 space-y-2 text-left">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 block uppercase tracking-wider">Distribuição Operacional (V1)</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Veículo Placa</label>
                            <input
                              type="text"
                              value={pr.vehiclePlate || ''}
                              onChange={async (e) => {
                                const val = e.target.value.toUpperCase();
                                // Update local list state so it registers immediately
                                setPreRomaneios(prev => prev.map(item => item.id === pr.id ? { ...item, vehiclePlate: val } : item));
                                await PreRomaneioRepository.updateAssignment(pr.id, { vehiclePlate: val });
                              }}
                              placeholder="Placa (ex: ABC1234)"
                              className="w-full bg-[#131b2e] hover:bg-[#1c243a] focus:bg-[#1c243a] border border-outline-variant/40 hover:border-outline rounded px-2 py-1 text-white placeholder-slate-500 font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Motorista</label>
                            <input
                              type="text"
                              value={pr.driverName || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setPreRomaneios(prev => prev.map(item => item.id === pr.id ? { ...item, driverName: val } : item));
                                await PreRomaneioRepository.updateAssignment(pr.id, { driverName: val });
                              }}
                              placeholder="Nome Motorista"
                              className="w-full bg-[#131b2e] hover:bg-[#1c243a] focus:bg-[#1c243a] border border-outline-variant/40 hover:border-outline rounded px-2 py-1 text-white placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Ajudante</label>
                            <input
                              type="text"
                              value={pr.helperName || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setPreRomaneios(prev => prev.map(item => item.id === pr.id ? { ...item, helperName: val } : item));
                                await PreRomaneioRepository.updateAssignment(pr.id, { helperName: val });
                              }}
                              placeholder="Nome Ajudante"
                              className="w-full bg-[#131b2e] hover:bg-[#1c243a] focus:bg-[#1c243a] border border-outline-variant/40 hover:border-outline rounded px-2 py-1 text-white placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Observações</label>
                            <input
                              type="text"
                              value={pr.observations || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setPreRomaneios(prev => prev.map(item => item.id === pr.id ? { ...item, observations: val } : item));
                                await PreRomaneioRepository.updateAssignment(pr.id, { observations: val });
                              }}
                              placeholder="Obs/Instruções"
                              className="w-full bg-[#131b2e] hover:bg-[#1c243a] focus:bg-[#1c243a] border border-outline-variant/40 hover:border-outline rounded px-2 py-1 text-white placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handlePrintPreRomaneio(pr)}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir Doca
                      </button>

                      {/* Status select quick-switcher */}
                      <select
                        value={pr.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value as any;
                          await PreRomaneioRepository.updateStatus(pr.id, newStatus);
                          triggerToast(`Status do pré-romaneio ${pr.route} atualizado.`);
                          loadPreRomaneiosData();
                        }}
                        className="bg-slate-900 border border-outline-variant/50 hover:border-outline-variant rounded-lg px-2 py-2 text-xs text-white font-mono cursor-pointer focus:outline-none"
                      >
                        <option value="RASCUNHO">Rascunho</option>
                        <option value="EM_SEPARACAO">Separando</option>
                        <option value="SEPARADO">Separado</option>
                        <option value="COM_DIVERGENCIA">Divergência</option>
                        <option value="CANCELADO">Cancelado</option>
                        <option value="CONVERTIDO_ROMANEIO">Convertido</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* PRINT-ONLY EMBEDDED HIGH CONTRAST LANDSCAPE LAYOUT */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'programacao' && (
        <div className="hidden print:block print-area text-black bg-white w-full text-left font-sans p-2">
          <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tight">PROGRAMAÇÃO DO DIA</h1>
              <p className="text-[10px] text-gray-500 uppercase font-bold">FILIAL VARGINHA | RESUMO DE TRANSPORTE E EXPEDIÇÃO</p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-gray-400 font-bold uppercase">Data de Planejamento</span>
              <span className="text-sm font-mono font-bold">{manifestDate}</span>
            </div>
          </div>

          {/* FROTA */}
          <div className="mb-6">
            <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">FROTA PRÓPRIA</h2>
            <table className="w-full text-xs text-left border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">PLACA</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">MOTORISTA</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">AJUDANTE</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">SETOR</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">CIDADES</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-center">QT NF</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-right">PESO (kg)</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-right">QT VOL</th>
                </tr>
              </thead>
              <tbody>
                {frotaRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-400 px-3 py-4 text-center text-gray-400 italic">
                      Nenhum veículo próprio alocado nesta data.
                    </td>
                  </tr>
                ) : (
                  frotaRows.map((row, idx) => {
                    const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
                    const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
                    const weightSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
                    const volSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                    return (
                      <tr key={idx} className="font-medium text-[11px]">
                        <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold">{row.vehiclePlate}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{row.driverName}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{row.helperName}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{s}</td>
                        <td className="border border-gray-400 px-3 py-1.5 max-w-[200px] truncate">{cits}</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-center font-mono">{row.ctrcs.length}</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono">{weightSum.toLocaleString('pt-BR')} kg</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono">{volSum}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* AGREGADOS */}
          <div className="mb-6">
            <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">FROTA DE APOIO (AGREGADOS)</h2>
            <table className="w-full text-xs text-left border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">PLACA</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">MOTORISTA</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">AJUDANTE</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">SETOR</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold">CIDADES</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-center">QT NF</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-right">PESO (kg)</th>
                  <th className="border border-gray-400 px-3 py-1.5 font-bold text-right">QT VOL</th>
                </tr>
              </thead>
              <tbody>
                {agregadoRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-400 px-3 py-4 text-center text-gray-400 italic">
                      Nenhum veículo de apoio (agregado) alocado nesta data.
                    </td>
                  </tr>
                ) : (
                  agregadoRows.map((row, idx) => {
                    const s = Array.from(new Set(row.ctrcs.map((c: any) => c.setor || 'N/I'))).join(', ');
                    const cits = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean).join(', ');
                    const weightSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
                    const volSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                    return (
                      <tr key={idx} className="font-medium text-[11px]">
                        <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold">{row.vehiclePlate}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{row.driverName}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{row.helperName}</td>
                        <td className="border border-gray-400 px-3 py-1.5">{s}</td>
                        <td className="border border-gray-400 px-3 py-1.5 max-w-[200px] truncate">{cits}</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-center font-mono">{row.ctrcs.length}</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono">{weightSum.toLocaleString('pt-BR')} kg</td>
                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono">{volSum}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER TOTALS FOR PRINT */}
          <div className="border border-black bg-gray-50 p-3 flex justify-between items-center text-xs font-bold font-mono">
            <div>TOTAL VEÍCULOS: {programacaoRows.length}</div>
            <div>TOTAL CTRCS/NF: {programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0)}</div>
            <div>PESO ACUMULADO: {programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0).toLocaleString('pt-BR')} kg</div>
            <div>VOLUME TOTAL: {programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0)} vol.</div>
          </div>

          <div className="pt-8 mt-12 grid grid-cols-2 gap-6 text-[11px] font-bold text-gray-500 text-center">
            <div>
              <div className="border-b border-gray-400 h-5 mb-1 mx-4"></div>
              <span>Responsável pelo Planejamento (Expedição)</span>
            </div>
            <div>
              <div className="border-b border-gray-400 h-5 mb-1 mx-4"></div>
              <span>Supervisor de Pátio / Operação</span>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* CASE 3 PRINT-ONLY EMBEDDED HIGH CONTRAST LANDSCAPE LAYOUT */}
      {/* --------------------------------------------------------- */}
      {activeTab === 'preromaneio' && (
        <div className="hidden print:block print-area text-black bg-white w-full text-left font-sans p-2">
          {(printPreRomaneios.length > 0 ? printPreRomaneios : preRomaneios).map((pr, pIdx) => {
            const isLast = pIdx === (printPreRomaneios.length > 0 ? printPreRomaneios : preRomaneios).length - 1;
            return (
              <div key={pr.id} className={`w-full min-h-screen ${isLast ? '' : 'page-break'} pb-8`}>
                <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-tight">PRÉ-ROMANEIO DE SEPARAÇÃO</h1>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">FILIAL VARGINHA | CONFERÊNCIA E SEPARAÇÃO DE CARGA</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-400 font-bold uppercase">Data de Planejamento</span>
                    <span className="text-sm font-mono font-bold">{pr.planningDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 border border-gray-400 rounded-lg mb-4 text-xs">
                  <div>
                    <span className="block text-gray-500 font-bold uppercase text-[9px]">Rota / Doca</span>
                    <span className="font-bold text-sm text-black uppercase">{pr.route} (Doca: {pr.gate || 'N/D'})</span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-bold uppercase text-[9px]">Placa / Motorista</span>
                    <span className="font-bold text-sm text-black uppercase">
                      {pr.vehiclePlate ? `${pr.vehiclePlate} | ${pr.driverName || 'Não Informado'}` : 'Não Atribuído'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-bold uppercase text-[9px]">Ajudante / Obs</span>
                    <span className="font-bold text-xs text-black block truncate">
                      {pr.helperName || 'Não Informado'} {pr.observations ? `(${pr.observations})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-bold uppercase text-[9px]">Totais</span>
                    <span className="font-mono text-sm text-black block font-bold leading-tight">
                      {pr.ctrcIds.length} CTRCs | {pr.totalWeight.toLocaleString('pt-BR')} kg | {pr.totalVolumes} vol.
                    </span>
                  </div>
                </div>

                <table className="w-full text-[10px] text-left border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100 uppercase font-bold text-[9px]">
                      <th className="border border-gray-400 px-1 py-1 text-center w-[4%]">CHK</th>
                      <th className="border border-gray-400 px-2 py-1 w-[12%]">CTRC</th>
                      <th className="border border-gray-400 px-2 py-1 w-[8%]">NF</th>
                      <th className="border border-gray-400 px-2 py-1 w-[22%]">Destinatário</th>
                      <th className="border border-gray-400 px-2 py-1 w-[18%]">Remetente</th>
                      <th className="border border-gray-400 px-2 py-1 w-[12%]">Cidade</th>
                      <th className="border border-gray-400 px-1 py-1 text-center w-[5%]">Vol</th>
                      <th className="border border-gray-400 px-2 py-1 text-right w-[8%]">Peso</th>
                      <th className="border border-gray-400 px-2 py-1 w-[11%]">Localização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pr.ctrcIds.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="border border-gray-400 px-3 py-6 text-center text-gray-405 italic">
                          Nenhum documento eletrônico vinculado a este pré-romaneio.
                        </td>
                      </tr>
                    ) : (
                      pr.ctrcIds.map((id, index) => {
                        const ctrc = resolvedCtrcsMap[id];
                        if (!ctrc) {
                          return (
                            <tr key={index} className="text-gray-500">
                              <td className="border border-gray-400 px-1 py-1.5 text-center">
                                <div className="w-3.5 h-3.5 border border-black mx-auto rounded-sm"></div>
                              </td>
                              <td className="border border-gray-400 px-2 py-1.5 font-mono font-bold text-red-650">{id}</td>
                              <td colSpan={7} className="border border-gray-400 px-2 py-1.5 text-red-500 font-bold italic">
                                CTRC não localizado no banco (ou dados limpos temporariamente)
                              </td>
                            </tr>
                          );
                        }

                        const weight = (ctrc.peso_r || ctrc.weight || 0);
                        const vols = ctrc.volume || 0;
                        const loc = ctrc.localizacao || 'Doca';

                        return (
                          <tr key={ctrc.id || index} className="font-medium text-[10px] text-black">
                            <td className="border border-gray-400 px-1 py-1.5 text-center">
                              <div className="w-3.5 h-3.5 border border-black mx-auto rounded-sm"></div>
                            </td>
                            <td className="border border-gray-400 px-2 py-1.5 font-mono font-bold leading-none">{ctrc.id}</td>
                            <td className="border border-gray-400 px-2 py-1.5 font-mono leading-none">{ctrc.nf || 'N/A'}</td>
                            <td className="border border-gray-400 px-2 py-1.5 uppercase font-mono leading-tight">{ctrc.destinatario}</td>
                            <td className="border border-gray-400 px-2 py-1.5 uppercase text-gray-600 leading-tight">{ctrc.remetente || 'N/A'}</td>
                            <td className="border border-gray-400 px-2 py-1.5 truncate uppercase">{ctrc.cidade_ent || ctrc.cidade}</td>
                            <td className="border border-gray-400 px-1 py-1.5 text-center font-mono font-bold">{vols}</td>
                            <td className="border border-gray-400 px-2 py-1.5 text-right font-mono">{weight.toLocaleString('pt-BR')} kg</td>
                            <td className="border border-gray-400 px-2 py-1.5 uppercase font-mono font-semibold">{loc}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Separation Checklist Signature Blocks & Manual Input Fields Card */}
                <div className="border border-gray-400 rounded-lg p-3 mt-4 bg-gray-50/50">
                  <h3 className="text-[10px] font-bold text-gray-700 uppercase mb-2 border-b border-gray-300 pb-1">CAMPOS CONFIRMAÇÃO MANUAL (FÍSICO):</h3>
                  <div className="grid grid-cols-4 gap-4 text-[10px]">
                    <div>
                      <span className="text-gray-500 uppercase font-semibold">Separador (Nome):</span>
                      <div className="border-b border-gray-400 h-6 mt-1 w-full"></div>
                    </div>
                    <div>
                      <span className="text-gray-500 uppercase font-semibold">Conferente (Nome):</span>
                      <div className="border-b border-gray-400 h-6 mt-1 w-full"></div>
                    </div>
                    <div>
                      <span className="text-gray-500 uppercase font-semibold">Motorista (Assinatura):</span>
                      <div className="border-b border-gray-400 h-6 mt-1 w-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500 uppercase font-semibold">Horário Início:</span>
                        <div className="border-b border-gray-400 h-6 mt-1 w-full"></div>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase font-semibold">Horário Fim:</span>
                        <div className="border-b border-gray-400 h-6 mt-1 w-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-gray-500 font-semibold uppercase block">Observações / Divergências de Separação Encontradas:</span>
                    <div className="border border-gray-300 rounded h-16 mt-1 w-full bg-white"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
