import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { 
  OperationalUnitBI, 
  Vehicle, 
  DriverScore, 
  DeliveryOccurrence, 
  CurvaAClient, 
  CriticClient, 
  AppUser,
  OperationalCalendarEvent,
  VehicleRegistry
} from '../types';
import { db } from '../infrastructure/localdb/db';
import { OperationalUnitBIRepository } from '../infrastructure/localdb/repositories/operationalUnitBIRepository';
import { OperationalCalendarRepository } from '../infrastructure/localdb/repositories/operationalCalendarRepository';
import OcorrenciasView from './OcorrenciasView';
import CidadesRotasView from './CidadesRotasView';
import CurvaAView from './CurvaAView';
import ClientesView from './ClientesView';
import FrotaView from './FrotaView';
import { Search, RotateCcw, Archive, CheckCircle2, RefreshCw } from 'lucide-react';

interface BaseDadosViewProps {
  adminUser: AppUser;
  vehicles: Vehicle[];
  onAddVehicle: (v: Vehicle) => void;
  onUpdateVehicle: (v: Vehicle) => void;
  onRemoveVehicle: (id: string) => void;
  drivers: DriverScore[];
  onAddDriver: (d: DriverScore) => void;
  onUpdateDriver: (d: DriverScore) => void;
  onRemoveDriver: (id: string) => void;
  occurrences: DeliveryOccurrence[];
  onAddOccurrence: (o: DeliveryOccurrence) => void;
  onUpdateOccurrence: (o: DeliveryOccurrence) => void;
  onRemoveOccurrence: (codigo: string) => void;
  onBulkImportOccurrences: (list: DeliveryOccurrence[]) => void;
  curvaAClients: CurvaAClient[];
  onAddCurvaA: (c: CurvaAClient) => void;
  onUpdateCurvaA: (c: CurvaAClient) => void;
  onRemoveCurvaA: (cnpj: string) => void;
  onBulkImportCurvaA: (list: CurvaAClient[]) => void;
  criticClients: CriticClient[];
  onAddAuditNote: (clientId: string, note: string) => void;
  searchValue: string;
  vehicleRegistries?: VehicleRegistry[];
  onAddVehicleRegistry?: (vr: VehicleRegistry) => void;
  onUpdateVehicleRegistry?: (vr: VehicleRegistry) => void;
  onRemoveVehicleRegistry?: (placa: string) => void;
  onRefreshCtrcs?: () => void;
}

type TabId = 
  | 'unidades' 
  | 'historico_ctrcs'
  | 'ocorrencias' 
  | 'cidades_rotas' 
  | 'curva_a' 
  | 'clientes_especiais' 
  | 'feriados' 
  | 'veiculos' 
  | 'motoristas';

