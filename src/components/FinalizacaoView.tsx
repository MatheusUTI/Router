import React, { useState, useEffect } from 'react';
import { DEFAULT_OPERATIONAL_UNIT } from '../constants/operationalUnits';
import { Ctrc, Vehicle, AppUser, PreRomaneio, CurvaAClientLocal, VehicleRegistry, VehicleGrRule } from '../types';
import { calculateSuggestedGrLimit } from '../utils/grUtils';
import { PreRomaneioRepository } from '../infrastructure/localdb/repositories/preRomaneioRepository';
import { CtrcRepository } from '../infrastructure/localdb/repositories/ctrcRepository';
import { CurvaAClientRepository } from '../infrastructure/localdb/repositories/curvaAClientRepository';
import { isClienteCurvaA } from './roteirizacao/helpers/isClienteCurvaA';
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
  onRefreshCtrcs?: () => Promise<void>;
  vehicleRegistries?: VehicleRegistry[];
  onAddVehicleRegistry?: (vr: VehicleRegistry) => Promise<void>;
  grRules?: VehicleGrRule[];
}

export default function FinalizacaoView({
  linkedCtrcs,
  onCloseRomaneio,
  activeVehicle,
  savedRomaneios = [],
  onSaveRomaneio,
  onDeleteRomaneio,
  adminUser,
  onRefreshCtrcs,
  vehicleRegistries = [],
  onAddVehicleRegistry,
  grRules = [],
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

  const [curvaAClients, setCurvaAClients] = useState<CurvaAClientLocal[]>([]);
  useEffect(() => {
    CurvaAClientRepository.getAll().then(setCurvaAClients).catch(err => console.error('[FinalizacaoView] error loading Curva A list:', err));
  }, []);

  const isAgregadoVehicle = (vehiclePlate: string = '', driverName: string = '') => {
    const plateUpper = vehiclePlate.toUpperCase().replace(/\s/g, '');
    const driverUpper = driverName.toUpperCase();
    
    // Check if registered as non-PROPRIO
    const registered = (vehicleRegistries || []).find(vr => vr.placa.toUpperCase().replace(/\s/g, '').trim() === plateUpper);
    if (registered) {
      if (registered.tipo !== 'PROPRIO' && registered.tipo !== 'PRÓPRIO') {
        return true;
      }
    }
    
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

  // Quick vehicle registration modal state
  const [quickRegisterPlate, setQuickRegisterPlate] = useState<string | null>(null);
  const [quickTipo, setQuickTipo] = useState<'PROPRIO' | 'AGREGADO' | 'APOIO' | 'TERCEIRO'>('PROPRIO');
  const [quickRastreado, setQuickRastreado] = useState<boolean>(true);
  const [quickLimiteGrSugerido, setQuickLimiteGrSugerido] = useState<number>(500000);
  const [quickMotoristaPadrao, setQuickMotoristaPadrao] = useState('');
  const [quickAjudantePadrao, setQuickAjudantePadrao] = useState('');
  const [quickStatusOperacional, setQuickStatusOperacional] = useState<'ATIVO' | 'MANUTENCAO' | 'INATIVO'>('ATIVO');
  const [quickObservacoes, setQuickObservacoes] = useState('');

  useEffect(() => {
    if (quickRegisterPlate) {
      setQuickLimiteGrSugerido(calculateSuggestedGrLimit(quickTipo, quickRastreado, grRules));
    }
  }, [quickTipo, quickRastreado, quickRegisterPlate, grRules]);

  const handleOpenQuickRegisterModal = (plate: string) => {
    setQuickRegisterPlate(plate.toUpperCase().replace(/\s/g, '').trim());
    setQuickTipo('PROPRIO');
    setQuickRastreado(true);
    setQuickLimiteGrSugerido(calculateSuggestedGrLimit('PROPRIO', true, grRules));
    setQuickMotoristaPadrao('');
    setQuickAjudantePadrao('');
    setQuickStatusOperacional('ATIVO');
    setQuickObservacoes('');
  };

  const handleSaveQuickVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRegisterPlate) return;
    
    const cleanPlate = quickRegisterPlate.toUpperCase().replace(/\s/g, '').trim();
    if (!cleanPlate) {
      alert('A placa é obrigatória.');
      return;
    }
    
    const exists = (vehicleRegistries || []).some(
      (vr) => vr.placa.toUpperCase().replace(/\s/g, '').trim() === cleanPlate
    );
    if (exists) {
      alert(`Veículo com a placa ${cleanPlate} já está cadastrado.`);
      return;
    }
    
    const newVr: VehicleRegistry = {
      placa: cleanPlate,
      tipo: quickTipo,
      rastreado: quickRastreado,
      limiteGrSugerido: quickLimiteGrSugerido,
      motoristaPadrao: quickMotoristaPadrao.trim() || undefined,
      ajudantePadrao: quickAjudantePadrao.trim() || undefined,
      statusOperacional: quickStatusOperacional,
      observacoes: quickObservacoes.trim() || undefined,
    };
    
    try {
      if (onAddVehicleRegistry) {
        await onAddVehicleRegistry(newVr);
        triggerToast(`Veículo ${cleanPlate} cadastrado com sucesso!`);
      } else {
        alert('Erro: Função de cadastro de frota não está disponível.');
      }
    } catch (err) {
      console.error('Erro ao cadastrar veículo rápido:', err);
      alert('Erro ao salvar veículo no repositório.');
    }
    
    // Reset state & close modal
    setQuickRegisterPlate(null);
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
      const activeImportBatchId = localStorage.getItem('active_import_batch_id');
      const activePlanningDate = localStorage.getItem('active_planning_date');
      const targetDate = convertManifestDateToPlanningDate(manifestDate);
      
      let prs = await PreRomaneioRepository.getAll();
      
      // Filter strictly by selected date OR active import batch if looking at today
      prs = prs.filter(pr => {
        // If the user is explicitly looking at a specific date, show items for that date
        if (pr.planningDate === targetDate) return true;
        // If the target date matches the active planning date, also include items from the active batch even if they miss the date
        if (targetDate === activePlanningDate && activeImportBatchId && pr.importBatchId === activeImportBatchId) return true;
        return false;
      });
      
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

  const handleUpdatePreRomaneioField = async (prId: string, field: keyof PreRomaneio, val: any) => {
    const pr = preRomaneios.find(p => p.id === prId);
    if (!pr) return;

    const prevStatus = pr.status;

    // 1. Update in-memory state
    setPreRomaneios((prev) =>
      prev.map((item) => (item.id === prId ? { ...item, [field]: val } : item))
    );

    // 2. Persist to DB and cascade changes if needed
    try {
      if (field === 'status') {
        const newStatus = val as any;
        await PreRomaneioRepository.updateStatus(prId, newStatus);

        if (newStatus === 'CANCELADO' && prevStatus !== 'CANCELADO') {
          if (pr.ctrcIds && pr.ctrcIds.length > 0) {
            const prCtrcs = await CtrcRepository.getByIds(pr.ctrcIds);
            const updated = prCtrcs.map(c => ({ 
              ...c, 
              status: 'Disponível' as const,
              preRomaneioId: undefined 
            }));
            await CtrcRepository.putMany(updated);
          }
        } else if (prevStatus === 'CANCELADO' && newStatus !== 'CANCELADO') {
          if (pr.ctrcIds && pr.ctrcIds.length > 0) {
            const prCtrcs = await CtrcRepository.getByIds(pr.ctrcIds);
            const updated = prCtrcs.map(c => ({ 
              ...c, 
              status: 'Separando' as const,
              preRomaneioId: prId 
            }));
            await CtrcRepository.putMany(updated);
          }
        }
        
        triggerToast(`Status do pré-romaneio ${pr.route} atualizado.`);
        loadPreRomaneiosData();
        if (onRefreshCtrcs) {
          await onRefreshCtrcs();
        }
      } else {
        await PreRomaneioRepository.updateAssignment(prId, { [field]: val });
      }
    } catch (err) {
      console.error('[FinalizacaoView] Error updating pre-romaneio field:', err);
    }
  };

  
  const handleDeletePreRomaneioAction = async (pr: PreRomaneio) => {
    if (!window.confirm(`Tem certeza que deseja excluir o pré-romaneio da rota ${pr.route}?\nCargas do ciclo ativo retornarão para a Mesa.`)) {
      return;
    }
    
    try {
      if (pr.ctrcIds && pr.ctrcIds.length > 0) {
        const prCtrcs = await CtrcRepository.getByIds(pr.ctrcIds);
        const updated = prCtrcs.map(c => ({ 
          ...c, 
          status: 'Disponível' as const,
          preRomaneioId: undefined 
        }));
        await CtrcRepository.putMany(updated);
      }
      
      await PreRomaneioRepository.delete(pr.id);
      
      triggerToast('Pré-romaneio excluído com sucesso.');
      loadPreRomaneiosData();
      if (onRefreshCtrcs) {
        await onRefreshCtrcs();
      }
    } catch (err) {
      console.error('[FinalizacaoView] Erro ao excluir pré-romaneio:', err);
      triggerToast('Erro ao excluir pré-romaneio.');
    }
  };

  const programacaoRows: any[] = [];

  // Active planning views link to the exact same pre-romaneios list, fully sync'd
  const preRomaneiosToShip = preRomaneios;

  preRomaneiosToShip.forEach((pr) => {
    const matchingCtrcs = (pr.ctrcIds || [])
      .map((id) => resolvedCtrcsMap[id])
      .filter(Boolean);

    programacaoRows.push({
      id: pr.id,
      vehiclePlate: pr.vehiclePlate || '',
      driverName: pr.driverName || '',
      helperName: pr.helperName || '',
      ctrcs: matchingCtrcs,
      isDraft: false,
      observations: pr.observations || pr.notes || '',
      date: pr.planningDate,
      route: pr.route,
      gate: pr.gate || '',
      status: pr.status
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

    html += `<tr class="group-header"><td colspan="8">FROTA PRÓPRIA ESTÁVEL (CLASSIFICAÇÃO PENDENTE)</td></tr>`;
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

    html += `<tr class="group-header"><td colspan="8">APOIO / NÃO CLASSIFICADO (AGREGADOS)</td></tr>`;
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
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            size: ${activeTab === 'programacao' ? 'A4 landscape' : 'A4 portrait'} !important;
            margin: 8mm !important;
          }
        }
      `}} />

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 bg-[var(--router-surface-3)] border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 max-w-sm animate-fade-in no-print">
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
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl border border-[var(--router-input-border)] self-stretch md:self-auto tab-bar">
          <button
            onClick={() => {
              setActiveTab('preromaneio');
              setPreviewRomaneio(null);
            }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'preromaneio'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:text-[var(--router-text)]'
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
                : 'text-on-surface-variant hover:text-[var(--router-text)]'
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
                : 'text-on-surface-variant hover:text-[var(--router-text)]'
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
                  <h1 className="text-2xl font-black text-[var(--router-text)] tracking-tight uppercase">PROGRAMAÇÃO DO DIA</h1>
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono font-bold text-[9px] uppercase rounded">
                    Varginha Filial
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Data ativa do planejamento: <span className="font-mono font-bold text-[var(--router-text)] bg-[var(--router-surface-3)] border border-white/10 px-2 py-0.5 rounded ml-1">{manifestDate}</span>
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

          {/* Executive Summary Dashboard */}
          {(() => {
            const totalCtrcs = programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0);
            const totalNfs = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => {
              if (!c.nf) return sum;
              const parts = c.nf.split(/[\s,;\/\\|]+/).filter(Boolean);
              return sum + (parts.length > 0 ? parts.length : 1);
            }, 0), 0);
            const totalPeso = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0);
            const totalVolumes = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0);
            const totalValor = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.valor || 0), 0), 0);
            const totalFrete = programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.frete || 0), 0), 0);
            const vehiclesDefined = programacaoRows.filter(r => r.vehiclePlate && r.vehiclePlate.trim() !== '').length;
            const driversDefined = programacaoRows.filter(r => r.driverName && r.driverName.trim() !== '').length;
            const routesWithHighValue = programacaoRows.filter(r => {
              const valSum = r.ctrcs.reduce((sum: number, c: any) => sum + (c.valor || 0), 0);
              return valSum > 300000;
            }).length;

            const formatCurrency = (val?: number) => {
              if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
              return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            };

            return (
              <div className="space-y-6">
                
                {/* 5-Column High-Density Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  
                  {/* Card 1: Pré-romaneios */}
                  <div className="router-card border border-[var(--router-border)] rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-mono">Pré-Romaneios</span>
                      <ClipboardList className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[var(--router-text)] font-mono">{programacaoRows.length} <span className="text-xs text-on-surface-variant font-normal">Rotas</span></div>
                      <div className="mt-1 text-[10px] text-on-surface-variant font-mono">
                        Definidos: {vehiclesDefined} plc / {driversDefined} mtr
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Documentação */}
                  <div className="router-card border border-[var(--router-border)] rounded-xl p-4 flex flex-col justify-between hover:border-sky-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-mono">Documentação</span>
                      <FileText className="w-4 h-4 text-sky-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[var(--router-text)] font-mono">{totalCtrcs} <span className="text-xs text-on-surface-variant font-normal">CTRCs</span></div>
                      <div className="mt-1 text-[10px] text-sky-400 font-mono">
                        {totalNfs} NFs estimadas
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Peso Consolidado */}
                  <div className="router-card border border-[var(--router-border)] rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-mono">Peso Consolidado</span>
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3V21M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-500 dark:text-emerald-450 font-mono">
                        {totalPeso.toLocaleString('pt-BR')} <span className="text-xs text-on-surface-variant font-normal">kg</span>
                      </div>
                      <div className="mt-1 text-[10px] text-on-surface-variant font-mono">
                        Cubagem de peso integrada
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Volumetria */}
                  <div className="router-card border border-[var(--router-border)] rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-mono">Qtd Volumes</span>
                      <Truck className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-amber-500 dark:text-amber-450 font-mono">{totalVolumes} <span className="text-xs text-on-surface-variant font-normal">vol</span></div>
                      <div className="mt-1 text-[10px] text-on-surface-variant font-mono">
                        Média: {(totalVolumes / (programacaoRows.length || 1)).toFixed(0)} vol / rota
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Financeiro (Uso Interno) */}
                  <div className="router-card border border-[var(--router-border)] rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                        Carga & Receita <span className="text-[9px] text-purple-400 font-black tracking-widest">(INT)</span>
                      </span>
                      <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-base font-black text-[var(--router-text)] font-mono leading-tight">{formatCurrency(totalValor)}</div>
                      <div className="text-xs font-bold text-purple-500 dark:text-purple-400 font-mono">Frete: {formatCurrency(totalFrete)}</div>
                    </div>
                  </div>

                </div>

                {/* Status Breakdown & Alerts Compact Flex Bar */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between router-panel border border-[var(--router-border)] px-5 py-3 rounded-xl text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--router-border)]"></span>
                      <span className="text-on-surface-variant">Rascunhos:</span>
                      <span className="text-[var(--router-text)] font-bold">{programacaoRows.filter(r => r.status === 'RASCUNHO').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="text-on-surface-variant">Separando:</span>
                      <span className="text-amber-400 font-bold">{programacaoRows.filter(r => r.status === 'EM_SEPARACAO').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span className="text-on-surface-variant">Separado:</span>
                      <span className="text-emerald-400 font-bold">{programacaoRows.filter(r => r.status === 'SEPARADO').length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                      <span className="text-on-surface-variant">Divergência:</span>
                      <span className="text-red-400 font-bold">{programacaoRows.filter(r => r.status === 'COM_DIVERGENCIA').length}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center flex-wrap gap-3 border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-2 lg:pt-0 lg:pl-6 w-full lg:w-auto">
                    {(() => {
                      if (programacaoRows.length === 0) return null;
                      const assignedPlates = programacaoRows.map(r => r.vehiclePlate).filter(Boolean);
                      if (assignedPlates.length === 0) {
                        return (
                          <span className="px-2.5 py-1 bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 rounded font-bold text-[10px] flex items-center gap-1">
                            ℹ️ Escala Sem Veículos Vinculados
                          </span>
                        );
                      }
                      const unregisteredPlates = assignedPlates.filter(plate => {
                        const cleanPlate = plate.toUpperCase().replace(/\s/g, '').trim();
                        return !vehicleRegistries.some(vr => vr.placa.toUpperCase().replace(/\s/g, '').trim() === cleanPlate);
                      });
                      if (unregisteredPlates.length === 0) {
                        return (
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-bold text-[10px] flex items-center gap-1">
                            ✓ Classificação Validada via Cadastro de Frota
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded font-bold text-[10px] flex items-center gap-1" title={`Placas não cadastradas no GR: ${unregisteredPlates.join(', ')}`}>
                          ℹ️ Usando Heurística Visual ({unregisteredPlates.length} não homologados)
                        </span>
                      );
                    })()}
                    {routesWithHighValue > 0 && (
                      <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded font-bold text-[10px] flex items-center gap-1 animate-pulse" title="Cargas com valor superior a R$ 300.000. Pré-alerta operacional de pendência para GR.">
                        ⚠️ {routesWithHighValue} Pré-alerta Operacional (Valor Alto)
                      </span>
                    )}
                    {programacaoRows.length - vehiclesDefined > 0 && (
                      <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded font-bold text-[10px] flex items-center gap-1 animate-pulse">
                        ⚠️ {programacaoRows.length - vehiclesDefined} Sem Veículo
                      </span>
                    )}
                    {programacaoRows.length - driversDefined > 0 && (
                      <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded font-bold text-[10px] flex items-center gap-1 animate-pulse">
                        ⚠️ {programacaoRows.length - driversDefined} Sem Motorista
                      </span>
                    )}
                    {programacaoRows.length - vehiclesDefined === 0 && programacaoRows.length - driversDefined === 0 && (
                      <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded font-bold text-[10px] flex items-center gap-1">
                        ✓ Escala 100% Definida
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Dense Operational Grid/Matrix Area */}
                <div className="bg-surface-container border border-outline-variant p-3.5 rounded-xl space-y-5">
                  
                  {/* HELPER FOR RENDERING TRANSIT MATRIX TABLES */}
                  {(() => {
                    const renderOperationalTable = (rowsList: any[], groupTitle: string, accentColor: string, emptyText: string) => {
                      const renderGrFeedback = (row: any, valSum: number) => {
                        if (!row.vehiclePlate) return null;
                        const cleanPlate = row.vehiclePlate.toUpperCase().replace(/\s/g, '').trim();
                        const registered = (vehicleRegistries || []).find(vr => vr.placa.toUpperCase().replace(/\s/g, '').trim() === cleanPlate);
                        
                        if (registered) {
                          const grLimit = registered.limiteGrSugerido;
                          const isRastreado = registered.rastreado;
                          const isExceeded = valSum > grLimit;
                          const isNoTrackerViolation = !isRastreado && valSum > 300000;
                          
                          const classificationLabel = registered.tipo === 'PROPRIO' ? 'Prop.' : registered.tipo === 'AGREGADO' ? 'Agr.' : 'Apoio';
                          
                          return (
                            <div className="mt-1.5 flex flex-col gap-1 text-[10px] font-mono leading-none">
                              <div className="flex items-center justify-between text-on-surface-variant/70 border-t border-outline-variant/20 pt-1">
                                <span>{classificationLabel} • {isRastreado ? 'Rastr.' : 'S/ Rast.'}</span>
                              </div>
                              {isExceeded && (
                                <div className="text-red-400 font-bold bg-red-950/40 border border-red-500/30 rounded px-1 py-0.5 mt-0.5 text-center flex items-center justify-center gap-0.5 animate-pulse">
                                  ⚠️ Excede Limite!
                                </div>
                              )}
                              {isNoTrackerViolation && (
                                <div className="text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 rounded px-1 py-0.5 mt-0.5 text-center flex items-center justify-center gap-0.5 animate-pulse">
                                  ⚠️ S/ Rast {'>'} 300k
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          const isHighValViolation = valSum > 300000;
                          return (
                            <div className="mt-1.5 flex flex-col gap-1 text-[10px] font-mono leading-none">
                              <div className="text-amber-500 italic border-t border-outline-variant/20 pt-1 text-center font-bold">
                                Não Cadastrado
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickRegisterModal(row.vehiclePlate)}
                                className="w-full py-1 px-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/20 dark:hover:bg-amber-500/35 text-neutral-900 dark:text-amber-400 font-extrabold border border-amber-500/40 dark:border-amber-500/20 rounded transition-all text-[9px] uppercase tracking-wider cursor-pointer text-center mt-0.5"
                                title="Cadastrar veículo"
                              >
                                + Cadastrar
                              </button>
                              {isHighValViolation && (
                                <div className="text-amber-500 font-bold bg-amber-950/20 border border-amber-500/20 rounded px-1 py-0.5 mt-0.5 text-center flex items-center justify-center gap-0.5">
                                  ⚠️ Risco {'>'} 300k
                                </div>
                              )}
                            </div>
                          );
                        }
                      };
                      return (
                        <div className="space-y-1.5 text-left">
                          
                          {/* Heading Ribbon */}
                          <div className="flex items-center justify-between border-b border-[var(--router-input-border)] pb-1">
                            <h2 className="text-xs font-black uppercase tracking-wider font-mono flex items-center gap-2" style={{ color: accentColor }}>
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
                              {groupTitle}
                            </h2>
                            <span className="text-[10px] text-on-surface-variant font-mono bg-[var(--router-surface-2)] px-2 py-0.5 border border-[var(--router-border)] rounded">
                              Ativos nesta data: {rowsList.length}
                            </span>
                          </div>

                          {rowsList.length === 0 ? (
                            <div className="text-center py-8 text-on-surface-variant/40 text-xs italic router-panel rounded-xl border border-dashed border-[var(--router-border)]">
                              {emptyText}
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-[var(--router-border)]">
                              <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                                <thead className="bg-[var(--router-surface-2)] border-b border-[var(--router-border)]">
                                  <tr className="text-on-surface-variant font-mono text-[10px] tracking-wider uppercase">
                                    <th className="py-1.5 px-2 w-[100px]">ROTA</th>
                                    <th className="py-1.5 px-2 w-[120px]">PLACA</th>
                                    <th className="py-1.5 px-2 w-[160px]">MOTORISTA</th>
                                    <th className="py-1.5 px-2 w-[160px]">AJUDANTE</th>
                                    <th className="py-1.5 px-2 w-[80px]">DOCA</th>
                                    <th className="py-1.5 px-2">CIDADES ATENDIDAS</th>
                                    <th className="py-1.5 px-2 text-center w-[120px]">DOCS (NF/CTRC)</th>
                                    <th className="py-1.5 px-2 text-right w-[110px]">PESO (KG)</th>
                                    <th className="py-1.5 px-2 text-right w-[80px]">VOL</th>
                                    <th className="py-1.5 px-2 text-right w-[160px]">FINANCEIRO (INT)</th>
                                    <th className="py-1.5 px-2 w-[130px]">STATUS</th>
                                    <th className="py-1.5 px-2 w-[180px]">OBSERVAÇÕES</th>
                                    <th className="py-1.5 px-2 w-[40px]"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/30 bg-surface/30">
                                  {rowsList.map((row, rIdx) => {
                                    const cities = Array.from(new Set(row.ctrcs.map((c: any) => (c.cidade_ent || c.cidade || '').replace(/,\s*[A-Z]{2}$/i, '').trim()))).filter(Boolean);
                                    const weightSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.peso_r || c.weight || 0), 0);
                                    const volSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.volume || 0), 0);
                                    const valSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.valor || 0), 0);
                                    const freteSum = row.ctrcs.reduce((acc: number, c: any) => acc + (c.frete || 0), 0);
                                    const nfsCount = row.ctrcs.reduce((acc: number, c: any) => {
                                      if (!c.nf) return acc;
                                      const parts = c.nf.split(/[\s,;\/\\|]+/).filter(Boolean);
                                      return acc + (parts.length > 0 ? parts.length : 1);
                                    }, 0);

                                    return (
                                      <tr key={row.id || rIdx} className="hover:bg-[var(--router-surface)]/75 dark:hover:bg-[#12192c]/40 font-medium">
                                        
                                        {/* ROTA */}
                                        <td className="py-1.5 px-2">
                                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono text-[11px] font-black uppercase tracking-wide block text-center truncate">
                                            {row.route || 'Sem Rota'}
                                          </span>
                                        </td>

                                        {/* PLACA */}
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={row.vehiclePlate || ''}
                                              onChange={(e) => handleUpdatePreRomaneioField(row.id, 'vehiclePlate', e.target.value.toUpperCase())}
                                              className={`w-full bg-[var(--router-input-bg)] border ${row.vehiclePlate ? 'border-[var(--router-border)]' : 'border-amber-500/30 bg-amber-500/[0.02]'} hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[var(--router-text)] font-mono text-xs focus:outline-none uppercase text-center`}
                                              placeholder="Placa"
                                            />
                                            {renderGrFeedback(row, valSum)}
                                            {!row.vehiclePlate && (
                                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* MOTORISTA */}
                                        <td className="py-1.5 px-2">
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={row.driverName || ''}
                                              onChange={(e) => handleUpdatePreRomaneioField(row.id, 'driverName', e.target.value)}
                                              className={`w-full bg-[var(--router-input-bg)] border ${row.driverName ? 'border-[var(--router-border)]' : 'border-amber-500/30 bg-amber-500/[0.02]'} hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[var(--router-text)] text-xs focus:outline-none`}
                                              placeholder="Motorista"
                                            />
                                            {!row.driverName && (
                                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* AJUDANTE */}
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={row.helperName || ''}
                                            onChange={(e) => handleUpdatePreRomaneioField(row.id, 'helperName', e.target.value)}
                                            className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[var(--router-text)] text-xs focus:outline-none"
                                            placeholder="Ajudante"
                                          />
                                        </td>

                                        {/* DOCA */}
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={row.gate || ''}
                                            onChange={(e) => handleUpdatePreRomaneioField(row.id, 'gate', e.target.value)}
                                            className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[var(--router-text)] text-xs text-center font-mono focus:outline-none"
                                            placeholder="Doca"
                                          />
                                        </td>

                                        {/* CIDADES ATENDIDAS */}
                                        <td className="py-1.5 px-2">
                                          <div className="max-w-[190px] truncate text-xs text-on-surface-variant font-medium leading-tight" title={cities.join(', ')}>
                                            {cities.length === 0 ? (
                                              <span className="text-on-surface-variant/30 italic">Não informado</span>
                                            ) : (
                                              cities.slice(0, 2).join(', ') + (cities.length > 2 ? ` + ${cities.length - 2} cidades` : '')
                                            )}
                                          </div>
                                        </td>

                                        {/* DOCS (NF/CTRC) */}
                                        <td className="py-1.5 px-2 text-center">
                                          <div className="font-mono text-xs">
                                            <span className="text-[var(--router-text)] font-bold">{row.ctrcs.length} CTRCs</span>
                                            {nfsCount > 0 && <span className="text-on-surface-variant/70 text-[10px] block font-sans">({nfsCount} NFs)</span>}
                                          </div>
                                        </td>

                                        {/* PESO */}
                                        <td className="py-1.5 px-2 text-right">
                                          <div className="font-mono font-bold text-emerald-400 text-xs">
                                            {weightSum.toLocaleString('pt-BR')} kg
                                          </div>
                                        </td>

                                        {/* VOL */}
                                        <td className="py-1.5 px-2 text-right">
                                          <div className="font-mono text-[var(--router-text)] text-xs">
                                            {volSum}
                                          </div>
                                        </td>

                                        {/* FINANCEIRO (INTERNO) */}
                                        <td className="py-1.5 px-2 text-right">
                                          <div className="font-mono text-[11px] leading-tight flex flex-col items-end justify-center">
                                            <span className="text-[var(--router-text)] font-semibold" title="Valor Mercadoria">
                                              📦 {valSum > 0 ? formatCurrency(valSum) : 'R$ 0,00'}
                                            </span>
                                            <span className="text-indigo-400 text-[10px]" title="Valor do Frete">
                                              Frete: {freteSum > 0 ? formatCurrency(freteSum) : 'R$ 0,00'}
                                            </span>
                                          </div>
                                        </td>

                                        {/* STATUS */}
                                        <td className="py-1.5 px-2">
                                          <select
                                            value={row.status}
                                            onChange={(e) => handleUpdatePreRomaneioField(row.id, 'status', e.target.value)}
                                            className="bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] border border-[var(--router-border)] focus:border-indigo-500 rounded px-1 py-0.5 text-[var(--router-text)] text-[11px] font-bold focus:outline-none cursor-pointer w-full"
                                          >
                                            <option value="RASCUNHO">Rascunho</option>
                                            <option value="EM_SEPARACAO">Separando</option>
                                            <option value="SEPARADO">Separado</option>
                                            <option value="COM_DIVERGENCIA">Divergência</option>
                                            <option value="CANCELADO">Cancelado</option>
                                            <option value="CONVERTIDO_ROMANEIO">Convertido</option>
                                          </select>
                                        </td>

                                        {/* OBSERVAÇÕES */}
                                        <td className="py-1.5 px-2">
                                          <input
                                            type="text"
                                            value={row.observations || ''}
                                            onChange={(e) => handleUpdatePreRomaneioField(row.id, 'observations', e.target.value)}
                                            className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded px-1.5 py-0.5 text-[var(--router-text)] text-xs focus:outline-none"
                                            placeholder="Observações..."
                                          />
                                        </td>

                                        {/* AÇÕES */}
                                        <td className="py-1.5 px-2 text-right">
                                          <button
                                            onClick={() => { const pr = preRomaneios.find(p => p.id === row.id); if (pr) handleDeletePreRomaneioAction(pr); }}
                                            className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            title="Excluir Pré-Romaneio"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </td>


                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-8">
                        {renderOperationalTable(
                          frotaRows, 
                          "Frota Própria Estável (Homologada)", 
                          "#38bdf8", 
                          "Nenhum veículo próprio alocado para hoje nesta central."
                        )}
                        {renderOperationalTable(
                          agregadoRows, 
                          "Apoio / Agregados & Terceirizados", 
                          "#f59e0b", 
                          "Nenhum veículo agregado/apoio alocado para hoje nesta central."
                        )}
                      </div>
                    );
                  })()}

                  {/* Sub footer totals row inside screen table */}
                  <div className="pt-5 mt-6 border-t border-outline-variant/50 flex flex-wrap gap-4 items-center justify-between font-mono font-semibold text-xs text-on-surface-variant">
                    <div>VEÍCULOS PROGRAMADOS: <span className="text-[var(--router-text)] font-bold ml-1">{programacaoRows.length}</span></div>
                    <div>CTRCs / NOTAS TOTAIS: <span className="text-[var(--router-text)] font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.length, 0)}</span></div>
                    <div>CUBAGEM DE PESO INTEGRADA: <span className="text-emerald-400 font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.peso_r || c.weight || 0), 0), 0).toLocaleString('pt-BR')} kg</span></div>
                    <div>VOLUMETRIA TOTAL: <span className="text-sky-400 font-bold ml-1">{programacaoRows.reduce((acc, r) => acc + r.ctrcs.reduce((sum: number, c: any) => sum + (c.volume || 0), 0), 0)} vol.</span></div>
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* CASE 1: ACTIVE SEPARATION DRAFTING BOARD */}
      {/* ========================================================= */}
      {activeTab === 'active' && (
        linkedCtrcs.length === 0 ? (
          <div className="text-center py-20 bg-surface-container rounded-xl border border-dashed border-outline-variant no-print max-w-2xl mx-auto">
            <ClipboardList className="w-12 h-12 mx-auto text-on-surface-variant/40 mb-3" />
            <h3 className="text-sm font-bold text-[var(--router-text)] mb-1">Nenhum Romaneio Ativo Sendo Roteirizado</h3>
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
                className="px-4 py-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[var(--router-text)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
                    <div className="bg-surface px-3 py-2 border border-outline-variant rounded-lg font-semibold text-[var(--router-text)]">
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
              <div className="router-card-soft border border-[var(--router-border)] p-4 rounded-xl space-y-3.5">
                <span className="block text-[11px] font-mono font-bold text-[var(--router-text-muted)] text-[var(--router-text-muted)] uppercase tracking-wider">
                  Status de Separação de Doca
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface p-2 rounded-lg border border-[var(--router-input-border)]">
                    <span className="block text-[9px] text-on-surface-variant">CTRCs</span>
                    <span className="text-xs font-bold text-[var(--router-text)] font-mono">{totalCtrcs}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-[var(--router-input-border)]">
                    <span className="block text-[9px] text-on-surface-variant">Volumes</span>
                    <span className="text-xs font-bold text-sky-300 font-mono">{totalVolumes}</span>
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-[var(--router-input-border)]">
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
                  <div className="w-full bg-[var(--router-surface-3)] h-1.5 rounded-full overflow-hidden">
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
                  className="w-full py-2 bg-[var(--router-surface-2)] hover:bg-slate-705 border border-outline-variant text-[#dae2fd] hover:text-[var(--router-text)] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Folha Corrente
                </button>
              </div>
            </div>

            {/* Checklist Column (Right) */}
            <div className="lg:col-span-8 space-y-4 print-area text-left bg-[var(--router-surface)] text-gray-900 rounded-xl p-5 border border-outline-variant/30 print:border-none shadow-xl print:shadow-none">
              
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
                          className="w-4.5 h-4.5 border border-gray-400 rounded bg-[var(--router-surface)] flex items-center justify-center shrink-0 cursor-pointer text-blue-600 focus:outline-none"
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
                <h4 className="text-sm font-semibold text-[var(--router-text)]">Nenhum Romaneio Encontrado</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                  Não existem roteirizações arquivadas que correspondam à sua busca por <b>"{historySearch}"</b>.
                </p>
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="mt-4 px-3 py-1.5 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[var(--router-text)] text-[11px] font-bold rounded-lg cursor-pointer"
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
                      className="bg-surface-container border border-outline-variant/70 hover:border-[var(--router-primary)]-variant p-4 rounded-xl flex flex-col justify-between gap-4 transition-all duration-200"
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

                          <div className="font-mono text-base font-bold text-[var(--router-text)] uppercase flex items-center gap-1">
                            <Truck className="w-4 h-4 text-primary shrink-0" />
                            {rom.vehiclePlate}
                          </div>
                          
                          <div className="text-xs text-on-surface-variant">
                            <span className="font-bold text-[var(--router-text)]">Mot:</span> {rom.driverName}
                          </div>
                          
                          {rom.helperName && (
                            <div className="text-xs text-on-surface-variant/80">
                              <span className="font-bold text-[var(--router-text-muted)]">Conf:</span> {rom.helperName}
                            </div>
                          )}
                        </div>

                        {/* Totals side panel indicator */}
                        <div className="text-right space-y-1">
                          <div className="bg-[var(--router-surface)] border border-[var(--router-border)] px-2.5 py-1.5 rounded-lg text-center space-y-0.5 shrink-0">
                            <span className="block text-[8px] text-on-surface-variant font-semibold uppercase leading-none">CTRCs</span>
                            <span className="block text-xs font-bold text-sky-400 font-mono leading-none">{rom.ctrcs.length}</span>
                          </div>
                          
                          <span className="text-[10px] text-on-surface-variant bg-[var(--router-surface-3)] border border-outline-variant/30 px-1.5 py-0.5 rounded font-mono font-bold block text-center">
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
                            <span className="font-mono font-bold text-[var(--router-text)] shrink-0">{c.id}</span>
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
                          className="flex-1 py-1.5 bg-primary/10 hover:bg-primary/20 hover:text-[var(--router-text)] border border-primary/30 text-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
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
                  <div className="flex items-center gap-1 bg-[var(--router-surface-3)] border border-outline-variant/50 px-2.5 py-0.5 rounded text-[10px] w-fit text-on-surface-variant font-bold uppercase font-mono">
                    Verificando Registro Histórico
                  </div>
                  <h3 className="text-sm font-bold text-[var(--router-text)] flex items-center gap-1">
                    Visualização do Romaneio e Coleta #{previewRomaneio.id}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Placa do Veículo: <b className="font-mono text-primary uppercase">{previewRomaneio.vehiclePlate}</b> ({previewRomaneio.date}) | Conferente de Doca: <b>{previewRomaneio.helperName || 'Mestre'}</b>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={() => setPreviewRomaneio(null)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[#dae2fd] text-xs font-bold rounded-lg border border-[var(--router-input-border)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                        <b className="font-mono text-[var(--router-text)] text-sm">#{previewRomaneio.id}</b>
                      </div>
                      
                      <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                        <span>Data Emissão:</span>
                        <b className="font-mono text-[var(--router-text)]">{previewRomaneio.date}</b>
                      </div>

                      <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                        <span>Veículo Placa:</span>
                        <b className="font-mono text-primary text-sm uppercase">{previewRomaneio.vehiclePlate}</b>
                      </div>

                      <div className="space-y-0.5 border-b border-outline-variant/20 pb-2">
                        <span className="block text-[10px] text-on-surface-variant/70">Motorista Vinculado:</span>
                        <b className="block text-[var(--router-text)] font-sans">{previewRomaneio.driverName}</b>
                      </div>

                      <div className="space-y-0.5 border-b border-outline-variant/20 pb-2">
                        <span className="block text-[10px] text-on-surface-variant/70">Ajudante na Doca:</span>
                        <b className="block text-[var(--router-text)] font-sans">{previewRomaneio.helperName || "-"}</b>
                      </div>

                      {previewRomaneio.observations && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-on-surface-variant/70">Anotações da Viagem:</span>
                          <span className="block bg-surface p-2.5 border border-[var(--router-input-border)] text-on-surface italic rounded-lg text-[11px]">
                            "{previewRomaneio.observations}"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--router-surface-3)] border border-outline-variant p-4 rounded-xl text-left space-y-2">
                    <h5 className="text-[10px] font-bold text-[#dae2fd] uppercase tracking-wider font-mono">Ajuda Operacional</h5>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Ao re-imprimir a separação de um romaneio finalizado, toda a formatação de tabelas é adaptada estritamente para folhas A4 em preto e branco.
                    </p>
                  </div>
                </div>

                {/* Checklist Layout (printable print-area) */}
                <div className="lg:col-span-8 space-y-4 print-area text-left bg-[var(--router-surface)] text-gray-900 rounded-xl p-5 sm:p-7 border border-outline-variant/30 print:border-none shadow-xl print:shadow-none">
                  
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
                              className="w-4.5 h-4.5 border border-gray-400 rounded bg-[var(--router-surface)] flex items-center justify-center shrink-0 cursor-pointer text-blue-600 focus:outline-none"
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
                  <h1 className="text-2xl font-black text-[var(--router-text)] tracking-tight uppercase">Pré-Romaneios de Separação</h1>
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
                <h3 className="text-base font-bold text-[var(--router-text)]">Nenhum pré-romaneio localizado</h3>
                <p className="text-xs text-center leading-relaxed">
                  Não foram encontrados pré-romaneios para o dia de planejamento ativo <span className="font-mono font-bold text-[var(--router-text)]">{manifestDate}</span>. Vá para a <span className="font-semibold text-primary">Mesa de Roteirização</span> para gerar pré-romaneios de separação.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {preRomaneios.map((pr) => {
                const totalW = pr.totalWeight || 0;
                const totalVol = pr.totalVolumes || 0;
                
                // Get pre_romaneio status color
                let statusBg = 'bg-[var(--router-border)]/10 border-[var(--router-border)]/20 text-[var(--router-text-muted)]';
                if (pr.status === 'EM_SEPARACAO') statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                if (pr.status === 'SEPARADO') statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                if (pr.status === 'COM_DIVERGENCIA') statusBg = 'bg-rose-500/10 border-rose-500/20 text-rose-450';
                if (pr.status === 'CANCELADO') statusBg = 'bg-red-500/10 border-red-500/20 text-red-500';
                if (pr.status === 'CONVERTIDO_ROMANEIO') statusBg = 'bg-blue-500/10 border-blue-500/20 text-blue-400';

                return (
                  <div key={pr.id} className="bg-surface-container border border-outline-variant/70 rounded-2xl p-5 hover:border-[var(--router-primary)]-variant transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-on-surface-variant block uppercase tracking-wider">ROTA / DESTINO</span>
                          <span className="text-base font-black text-[var(--router-text)] uppercase tracking-tight">{pr.route}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${statusBg}`}>
                          {pr.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-surface/40 p-3 rounded-xl border border-outline-variant/30 font-mono text-xs">
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Portão / Doca</span>
                          <span className="text-[var(--router-text)] font-bold">{pr.gate || 'Não Definido'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Data Planejada</span>
                          <span className="text-[var(--router-text)] font-bold">{pr.planningDate}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">CTRCs / NFS</span>
                          <span className="text-[var(--router-text)] font-bold">{pr.ctrcIds.length} Itens</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-on-surface-variant uppercase block">Peso / Volume</span>
                          <span className="text-[var(--router-text)] font-bold">{totalW.toLocaleString('pt-BR')} kg / {totalVol} vol</span>
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
                              onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'vehiclePlate', e.target.value.toUpperCase())}
                              placeholder="Placa (ex: ABC1234)"
                              className="w-full bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-3)] focus:bg-[var(--router-surface-2)] border border-[var(--router-input-border)] hover:border-[var(--router-primary)] rounded px-2 py-1 text-[var(--router-text)] placeholder-slate-500 font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Motorista</label>
                            <input
                              type="text"
                              value={pr.driverName || ''}
                              onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'driverName', e.target.value)}
                              placeholder="Nome Motorista"
                              className="w-full bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-3)] focus:bg-[var(--router-surface-2)] border border-[var(--router-input-border)] hover:border-[var(--router-primary)] rounded px-2 py-1 text-[var(--router-text)] placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Ajudante</label>
                            <input
                              type="text"
                              value={pr.helperName || ''}
                              onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'helperName', e.target.value)}
                              placeholder="Nome Ajudante"
                              className="w-full bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-3)] focus:bg-[var(--router-surface-2)] border border-[var(--router-input-border)] hover:border-[var(--router-primary)] rounded px-2 py-1 text-[var(--router-text)] placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Portão/Doca</label>
                            <input
                              type="text"
                              value={pr.gate || ''}
                              onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'gate', e.target.value)}
                              placeholder="Portão ou Doca"
                              className="w-full bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-3)] focus:bg-[var(--router-surface-2)] border border-[var(--router-input-border)] hover:border-[var(--router-primary)] rounded px-2 py-1 text-[var(--router-text)] placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[8.5px] text-on-surface-variant uppercase font-bold block mb-1">Observações</label>
                            <input
                              type="text"
                              value={pr.observations || ''}
                              onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'observations', e.target.value)}
                              placeholder="Obs/Instruções"
                              className="w-full bg-[var(--router-input-bg)] hover:bg-[var(--router-surface-3)] focus:bg-[var(--router-surface-2)] border border-[var(--router-input-border)] hover:border-[var(--router-primary)] rounded px-2 py-1 text-[var(--router-text)] placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleDeletePreRomaneioAction(pr)}
                        className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        title="Excluir Pré-Romaneio"
                      >
                        <X className="w-4 h-4" />
                      </button>

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
                        onChange={(e) => handleUpdatePreRomaneioField(pr.id, 'status', e.target.value)}
                        className="bg-[var(--router-surface-3)] border border-outline-variant/50 hover:border-[var(--router-primary)]-variant rounded-lg px-2 py-2 text-xs text-[var(--router-text)] font-mono cursor-pointer focus:outline-none"
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
        <div className="hidden print:block print-area text-black bg-[var(--router-surface)] w-full text-left font-sans p-2">
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
            <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">FROTA PRÓPRIA ESTÁVEL (CLASSIFICAÇÃO PENDENTE)</h2>
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
            <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">APOIO / NÃO CLASSIFICADO (AGREGADOS)</h2>
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

      {activeTab === 'preromaneio' && (
        <div className="hidden print:block print-area text-black bg-[var(--router-surface)] w-full text-left font-sans p-2">
          {(printPreRomaneios.length > 0 ? printPreRomaneios : preRomaneios).map((pr, pIdx) => {
            const isLast = pIdx === (printPreRomaneios.length > 0 ? printPreRomaneios : preRomaneios).length - 1;

            const formatPlanningDate = (dateStr: string) => {
              if (!dateStr) return 'SEM DATA';
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              }
              return dateStr;
            };

            const formatRouteText = (routeStr: string) => {
              if (!routeStr) return '';
              const match = routeStr.match(/\d+/);
              if (match) {
                return parseInt(match[0], 10).toString();
              }
              return routeStr.toUpperCase().replace('ROTA', '').trim();
            };

            const ctrcsList = (pr.ctrcIds || [])
              .map((id) => resolvedCtrcsMap[id])
              .filter(Boolean);

            const sortedCtrcs = [...ctrcsList].sort((a, b) => {
              // 1. Cidade
              const cityA = (a.cidade_ent || a.cidade || '').toUpperCase().trim();
              const cityB = (b.cidade_ent || b.cidade || '').toUpperCase().trim();
              if (cityA !== cityB) {
                return cityA.localeCompare(cityB, 'pt-BR');
              }

              // 2. Bairro
              const bA = (a.bairro || '').toUpperCase().trim();
              const bB = (b.bairro || '').toUpperCase().trim();
              if (bA !== bB) {
                return bA.localeCompare(bB, 'pt-BR');
              }

              // 3. Destinatário
              const destA = (a.destinatario || '').toUpperCase().trim();
              const destB = (b.destinatario || '').toUpperCase().trim();
              if (destA !== destB) {
                return destA.localeCompare(destB, 'pt-BR');
              }

              // 4. CTRC ID
              const idA = (a.id || '').toUpperCase().trim();
              const idB = (b.id || '').toUpperCase().trim();
              return idA.localeCompare(idB, 'pt-BR');
            });

            return (
              <div key={pr.id} className={`w-full min-h-screen ${isLast ? '' : 'page-break'} pb-6 leading-tight`}>
                
                {/* CABEÇALHO MODELO EXCEL */}
                <div className="border border-black p-3 mb-4 rounded bg-[var(--router-surface)] text-black font-mono">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <h1 className="text-base font-black tracking-tight leading-none uppercase">
                        PRÉ-ROMANEIO {pr.route.toUpperCase()} - {formatPlanningDate(pr.planningDate)}
                      </h1>
                      <div className="text-xs font-bold leading-none">
                        ROTA: {formatRouteText(pr.route)}
                      </div>
                      <div className="text-lg font-black tracking-wide leading-none uppercase mt-1">
                        {pr.vehiclePlate ? `${pr.vehiclePlate.toUpperCase()}  ${(pr.driverName || 'NÃO ATRIBUÍDO').toUpperCase()}` : 'SEM PLACA | MOTORISTA NÃO INFORMADO'}
                      </div>
                      <div className="text-[11px] font-bold leading-none text-gray-800">
                        Ajud.: {(pr.helperName || 'NÃO ATRIBUÍDO').toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1 text-[11px] font-bold">
                      <div>Total CTRC: <span className="font-extrabold text-black">{pr.ctrcIds.length}</span></div>
                      <div>Peso: <span className="font-extrabold text-black">{pr.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span></div>
                      <div>Qt vol.: <span className="font-extrabold text-black">{String(pr.totalVolumes).padStart(4, '0')}</span></div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <div className="text-[10px] font-black text-red-600 uppercase tracking-wider leading-none">
                      * EM DESTAQUE OS CLIENTES CURVA A *
                    </div>
                  </div>
                </div>

                {/* COLUNAS PRINCIPAIS */}
                <table className="w-full text-[10px] text-left border-collapse border border-black table-fixed">
                  <thead>
                    <tr className="bg-gray-100 uppercase font-black text-[9px] font-mono border-b border-black">
                      <th className="border border-black px-2 py-1.5 w-[16%]">CTRC</th>
                      <th className="border border-black px-2 py-1.5 w-[14%]">NF</th>
                      <th className="border border-black px-2 py-1.5 w-[42%]">REMETENTE / DESTINATÁRIO</th>
                      <th className="border border-black px-2 py-1.5 w-[28%]">CIDADE / BAIRRO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCtrcs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="border border-black px-3 py-6 text-center text-gray-500 italic">
                          Nenhum documento eletrônico vinculado a este pré-romaneio.
                        </td>
                      </tr>
                    ) : (
                      sortedCtrcs.map((ctrc, index) => {
                        const isCurvaA = isClienteCurvaA(ctrc, curvaAClients).isCurvaA;
                        const isAgendamento = ctrc.status === 'Agendamento';
                        const weight = (ctrc.peso_r || ctrc.weight || 0);
                        const vols = ctrc.volume || 0;
                        
                        const weightFormatted = weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
                        const volsFormatted = String(vols).padStart(4, '0');
                        const prevEntStr = ctrc.prev_ent ? formatPlanningDate(ctrc.prev_ent) : 'SEM PREVISÃO';

                        // Curva A styling
                        const rowBgClass = isCurvaA ? 'bg-red-50/70 text-red-700 font-bold' : 'bg-[var(--router-surface)] text-black';
                        const borderColClass = isCurvaA ? 'border-red-500' : 'border-gray-400';
                        const textBoldClass = isCurvaA ? 'text-red-900 font-black' : 'text-black';

                        return (
                          <React.Fragment key={ctrc.id || index}>
                            {/* Linha 1: CTRC | NF | REMETENTE | CIDADE */}
                            <tr className={`${rowBgClass} text-[10px]`}>
                              <td className={`border ${borderColClass} px-2 py-1 font-mono font-bold flex items-center gap-1.5`}>
                                <div className={`w-3.5 h-3.5 border ${isCurvaA ? 'border-red-500 bg-red-100' : 'border-black'} shrink-0 bg-[var(--router-surface)] rounded-sm`}></div>
                                <span className={`leading-none ${isCurvaA ? 'text-red-700 font-bold' : 'text-black'}`}>{ctrc.id}</span>
                                {isAgendamento && (
                                  <span className="ml-1 px-1 py-0.5 bg-cyan-100 text-cyan-800 border border-cyan-500 text-[7.5px] font-black uppercase tracking-wider rounded shrink-0 leading-none inline-block">
                                    [AG]
                                  </span>
                                )}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-1 font-mono`}>
                                {ctrc.nf || '—'}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-1 uppercase truncate font-mono ${textBoldClass}`}>
                                {isCurvaA ? (
                                  <span className="text-red-600 font-extrabold border border-red-500 bg-red-50 px-1 py-0.5 rounded leading-none uppercase inline-block">
                                    ★ [CURVA A] {ctrc.remetente}
                                  </span>
                                ) : (
                                  ctrc.remetente || '—'
                                )}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-1 uppercase font-mono truncate`}>
                                {(ctrc.cidade_ent || ctrc.cidade || '').toUpperCase()}
                              </td>
                            </tr>

                            {/* Linha 2: (empty) | DESTINATÁRIO | BAIRRO */}
                            <tr className={`${rowBgClass} text-[10px]`}>
                              <td className={`border-l border-b border-r ${borderColClass} px-2 py-0.5`} colSpan={2}>
                                {/* Alignment blank space */}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-0.5 uppercase tracking-wide truncate font-semibold text-gray-800`}>
                                {ctrc.destinatario || '—'}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-0.5 uppercase text-gray-500 truncate`}>
                                {ctrc.bairro || ''}
                              </td>
                            </tr>

                            {/* Linha 3: (empty) | Previsão, Vol, Peso list */}
                            <tr className={`${rowBgClass} border-b-2 ${isCurvaA ? 'border-b-red-400' : 'border-b-black/80'} text-[9px]`}>
                              <td className={`border-l border-b border-r ${borderColClass} px-2 py-0.5`} colSpan={2}>
                                {/* Alignment blank space */}
                              </td>
                              <td className={`border ${borderColClass} px-2 py-0.5 font-mono text-gray-600`} colSpan={2}>
                                <div className="flex flex-wrap items-center gap-x-5 leading-none">
                                  <span>
                                    Prev. Ent.: <strong className="text-black font-extrabold">{prevEntStr}</strong>
                                    {isAgendamento && (
                                      <span className="ml-1.5 px-1 py-0.2 bg-cyan-100 text-cyan-800 border border-cyan-400 text-[8px] font-black uppercase tracking-wider font-sans leading-none inline-block">
                                        [AG]
                                      </span>
                                    )}
                                  </span>
                                  <span>
                                    QT VOL.: <strong className="text-black font-extrabold">{volsFormatted}</strong>
                                  </span>
                                  <span>
                                    Peso: <strong className="text-black font-extrabold">{weightFormatted}</strong>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* ASSINATURAS / CONFERÊNCIA INTERNA */}
                <div className="border border-black rounded p-3 mt-4 bg-[var(--router-surface)] space-y-3 font-mono text-black">
                  <h3 className="text-[10px] font-black uppercase tracking-wider border-b border-black pb-1">
                    CONFERÊNCIA INTERNA DE EXPEDIÇÃO:
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 text-[10px]">
                    <div className="flex items-end gap-1.5">
                      <span className="font-bold">Separador:</span>
                      <div className="border-b border-black h-4 flex-grow"></div>
                    </div>
                    
                    <div className="flex items-end gap-1.5">
                      <span className="font-bold">Conferente:</span>
                      <div className="border-b border-black h-4 flex-grow"></div>
                    </div>
                    
                    <div className="flex items-end gap-1.5">
                      <span className="font-bold">Horário início:</span>
                      <div className="border-b border-black h-4 w-28"></div>
                    </div>
                    
                    <div className="flex items-end gap-1.5">
                      <span className="font-bold">Horário fim:</span>
                      <div className="border-b border-black h-4 w-28"></div>
                    </div>
                  </div>
                  
                  <div className="pt-1.5">
                    <span className="text-[10px] font-bold block">Observações / Divergências:</span>
                    <div className="border border-black h-12 mt-1.5 relative">
                      <div className="absolute top-4 left-0 w-full border-b border-black/20"></div>
                      <div className="absolute top-8 left-0 w-full border-b border-black/20"></div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {quickRegisterPlate !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-[var(--router-surface-3)] border border-[var(--router-border)] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-left">
            <div className="flex justify-between items-center bg-[var(--router-surface-2)] px-6 py-4 border-b border-[var(--router-border)]">
              <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Homologação Rápida de Veículo
              </h3>
              <button
                type="button"
                onClick={() => setQuickRegisterPlate(null)}
                className="text-[var(--router-text-muted)] hover:text-[var(--router-text)] p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Placa do Veículo *</label>
                  <input
                    type="text"
                    required
                    value={quickRegisterPlate}
                    onChange={(e) => setQuickRegisterPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: RTA3G45"
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Classificação de Frota</label>
                  <select
                    value={quickTipo}
                    onChange={(e) => setQuickTipo(e.target.value as any)}
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none cursor-pointer"
                  >
                    <option value="PROPRIO">PRÓPRIO (Frota Própria Estável)</option>
                    <option value="AGREGADO">AGREGADO</option>
                    <option value="APOIO">APOIO (Frota de Apoio)</option>
                    <option value="TERCEIRO">TERCEIRO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Rastreamento GR</label>
                  <select
                    value={quickRastreado ? 'true' : 'false'}
                    onChange={(e) => setQuickRastreado(e.target.value === 'true')}
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none cursor-pointer"
                  >
                    <option value="true">Rastreado</option>
                    <option value="false">Sem Rastreio</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Limite GR Sugerido (R$)</label>
                  <input
                    type="number"
                    value={quickLimiteGrSugerido}
                    onChange={(e) => setQuickLimiteGrSugerido(Number(e.target.value))}
                    placeholder="Ex: 500000"
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Motorista Padrão</label>
                  <input
                    type="text"
                    value={quickMotoristaPadrao}
                    onChange={(e) => setQuickMotoristaPadrao(e.target.value)}
                    placeholder="Nome do motorista"
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Ajudante Padrão</label>
                  <input
                    type="text"
                    value={quickAjudantePadrao}
                    onChange={(e) => setQuickAjudantePadrao(e.target.value)}
                    placeholder="Nome do ajudante"
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Status Operacional</label>
                  <select
                    value={quickStatusOperacional}
                    onChange={(e) => setQuickStatusOperacional(e.target.value as any)}
                    className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none cursor-pointer"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="MANUTENCAO">MANUTENÇÃO</option>
                    <option value="INATIVO">INATIVO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">Observações</label>
                <textarea
                  value={quickObservacoes}
                  onChange={(e) => setQuickObservacoes(e.target.value)}
                  placeholder="Alguma observação importante..."
                  rows={2}
                  className="w-full bg-[var(--router-input-bg)] border border-[var(--router-border)] hover:bg-[var(--router-surface-2)] focus:bg-[var(--router-surface)] focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--router-border)] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setQuickRegisterPlate(null)}
                  className="px-4 py-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface)] border border-[var(--router-border)] text-[var(--router-text-muted)] hover:text-[var(--router-text)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-md"
                >
                  Salvar e Validar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