export default function BaseDadosView({
  adminUser,
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  drivers,
  onAddDriver,
  onUpdateDriver,
  onRemoveDriver,
  occurrences,
  onAddOccurrence,
  onUpdateOccurrence,
  onRemoveOccurrence,
  onBulkImportOccurrences,
  curvaAClients,
  onAddCurvaA,
  onUpdateCurvaA,
  onRemoveCurvaA,
  onBulkImportCurvaA,
  criticClients,
  onAddAuditNote,
  searchValue: globalSearchValue,
  vehicleRegistries = [],
  onAddVehicleRegistry = () => {},
  onUpdateVehicleRegistry = () => {},
  onRemoveVehicleRegistry = () => {},
  onRefreshCtrcs,
}: BaseDadosViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('unidades');

  // --- TAB: CATÁLOGO / HISTÓRICO DE CTRCS STATES ---
  const [ctrcsList, setCtrcsList] = useState<any[]>([]);
  const [ctrcSearch, setCtrcSearch] = useState('');
  const [ctrcFilterStatus, setCtrcFilterStatus] = useState('ALL');
  const [ctrcFilterUnit, setCtrcFilterUnit] = useState('ALL');
  const [ctrcFilterIsActive, setCtrcFilterIsActive] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORICAL'

  const loadCtrcsList = async () => {
    try {
      const list = await db.ctrcs.toArray();
      setCtrcsList(list);
    } catch (e) {
      console.error('[BaseDadosView] Erro ao carregar CTRCs:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico_ctrcs') {
      loadCtrcsList();
    }
  }, [activeTab]);

  const handleToggleCtrcActive = async (ctrc: any) => {
    try {
      const currentActive = ctrc.isActiveForRouting !== undefined
        ? ctrc.isActiveForRouting
        : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || ctrc.status === 'Finalizado' || ctrc.status === 'Cancelado');

      const updated = {
        ...ctrc,
        isActiveForRouting: !currentActive
      };

      await db.ctrcs.put(updated);
      await loadCtrcsList();
      if (onRefreshCtrcs) {
        onRefreshCtrcs();
      }
    } catch (e) {
      console.error('[BaseDadosView] Erro ao alternar atividade do CTRC:', e);
    }
  };

  // --- TAB: UNIDADES OPERACIONAIS STATES ---
  const [unidades, setUnidades] = useState<OperationalUnitBI[]>([]);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilterType, setUnitFilterType] = useState('TODOS');
  const [unitFilterUf, setUnitFilterUf] = useState('TODAS');
  const [unitFilterAtivo, setUnitFilterAtivo] = useState('TODOS');

  // Modal / Form States
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OperationalUnitBI | null>(null);
  const [formUnidade, setFormUnidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formTipo, setFormTipo] = useState('Unidade');
  const [formRespOper, setFormRespOper] = useState('');
  const [formRespCom, setFormRespCom] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formControleParceiros, setFormControleParceiros] = useState(false);
  const [formParceiroUrbano, setFormParceiroUrbano] = useState(false);
  const [formAtivo, setFormAtivo] = useState(true);

  // File drop states
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- TAB: FERIADOS OPERACIONAIS STATES ---
  const [feriados, setFeriados] = useState<OperationalCalendarEvent[]>([]);
  const [holidaySearch, setHolidaySearch] = useState('');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<OperationalCalendarEvent | null>(null);
  
  // Holiday Form
  const [formHoldayDate, setFormHolidayDate] = useState('');
  const [formHolidayCity, setFormHolidayCity] = useState('');
  const [formHolidayDesc, setFormHolidayDesc] = useState('');
  const [formHolidaySeverity, setFormHolidaySeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [formHolidayActive, setFormHolidayActive] = useState(true);

  const isMaster = adminUser?.is_master === true;

  // Load Unidades & Feriados initially
  useEffect(() => {
    loadUnidadesData();
    loadFeriadosData();
  }, []);

  const loadUnidadesData = async () => {
    try {
      const data = await OperationalUnitBIRepository.getAll();
      setUnidades(data);
    } catch (err) {
      console.error('Erro ao carregar unidades operacionais BI:', err);
    }
  };

  const loadFeriadosData = async () => {
    try {
      const data = await OperationalCalendarRepository.getAll();
      setFeriados(data);
    } catch (err) {
      console.error('Erro ao carregar feriados operacionais:', err);
    }
  };

  // --- UNIDADES ACTIONS ---
  const handleOpenUnitModal = (unit: OperationalUnitBI | null = null) => {
    setEditingUnit(unit);
    if (unit) {
      setFormUnidade(unit.unidade);
      setFormUf(unit.uf);
      setFormTipo(unit.tipo);
      setFormRespOper(unit.responsavelOperacional || '');
      setFormRespCom(unit.responsavelComercial || '');
      setFormResponsavel(unit.responsavel || '');
      setFormControleParceiros(!!unit.controleParceiros);
      setFormParceiroUrbano(!!unit.parceiroUrbano);
      setFormAtivo(unit.ativo !== false);
    } else {
      setFormUnidade('');
      setFormUf('');
      setFormTipo('Unidade');
      setFormRespOper('');
      setFormRespCom('');
      setFormResponsavel('');
      setFormControleParceiros(false);
      setFormParceiroUrbano(false);
      setFormAtivo(true);
    }
    setShowUnitModal(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;

    if (!formUnidade || !formUf) {
      alert('Unidade e UF são campos obrigatórios.');
      return;
    }

    const payload: OperationalUnitBI = {
      id: editingUnit?.id,
      unidade: formUnidade.toUpperCase().trim(),
      uf: formUf.toUpperCase().trim(),
      tipo: formTipo.trim(),
      responsavelOperacional: formRespOper.trim() || null,
      responsavelComercial: formRespCom.trim() || null,
      responsavel: formResponsavel.trim() || null,
      controleParceiros: formControleParceiros,
      parceiroUrbano: formParceiroUrbano,
      ativo: formAtivo,
      createdAt: editingUnit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await OperationalUnitBIRepository.upsert(payload);
      setShowUnitModal(false);
      loadUnidadesData();
    } catch (err) {
      console.error('Erro ao salvar unidade operacional:', err);
      alert('Ocorreu um erro ao salvar o registro.');
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!isMaster) return;
    if (!window.confirm('Tem certeza de que deseja remover esta unidade operacional?')) return;

    try {
      await OperationalUnitBIRepository.remove(id);
      loadUnidadesData();
    } catch (err) {
      console.error('Erro ao remover unidade:', err);
      alert('Não foi possível remover a unidade.');
    }
  };

  const handleToggleUnitActivation = async (unit: OperationalUnitBI) => {
    if (!isMaster || !unit.id) return;
    try {
      const updated = { ...unit, ativo: !unit.ativo };
      await OperationalUnitBIRepository.upsert(updated);
      loadUnidadesData();
    } catch (err) {
      console.error('Erro ao alternar ativação:', err);
    }
  };

  // Download export handlers
  const handleExportJson = async () => {
    try {
      const jsonStr = await OperationalUnitBIRepository.exportToJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bd_unidades_operacionais_bi_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha na exportação JSON:', err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = await OperationalUnitBIRepository.exportToCsv();
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bd_unidades_operacionais_bi_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha na exportação CSV:', err);
    }
  };

  // Draggable Drop Handlers for Imports
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMaster) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isMaster) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    const isJson = file.name.endsWith('.json');
    const isCsv = file.name.endsWith('.csv');

    if (!isJson && !isCsv) {
      alert('Formato não suportado. Carregue um arquivo JSON ou CSV contendo as colunas mestre.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        if (isJson) {
          const parsed = JSON.parse(content);
          const records = Array.isArray(parsed) ? parsed : (parsed.records || []);
          if (!records || records.length === 0) {
            alert('Não foram encontrados registros úteis de unidades operacionais no JSON.');
            return;
          }
          await OperationalUnitBIRepository.importFromJson(records);
        } else {
          // Parse CSV
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length < 2) {
            alert('Arquivo CSV vazio ou sem cabeçalho.');
            return;
          }
          
          // Detect splitter (comma or semicolon)
          const firstLine = lines[0];
          const sep = firstLine.includes(';') ? ';' : ',';
          const headers = firstLine.split(sep).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

          const records: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g, '').trim());
            const row: any = {};
            headers.forEach((h, idx) => {
              const val = cols[idx];
              if (h === 'unidade') row.unidade = val;
              else if (h === 'uf') row.uf = val;
              else if (h === 'tipo') row.tipo = val;
              else if (h === 'responsavel operacional' || h === 'responsaveloperacional' || h === 'responsavel oper' || h === 'responsavel_oper') row.responsavelOperacional = val;
              else if (h === 'responsavel comercial' || h === 'responsavelcomercial' || h === 'responsavel cml' || h === 'responsavel_comercial') row.responsavelComercial = val;
              else if (h === 'responsável' || h === 'responsavel') row.responsavel = val;
              else if (h === 'controle de parceiros' || h === 'controleparceiros' || h === 'controle_parceiros') row.controleParceiros = val === 'true' || val === '1';
              else if (h === 'parceiro - urbano' || h === 'parceirourbano' || h === 'parceiro_urbano') row.parceiroUrbano = val === 'true' || val === '1';
              else if (h === 'ativo') row.ativo = val !== 'false' && val !== '0';
            });
            if (row.unidade) {
              records.push(row);
            }
          }

          if (records.length === 0) {
            alert('Falha ao processar as colunas do CSV de entrada.');
            return;
          }

          await OperationalUnitBIRepository.importFromJson(records);
        }

        alert(`Sucesso! Foram importados registros úteis com sucesso.`);
        loadUnidadesData();
      } catch (err) {
        console.error('Erro ao processar import de arquivo:', err);
        alert('Falha ao converter ou salvar dados do arquivo.');
      }
    };
    reader.readAsText(file);
  };

  // --- FERIADOS ACTIONS ---
  const handleOpenHolidayModal = (h: OperationalCalendarEvent | null = null) => {
    setEditingHoliday(h);
    if (h) {
      setFormHolidayDate(h.date || '');
      setFormHolidayCity(h.city || 'GERAL');
      setFormHolidayDesc(h.description || '');
      setFormHolidaySeverity(h.severity || 'WARNING');
      setFormHolidayActive(h.active !== false);
    } else {
      setFormHolidayDate('');
      setFormHolidayCity('GERAL');
      setFormHolidayDesc('');
      setFormHolidaySeverity('WARNING');
      setFormHolidayActive(true);
    }
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;

    if (!formHoldayDate || !formHolidayDesc) {
      alert('Data e Descrição são obrigatórios.');
      return;
    }

    const [year, month, day] = formHoldayDate.split('-');
    const cityUpper = formHolidayCity.trim().toUpperCase() || 'GERAL';
    const slugDesc = formHolidayDesc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').slice(0, 15);
    const slugCity = cityUpper.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    
    const id = editingHoliday?.id || `${formHoldayDate}_${slugCity}_${slugDesc}_${Math.floor(100+Math.random()*900)}`;

    const event: OperationalCalendarEvent = {
      id,
      date: formHoldayDate,
      dayMonth: `${day}/${month}`,
      year: parseInt(year, 10) || 2026,
      city: cityUpper,
      uf: 'MG',
      description: formHolidayDesc.trim(),
      eventType: 'OUTROS',
      recurrenceType: 'FIXED_YEARLY',
      active: formHolidayActive,
      source: editingHoliday?.source || 'MANUAL',
      severity: formHolidaySeverity,
      createdAt: editingHoliday?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await OperationalCalendarRepository.putMany([event]);
      setShowHolidayModal(false);
      loadFeriadosData();
    } catch (err) {
      console.error('Erro ao salvar feriado:', err);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!isMaster) return;
    if (!window.confirm('Excluir este feriado do calendário?')) return;
    try {
      await db.operational_calendar_events.delete(id);
      loadFeriadosData();
    } catch (err) {
      console.error('Erro ao excluir feriado:', err);
    }
  };

  // Filtering Unidades
  const filteredUnidades = unidades.filter(item => {
    // Search
    const matchSearch = 
      item.unidade.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (item.responsavel || '').toLowerCase().includes(unitSearch.toLowerCase()) ||
      (item.responsavelOperacional || '').toLowerCase().includes(unitSearch.toLowerCase());

    // Type
    const matchType = unitFilterType === 'TODOS' || item.tipo === unitFilterType;

    // UF
    const matchUf = unitFilterUf === 'TODAS' || item.uf === unitFilterUf;

    // Ativo
    const matchAtivo = 
      unitFilterAtivo === 'TODOS' || 
      (unitFilterAtivo === 'ATIVOS' && item.ativo !== false) ||
      (unitFilterAtivo === 'INATIVOS' && item.ativo === false);

    return matchSearch && matchType && matchUf && matchAtivo;
  });

  const uniqueUfs = Array.from(new Set(unidades.map(u => u.uf))).sort();
  const uniqueTypes = Array.from(new Set(unidades.map(u => u.tipo))).sort();

  // Filtering Holidays
  const filteredFeriados = feriados.filter(item => {
    const term = holidaySearch.toLowerCase();
    return (
      (item.city || '').toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      (item.date || '').includes(term)
    );
  });

  // JSX rendering helper
  const renderTabContent = () => {
    switch (activeTab) {
      case 'unidades':
        return (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-[#0e1726]/80 p-4 border border-[#1e2e4f]/70 rounded-xl">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search field */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar unidade..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="w-64 bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all font-sans"
                  />
                  {unitSearch && (
                    <button 
                      onClick={() => setUnitSearch('')} 
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <select
                  value={unitFilterType}
                  onChange={(e) => setUnitFilterType(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
                >
                  <option value="TODOS">Todos os Tipos</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <select
                  value={unitFilterUf}
                  onChange={(e) => setUnitFilterUf(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
                >
                  <option value="TODAS">Prevenção UF: Todas</option>
                  {uniqueUfs.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>

                <select
                  value={unitFilterAtivo}
                  onChange={(e) => setUnitFilterAtivo(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="ATIVOS">Ativas</option>
                  <option value="INATIVOS">Inativas</option>
                </select>
              </div>

              {/* Master Control actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJson}
                  className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
                >
                  📥 Exportar JSON
                </button>
                <button
                  onClick={handleExportCsv}
                  className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
                >
                  📥 Exportar CSV
                </button>
                {isMaster ? (
                  <button
                    onClick={() => handleOpenUnitModal(null)}
                    className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1"
                  >
                    ➕ Nova Unidade
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-400 rounded-lg select-none">
                    🔒 Modo Consulta
                  </div>
                )}
              </div>
            </div>

            {/* Drag & Drop File Upload Box (Master Only) */}
            {isMaster && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-250 select-none ${
                  isDragging 
                    ? 'border-indigo-400 bg-indigo-500/10 text-white' 
                    : 'border-[#1e3a6c]/50 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="file"
                  id="op-units-file-picker"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json,.csv"
                  className="hidden"
                />
                <span className="text-2xl mb-1.5">🗂️</span>
                <p className="text-sm font-bold">Importação em Massa (Mestre)</p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Arraste e solte o arquivo <strong className="text-indigo-400">bd_unidades_operacionais_bi.json</strong> ou <strong className="text-indigo-400">CSV</strong> aqui ou clique para selecionar.
                </p>
              </div>
            )}

            {/* Main Grid/Table list */}
            <div className="border border-[#14203a] bg-[#0b1322]/90 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e1726]/90 border-b border-[#14203a] text-indigo-300 font-bold text-xs select-none">
                    <th className="px-4 py-3 font-sans">Unidade</th>
                    <th className="px-4 py-3 font-sans">UF</th>
                    <th className="px-4 py-3 font-sans">Tipo</th>
                    <th className="px-4 py-3 font-sans">Resp. Operacional</th>
                    <th className="px-4 py-3 font-sans">Resp. Comercial</th>
                    <th className="px-4 py-3 font-sans">Responsável</th>
                    <th className="px-4 py-3 text-center font-sans">Parceiro Urbano</th>
                    <th className="px-4 py-3 text-center font-sans">Controle de Parc.</th>
                    <th className="px-4 py-3 text-center font-sans">Status</th>
                    {isMaster && <th className="px-4 py-3 text-right font-sans">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14203a] text-xs">
                  {filteredUnidades.length === 0 ? (
                    <tr>
                      <td colSpan={isMaster ? 10 : 9} className="text-center py-12 text-gray-500 font-sans">
                        Nenhuma unidade operacional correspondente aos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredUnidades.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-indigo-950/20 transition-colors ${!item.ativo ? 'opacity-55 bg-black/10' : ''}`}
                      >
                        <td className="px-4 py-3.5 font-bold font-mono text-white text-[13px]">
                          {item.unidade}
                        </td>
                        <td className="px-4 py-3.5 font-sans">
                          <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.uf}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            item.tipo === 'Unidade' 
                              ? 'bg-emerald-950 text-emerald-300' 
                              : 'bg-amber-950 text-amber-300'
                          }`}>
                            {item.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">
                          {item.responsavelOperacional || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">
                          {item.responsavelComercial || '—'}
                        </td>
                        <td className="px-4 py-3.5 font-sans text-gray-300">
                          {item.responsavel || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          {item.parceiroUrbano ? '✅ Sim' : '❌ Não'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          {item.controleParceiros ? '✅ Sim' : '❌ Não'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          <button
                            disabled={!isMaster}
                            onClick={() => handleToggleUnitActivation(item)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold select-none ${
                              item.ativo !== false
                                ? 'bg-emerald-900/50 text-emerald-350 cursor-pointer hover:bg-emerald-800'
                                : 'bg-red-950 text-red-300 cursor-pointer hover:bg-red-900'
                            }`}
                          >
                            {item.ativo !== false ? '• ATIVO' : '• INATIVO'}
                          </button>
                        </td>
                        {isMaster && (
                          <td className="px-4 py-3.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenUnitModal(item)}
                                className="bg-indigo-900/40 hover:bg-indigo-850 border border-indigo-700/30 text-indigo-200 p-1.5 rounded cursor-pointer transition-colors"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteUnit(item.id!)}
                                className="bg-red-950/40 hover:bg-red-900/50 border border-red-800/20 text-red-300 p-1.5 rounded cursor-pointer transition-colors"
                                title="Deletar"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-[#0e1726]/40 border-t border-[#14203a] flex items-center justify-between text-[11px] text-gray-400 select-none">
                <span>Mostrando {filteredUnidades.length} de {unidades.length} registros</span>
                <span className="font-mono text-gray-500">Mesa de Unidades BI Master Database</span>
              </div>
            </div>
          </div>
        );

      case 'ocorrencias':
        return (
          <OcorrenciasView
            occurrences={occurrences}
            onAddOccurrence={onAddOccurrence}
            onUpdateOccurrence={onUpdateOccurrence}
            onRemoveOccurrence={onRemoveOccurrence}
            onBulkImportOccurrences={onBulkImportOccurrences}
            isSyncing={false}
            isMaster={isMaster}
          />
        );

      case 'cidades_rotas':
        return (
          <CidadesRotasView isMaster={isMaster} />
        );

      case 'curva_a':
        return (
          <CurvaAView
            clients={curvaAClients}
            onAddClient={onAddCurvaA}
            onUpdateClient={onUpdateCurvaA}
            onRemoveClient={onRemoveCurvaA}
            onBulkImportClients={onBulkImportCurvaA}
            isSyncing={false}
            isMaster={isMaster}
          />
        );

      case 'clientes_especiais':
        return (
          <ClientesView
            clients={criticClients}
            onAddAuditNote={onAddAuditNote}
            searchValue={globalSearchValue}
            isMaster={isMaster}
          />
        );

      case 'feriados':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-[#0e1726]/80 p-4 border border-[#1e2e4f]/70 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar feriados (Cidade, Descrição...)"
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  className="w-80 bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-400 font-sans"
                />
              </div>

              {isMaster ? (
                <button
                  onClick={() => handleOpenHolidayModal(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1"
                >
                  ➕ Novo Feriado
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-400 rounded-lg select-none">
                  🔒 Modo Consulta
                </div>
              )}
            </div>

            <div className="border border-[#14203a] bg-[#0b1322]/90 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0e1726]/90 border-b border-[#14203a] text-indigo-300 font-bold text-xs select-none">
                    <th className="px-4 py-3 font-sans">Data</th>
                    <th className="px-4 py-3 font-sans">Dia/Mês</th>
                    <th className="px-4 py-3 font-sans">Cidade</th>
                    <th className="px-4 py-3 font-sans">Descrição / Motivo</th>
                    <th className="px-4 py-3 font-sans">Gravidade</th>
                    <th className="px-4 py-3 text-center font-sans">Propagação</th>
                    {isMaster && <th className="px-4 py-3 text-right font-sans">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14203a] text-xs">
                  {filteredFeriados.length === 0 ? (
                    <tr>
                      <td colSpan={isMaster ? 7 : 6} className="text-center py-12 text-gray-500 font-sans">
                        Nenhum feriado correspondente à busca.
                      </td>
                    </tr>
                  ) : (
                    filteredFeriados.map((item) => (
                      <tr key={item.id} className="hover:bg-indigo-950/20 transition-colors">
                        <td className="px-4 py-3.5 font-bold font-mono text-white">
                          {item.date}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-300">
                          {item.dayMonth}
                        </td>
                        <td className="px-4 py-3.5 font-sans font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.city === 'GERAL' ? 'bg-indigo-950 text-indigo-300' : 'bg-rose-950 text-rose-350'
                          }`}>
                            {item.city}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-sans text-gray-200">
                          {item.description}
                        </td>
                        <td className="px-4 py-3.5 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                            item.severity === 'CRITICAL' ? 'bg-red-900/45 text-red-300' :
                            item.severity === 'WARNING' ? 'bg-amber-900/40 text-amber-300' : 'bg-slate-800 text-slate-350'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          {item.active ? '🟢 Ativo' : '🔴 Ocluso'}
                        </td>
                        {isMaster && (
                          <td className="px-4 py-3.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenHolidayModal(item)}
                                className="bg-indigo-900/40 hover:bg-indigo-850 border border-indigo-700/30 text-indigo-200 p-1.5 rounded cursor-pointer"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteHoliday(item.id!)}
                                className="bg-red-950/40 hover:bg-red-900/50 border border-red-800/20 text-red-300 p-1.5 rounded cursor-pointer"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-[#0e1726]/40 border-t border-[#14203a] text-[11px] text-gray-500 font-sans select-none">
                Calendar Operational Events DB Context Link
              </div>
            </div>
          </div>
        );

      case 'historico_ctrcs': {
        const uniqueCtrcStatuses = Array.from(new Set(ctrcsList.map(c => c.status).filter(Boolean))).sort();
        const uniqueCtrcUnits = Array.from(new Set(ctrcsList.map(c => (c.unid || '').toUpperCase()).filter(Boolean))).sort();

        const filteredHistoricalCtrcs = ctrcsList.filter((ctrc) => {
          const query = ctrcSearch.toLowerCase().trim();
          if (query) {
            const matchId = (ctrc.id || '').toLowerCase().includes(query);
            const matchDest = (ctrc.destinatario || '').toLowerCase().includes(query);
            const matchRem = (ctrc.remetente || '').toLowerCase().includes(query);
            const matchCid = (ctrc.cidade || '').toLowerCase().includes(query);
            const matchNf = (ctrc.nf || '').toLowerCase().includes(query);
            if (!matchId && !matchDest && !matchRem && !matchCid && !matchNf) {
              return false;
            }
          }

          if (ctrcFilterStatus !== 'ALL') {
            if ((ctrc.status || '').toUpperCase() !== ctrcFilterStatus.toUpperCase()) {
              return false;
            }
          }

          if (ctrcFilterUnit !== 'ALL') {
            if ((ctrc.unid || '').toUpperCase() !== ctrcFilterUnit.toUpperCase()) {
              return false;
            }
          }

          const currentActive = ctrc.isActiveForRouting !== undefined
            ? ctrc.isActiveForRouting
            : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || ctrc.status === 'Finalizado' || ctrc.status === 'Cancelado');

          if (ctrcFilterIsActive === 'ACTIVE') {
            if (!currentActive) return false;
          } else if (ctrcFilterIsActive === 'HISTORICAL') {
            if (currentActive) return false;
          }

          return true;
        });

        const activeCount = ctrcsList.filter(ctrc => {
          return ctrc.isActiveForRouting !== undefined
            ? ctrc.isActiveForRouting
            : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || ctrc.status === 'Finalizado' || ctrc.status === 'Cancelado');
        }).length;

        const historicalCount = ctrcsList.length - activeCount;

        return (
          <div className="space-y-6">
            {/* Filters and Search toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-[#0e1726]/85 p-4 border border-[#1e2e4f]/70 rounded-xl">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search Field */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar CTRC, Destinatário, NF..."
                    value={ctrcSearch}
                    onChange={(e) => setCtrcSearch(e.target.value)}
                    className="w-72 bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg pl-8 pr-8 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all font-sans"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  {ctrcSearch && (
                    <button 
                      onClick={() => setCtrcSearch('')} 
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status select filter */}
                <select
                  value={ctrcFilterStatus}
                  onChange={(e) => setCtrcFilterStatus(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
                >
                  <option value="ALL">Todos os Status</option>
                  {uniqueCtrcStatuses.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                {/* Filial select filter */}
                <select
                  value={ctrcFilterUnit}
                  onChange={(e) => setCtrcFilterUnit(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
                >
                  <option value="ALL">Todas as Filiais</option>
                  {uniqueCtrcUnits.map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>

                {/* Separation select filter */}
                <select
                  value={ctrcFilterIsActive}
                  onChange={(e) => setCtrcFilterIsActive(e.target.value)}
                  className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans font-bold text-indigo-450"
                >
                  <option value="ALL">Todas as Situações</option>
                  <option value="ACTIVE">🟢 Mesa Ativa (Apenas Operacional)</option>
                  <option value="HISTORICAL">📁 Catálogo / Histórico</option>
                </select>
              </div>

              {/* Statistics indicator box */}
              <div className="flex items-center gap-4 text-xs font-mono bg-[#0c1322] border border-[#1a2b4b] px-4 py-2 rounded-lg shrink-0">
                <div>Total: <span className="text-white font-bold">{ctrcsList.length}</span></div>
                <div className="text-gray-500">|</div>
                <div className="text-emerald-400">Ativos na Mesa: <span className="font-bold">{activeCount}</span></div>
                <div className="text-gray-500">|</div>
                <div className="text-amber-500">Histórico/KPIs: <span className="font-bold">{historicalCount}</span></div>
              </div>
            </div>

            {/* List and Table Grid */}
            <div className="bg-[#0b1322] border border-[#14203a] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-[#0e1726] border-b border-[#14203a] text-gray-300 uppercase font-mono text-[10px] select-none">
                      <th className="px-4 py-3">CTRC / ID</th>
                      <th className="px-4 py-3">Destinatário</th>
                      <th className="px-4 py-3">Cidade / Rota</th>
                      <th className="px-4 py-3">Peso / Vol</th>
                      <th className="px-4 py-3">Valor / Frete</th>
                      <th className="px-4 py-3 text-center">Unid</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Roteirização</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14203a]">
                    {filteredHistoricalCtrcs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-500 font-sans text-xs">
                          Nenhum CTRC encontrado com os filtros ativos.
                        </td>
                      </tr>
                    ) : (
                      filteredHistoricalCtrcs.map((ctrc) => {
                        const isCurrentActive = ctrc.isActiveForRouting !== undefined
                          ? ctrc.isActiveForRouting
                          : !(ctrc.status === 'Entregue' || ctrc.status === 'Recusado' || ctrc.status === 'Finalizado' || ctrc.status === 'Cancelado');

                        return (
                          <tr key={ctrc.id} className="hover:bg-[#121c30]/40 transition-colors text-xs font-sans text-gray-300">
                            <td className="px-4 py-2.5 font-mono text-indigo-300 font-semibold">{ctrc.id}</td>
                            <td className="px-4 py-2.5 truncate max-w-[200px] font-semibold text-slate-100" title={ctrc.destinatario}>{ctrc.destinatario}</td>
                            <td className="px-4 py-2.5">
                              <div className="font-semibold">{ctrc.cidade}</div>
                              {ctrc.setor && <div className="text-[10px] text-gray-500">{ctrc.setor}</div>}
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              <div>{ctrc.weight} kg</div>
                              <div className="text-[10px] text-gray-500">{ctrc.volume} vol</div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px]">
                              {ctrc.valor ? <div className="text-emerald-400 font-bold">R$ {ctrc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div> : <div className="text-gray-500">-</div>}
                              {ctrc.frete ? <div className="text-gray-400">F: R$ {ctrc.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div> : null}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-gray-400">{ctrc.unid}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ctrc.status === 'Entregue' || ctrc.status === 'Finalizado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                ctrc.status === 'Recusado' || ctrc.status === 'Cancelado' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              }`}>
                                {ctrc.status || 'Pendente'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {isCurrentActive ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                  Mesa Ativa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 bg-gray-500/10 border border-gray-500/20 px-2.5 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                  Histórico / Catálogo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => handleToggleCtrcActive(ctrc)}
                                title={isCurrentActive ? "Arquivar CTRC (Mover para Histórico)" : "Reativar CTRC para Roteirização"}
                                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                                  isCurrentActive 
                                    ? 'hover:bg-amber-500/10 text-amber-500' 
                                    : 'hover:bg-emerald-500/10 text-emerald-400'
                                }`}
                              >
                                {isCurrentActive ? <Archive className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'veiculos':
      case 'motoristas':
        return (
          <FrotaView
            vehicles={vehicles}
            onAddVehicle={onAddVehicle}
            onUpdateVehicle={onUpdateVehicle}
            onRemoveVehicle={onRemoveVehicle}
            drivers={drivers}
            onAddDriver={onAddDriver}
            onUpdateDriver={onUpdateDriver}
            onRemoveDriver={onRemoveDriver}
            searchValue={globalSearchValue}
            vehicleRegistries={vehicleRegistries}
            onAddVehicleRegistry={onAddVehicleRegistry}
            onUpdateVehicleRegistry={onUpdateVehicleRegistry}
            onRemoveVehicleRegistry={onRemoveVehicleRegistry}
          />
        );

      default:
        return (
          <div className="p-12 text-center text-gray-500 font-sans border-2 border-dashed border-[#1e3a6c]/30 rounded-xl bg-black/10">
            Abas adicionais em desenvolvimento progressivo.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper info banners */}
      <div className="flex flex-col gap-1.5 bg-[#0e1726]/40 border border-[#14203a] px-5 py-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
          <span>🗄️</span> Base de Dados Mestre
        </h2>
        <p className="text-xs text-gray-400 font-sans max-w-4xl">
          Centralização de dados cadastrais integrando a base <strong className="text-indigo-400">bd_unidades_operacionais_bi</strong>. 
          Altera as tabelas do IndexedDB offline para controle de filiais estendidas, compatibilidades logísticas e roteamento integrado.
        </p>
      </div>

      {/* Tabs Selector Navigation bar */}
      <div className="overflow-x-auto border-b border-[#14203a]">
        <div className="flex gap-1.5 pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => () => {}} // dummy outer wrapped
                onTouchStart={() => () => {}} // safe touch
                onClickCapture={() => setActiveTab(tab.id as TabId)}
                className={`py-2 px-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0)] text-xs font-bold font-sans cursor-pointer whitespace-nowrap rounded-t-lg transition-all ${
                  isActive
                    ? 'border-t-2 border-indigo-400 bg-[#0e1726] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-indigo-950/15'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content render boundary */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* --- UNIDADE MODAL FORM --- */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0b1322] border border-[#1e2e4f] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#14203a] bg-[#0e1726] flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-400 font-sans">
                {editingUnit ? '✏️ Editar Unidade Operacional' : '➕ Adicionar Nova Unidade Operacional'}
              </h3>
              <button 
                onClick={() => setShowUnitModal(false)}
                className="text-gray-400 hover:text-white font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-5 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold">Unidade (Sigla) *</label>
                  <input
                    type="text"
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    placeholder="Ex: GYN"
                    className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none uppercase"
                    disabled={!!editingUnit} // cannot alter primary key code unless new
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-bold">UF *</label>
                  <input
                    type="text"
                    value={formUf}
                    onChange={(e) => setFormUf(e.target.value)}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold">Tipo</label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 outline-none"
                >
                  <option value="Unidade">Unidade (Filial Própria)</option>
                  <option value="Parceiro">Parceiro (Agenciador)</option>
                  <option value="Filial Extra">Filial Extra</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold">Responsável</label>
                <input
                  type="text"
                  value={formResponsavel}
                  onChange={(e) => setFormResponsavel(e.target.value)}
                  placeholder="Nome do parceiro corporativo / proprietário"
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold">Responsável Operacional</label>
                  <input
                    type="text"
                    value={formRespOper}
                    onChange={(e) => setFormRespOper(e.target.value)}
                    placeholder="Ex: SPO"
                    className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-bold">Responsável Comercial</label>
                  <input
                    type="text"
                    value={formRespCom}
                    onChange={(e) => setFormRespCom(e.target.value)}
                    placeholder="Ex: SPO"
                    className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 border-t border-[#14203a] pt-3">
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={formParceiroUrbano}
                    onChange={(e) => setFormParceiroUrbano(e.target.checked)}
                    className="scale-110 accent-indigo-500"
                  />
                  <span>Parceiro - Urbano (Atua na distribuição regional restrita)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={formControleParceiros}
                    onChange={(e) => setFormControleParceiros(e.target.checked)}
                    className="scale-110 accent-indigo-500"
                  />
                  <span>Habilitar Controle Automatizado de Parceiro Logístico</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    className="scale-110 accent-indigo-500"
                  />
                  <span className="font-bold text-white">Unidade Ativa para Roteiro e Filtros</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#14203a] pt-4">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="bg-[#14203a] hover:bg-[#1a2d54] text-gray-300 px-4 py-2 rounded-lg cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg cursor-pointer font-bold shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HOLIDAY MODAL FORM --- */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0b1322] border border-[#1e2e4f] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#14203a] bg-[#0e1726] flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-400 font-sans">
                {editingHoliday ? '✏️ Editar Feriado' : '➕ Adicionar Novo Feriado'}
              </h3>
              <button 
                onClick={() => setShowHolidayModal(false)}
                className="text-gray-400 hover:text-white font-bold cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-gray-400 mb-1 font-bold">Data *</label>
                <input
                  type="date"
                  value={formHoldayDate}
                  onChange={(e) => setFormHolidayDate(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold">Cidade Aplicável (ou GERAL para nacionais) *</label>
                <input
                  type="text"
                  value={formHolidayCity}
                  onChange={(e) => setFormHolidayCity(e.target.value)}
                  placeholder="EX: BELO HORIZONTE"
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold">Descrição / Detalhes *</label>
                <textarea
                  value={formHolidayDesc}
                  onChange={(e) => setFormHolidayDesc(e.target.value)}
                  placeholder="Ex: Aniversário da Cidade - Suspensão parcial faturamento"
                  rows={3}
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 focus:border-indigo-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold">Gravidade do Alerta</label>
                <select
                  value={formHolidaySeverity}
                  onChange={(e: any) => setFormHolidaySeverity(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-[#1e3a6c]/60 rounded px-2.5 py-1.5 outline-none"
                >
                  <option value="INFO">Informativo (INFO)</option>
                  <option value="WARNING">Feriado Municipal/Estadual (WARNING)</option>
                  <option value="CRITICAL">Suspensão de Expediente Total (CRITICAL)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={formHolidayActive}
                  onChange={(e) => setFormHolidayActive(e.target.checked)}
                  className="scale-110 accent-indigo-500"
                />
                <span className="font-bold text-white">Feriado Ativo</span>
              </label>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[#14203a] pt-4">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="bg-[#14203a] hover:bg-[#1a2d54] text-gray-300 px-4 py-2 rounded-lg cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg cursor-pointer font-bold shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'unidades', label: 'Unidades Operacionais' },
  { id: 'historico_ctrcs', label: 'Catálogo / Histórico de CTRCs' },
  { id: 'ocorrencias', label: 'Ocorrências' },
  { id: 'cidades_rotas', label: 'Exceções Operacionais (Rotas)' },
  { id: 'curva_a', label: 'Curva A' },
  { id: 'clientes_especiais', label: 'Clientes Especiais' },
  { id: 'feriados', label: 'Feriados (Calendário)' },
  { id: 'veiculos', label: 'Veículos' },
  { id: 'motoristas', label: 'Motoristas/Ajudantes' }
];
