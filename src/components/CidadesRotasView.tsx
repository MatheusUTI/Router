import React, { useState, FormEvent, useEffect, useRef, DragEvent } from 'react';
import { CidadeRota, CidadeAtendidaSSW } from '../types';
import { CidadeRotaRepository } from '../infrastructure/localdb/repositories/cidadeRotaRepository';
import { CidadeAtendidaSSWRepository } from '../infrastructure/localdb/repositories/cidadeAtendidaSSWRepository';
import { initialCidadesRotas } from '../data';

interface CidadesRotasViewProps {
  onNotifyUpdate?: () => void;
  isMaster?: boolean;
}

type SubTabId = 'ssw' | 'operacional';

export default function CidadesRotasView({ onNotifyUpdate, isMaster = true }: CidadesRotasViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('ssw');

  // --- STATE FOR SEGMENT 1: SSW CIDADES ATENDIDAS ---
  const [sswCidades, setSswCidades] = useState<CidadeAtendidaSSW[]>([]);
  const [sswSearch, setSswSearch] = useState('');
  const [sswFilterOrigem, setSswFilterOrigem] = useState('TODAS');
  const [sswFilterUfDest, setSswFilterUfDest] = useState('TODAS');
  const [sswFilterAtivo, setSswFilterAtivo] = useState('TODOS');
  
  const [showSswModal, setShowSswModal] = useState(false);
  const [editingSsw, setEditingSsw] = useState<CidadeAtendidaSSW | null>(null);
  
  // Single record SSW Form states
  const [formSswUnidadeOrigem, setFormSswUnidadeOrigem] = useState('');
  const [formSswUfOrigem, setFormSswUfOrigem] = useState('MG');
  const [formSswCidadeOrigem, setFormSswCidadeOrigem] = useState('VARGINHA');
  const [formSswCodigoIbgeOrigem, setFormSswCodigoIbgeOrigem] = useState('');
  const [formSswUfDestino, setFormSswUfDestino] = useState('MG');
  const [formSswCidadeDestino, setFormSswCidadeDestino] = useState('');
  const [formSswPracaDestino, setFormSswPracaDestino] = useState('');
  const [formSswCodigoIbgeDestino, setFormSswCodigoIbgeDestino] = useState('');
  const [formSswDistanciaKm, setFormSswDistanciaKm] = useState('');
  const [formSswTarifa, setFormSswTarifa] = useState('');
  const [formSswPrazo, setFormSswPrazo] = useState('2');
  const [formSswFrequencia, setFormSswFrequencia] = useState('');
  const [formSswQuantPedagios, setFormSswQuantPedagios] = useState('0');
  const [formSswCif, setFormSswCif] = useState(false);
  const [formSswFob, setFormSswFob] = useState(false);
  const [formSswRestrito, setFormSswRestrito] = useState(false);
  const [formSswTda, setFormSswTda] = useState(false);
  const [formSswPracaComercial, setFormSswPracaComercial] = useState('');
  const [formSswAtivo, setFormSswAtivo] = useState(true);

  // Drag-and-drop for SSW
  const [isSswDragging, setIsSswDragging] = useState(false);
  const sswFileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE FOR SEGMENT 2: OPERACIONAL ROTAS ---
  const [cidadeRotas, setCidadeRotas] = useState<CidadeRota[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('Todos');

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState<number | undefined>(undefined);
  const [formCidade, setFormCidade] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formSetor, setFormSetor] = useState('');
  const [formRota, setFormRota] = useState('');
  const [formPrazo, setFormPrazo] = useState<number>(2);
  const [formPriority, setFormPriority] = useState<'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA'>('NORMAL');
  const [formSegunda, setFormSegunda] = useState(false);
  const [formTerca, setFormTerca] = useState(false);
  const [formQuarta, setFormQuarta] = useState(false);
  const [formQuinta, setFormQuinta] = useState(false);
  const [formSexta, setFormSexta] = useState(false);
  const [formCod, setFormCod] = useState('');

  // Bulk CSV loader states for operational
  const [showImporter, setShowImporter] = useState(false);
  const [csvText, setCsvText] = useState('');

  // --- DATA LOADING ---
  const loadSswData = async () => {
    try {
      const data = await CidadeAtendidaSSWRepository.getAll();
      setSswCidades(data);
    } catch (e) {
      console.error('Erro ao carregar Cidades Atendidas SSW:', e);
    }
  };

  const loadOperationalData = async () => {
    try {
      const data = await CidadeRotaRepository.getAll();
      setCidadeRotas(data);
    } catch (e) {
      console.error('Erro ao carregar parametrização de rotas:', e);
    }
  };

  useEffect(() => {
    loadSswData();
    loadOperationalData();
  }, []);

  // --- ACTIONS FOR SSW CIDADES ATENDIDAS ---
  const handleOpenSswModal = (item: CidadeAtendidaSSW | null = null) => {
    setEditingSsw(item);
    if (item) {
      setFormSswUnidadeOrigem(item.unidadeOrigem || '');
      setFormSswUfOrigem(item.ufOrigem || 'MG');
      setFormSswCidadeOrigem(item.cidadeOrigem || 'VARGINHA');
      setFormSswCodigoIbgeOrigem(item.codigoIbgeOrigem || '');
      setFormSswUfDestino(item.ufDestino || 'MG');
      setFormSswCidadeDestino(item.cidadeDestino || '');
      setFormSswPracaDestino(item.pracaDestino || '');
      setFormSswCodigoIbgeDestino(item.codigoIbgeDestino || '');
      setFormSswDistanciaKm(item.distanciaKm !== undefined ? String(item.distanciaKm) : '');
      setFormSswTarifa(item.tarifa !== undefined ? String(item.tarifa) : '');
      setFormSswPrazo(item.prazo !== undefined ? String(item.prazo) : '2');
      setFormSswFrequencia(item.frequencia || '');
      setFormSswQuantPedagios(item.quantPedagios !== undefined ? String(item.quantPedagios) : '0');
      setFormSswCif(!!item.cif);
      setFormSswFob(!!item.fob);
      setFormSswRestrito(!!item.restrito);
      setFormSswTda(!!item.tda);
      setFormSswPracaComercial(item.pracaComercial || '');
      setFormSswAtivo(item.ativo !== false);
    } else {
      setFormSswUnidadeOrigem('');
      setFormSswUfOrigem('MG');
      setFormSswCidadeOrigem('VARGINHA');
      setFormSswCodigoIbgeOrigem('');
      setFormSswUfDestino('MG');
      setFormSswCidadeDestino('');
      setFormSswPracaDestino('');
      setFormSswCodigoIbgeDestino('');
      setFormSswDistanciaKm('');
      setFormSswTarifa('');
      setFormSswPrazo('2');
      setFormSswFrequencia('');
      setFormSswQuantPedagios('0');
      setFormSswCif(false);
      setFormSswFob(false);
      setFormSswRestrito(false);
      setFormSswTda(false);
      setFormSswPracaComercial('');
      setFormSswAtivo(true);
    }
    setShowSswModal(true);
  };

  const handleSaveSsw = async (e: FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;

    if (!formSswUnidadeOrigem.trim() || !formSswCidadeDestino.trim()) {
      alert('Origem e Cidade de Destino são obrigatórios.');
      return;
    }

    const payload: CidadeAtendidaSSW = {
      id: editingSsw?.id,
      unidadeOrigem: formSswUnidadeOrigem.toUpperCase().trim(),
      ufOrigem: formSswUfOrigem.toUpperCase().trim(),
      cidadeOrigem: formSswCidadeOrigem.trim(),
      codigoIbgeOrigem: formSswCodigoIbgeOrigem.trim() || undefined,
      ufDestino: formSswUfDestino.toUpperCase().trim(),
      cidadeDestino: formSswCidadeDestino.trim(),
      pracaDestinoOriginal: formSswPracaDestino.trim() || undefined,
      pracaDestinoNormalizada: formSswPracaDestino ? formSswPracaDestino.trim().toUpperCase().replace(/\s+/g, '').substring(0, 3) : undefined,
      pracaHub: formSswPracaDestino ? formSswPracaDestino.trim().toUpperCase().replace(/\s+/g, '').substring(0, 3) : undefined,
      pracaDestino: formSswPracaDestino.trim() || undefined,
      codigoIbgeDestino: formSswCodigoIbgeDestino.trim() || undefined,
      distanciaKm: formSswDistanciaKm ? Number(formSswDistanciaKm) : undefined,
      tarifa: formSswTarifa ? Number(formSswTarifa) : undefined,
      prazo: formSswPrazo ? Number(formSswPrazo) : undefined,
      frequencia: formSswFrequencia.trim() || undefined,
      quantPedagios: formSswQuantPedagios ? Number(formSswQuantPedagios) : undefined,
      cif: formSswCif,
      fob: formSswFob,
      restrito: formSswRestrito,
      tda: formSswTda,
      pracaComercial: formSswPracaComercial.trim() || undefined,
      ativo: formSswAtivo,
      createdAt: editingSsw?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await CidadeAtendidaSSWRepository.upsert(payload);
      setShowSswModal(false);
      loadSswData();
      if (onNotifyUpdate) onNotifyUpdate();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cidade atendida SSW.');
    }
  };

  const handleDeleteSsw = async (id: string) => {
    if (!isMaster) return;
    if (!window.confirm('Tem certeza de que deseja remover este registro?')) return;
    try {
      await CidadeAtendidaSSWRepository.remove(id);
      loadSswData();
      if (onNotifyUpdate) onNotifyUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSswActivation = async (item: CidadeAtendidaSSW) => {
    if (!isMaster || !item.id) return;
    try {
      const updated = { ...item, ativo: !item.ativo };
      await CidadeAtendidaSSWRepository.upsert(updated);
      loadSswData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSswExportJson = async () => {
    try {
      const jsonStr = await CidadeAtendidaSSWRepository.exportToJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bd_cidades_atendidas_ssw_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSswExportCsv = async () => {
    try {
      const csvStr = await CidadeAtendidaSSWRepository.exportToCsv();
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bd_cidades_atendidas_ssw_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Drag & drop for SSW file upload
  const handleSswDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isMaster) setIsSswDragging(true);
  };

  const handleSswDragLeave = () => {
    setIsSswDragging(false);
  };

  const handleSswDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsSswDragging(false);
    if (!isMaster) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processSswImportFile(files[0]);
    }
  };

  const handleSswFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSswImportFile(files[0]);
    }
  };

  const processSswImportFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const records = Array.isArray(parsed) ? parsed : (parsed.records || []);
          if (!records || records.length === 0) {
            alert('Nenhum registro encontrado no JSON do SSW.');
            return;
          }
          await CidadeAtendidaSSWRepository.importFromJson(records);
        } else {
          // Parse CSV
          const list = await CidadeAtendidaSSWRepository.importFromCsv(content);
          if (list.length === 0) {
            alert('Não foi possível extrair registros do arquivo CSV. Verifique o cabeçalho.');
            return;
          }
          await CidadeAtendidaSSWRepository.importFromJson(list);
        }
        alert('Cidades atendidas SSW importadas com sucesso.');
        loadSswData();
        if (onNotifyUpdate) onNotifyUpdate();
      } catch (err) {
        console.error(err);
        alert('Erro ao processar arquivo de importação.');
      }
    };
    reader.readAsText(file);
  };

  // --- ACTIONS FOR OPERATIONAL ROTAS (ORIGINAL) ---
  const handleSingleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formCidade.trim() || !formSetor.trim() || !formRota.trim()) {
      alert('Cidade, Setor e Rota Operacional são obrigatórios.');
      return;
    }

    const item: CidadeRota = {
      id: formId,
      cidade: formCidade.trim().toUpperCase(),
      alias: formAlias.trim().toUpperCase(),
      setor: formSetor.trim().toUpperCase(),
      rota: formRota.trim().toUpperCase(),
      prazo_padrao: Number(formPrazo),
      prioridade_operacional: formPriority,
      segunda: formSegunda,
      terca: formTerca,
      quarta: formQuarta,
      quinta: formQuinta,
      sexta: formSexta,
      cod: formCod.trim()
    };

    try {
      await CidadeRotaRepository.put(item);
      await loadOperationalData();
      if (onNotifyUpdate) onNotifyUpdate();
      resetForm();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar parametrização.');
    }
  };

  const resetForm = () => {
    setFormId(undefined);
    setFormCidade('');
    setFormAlias('');
    setFormSetor('');
    setFormRota('');
    setFormPrazo(2);
    setFormPriority('NORMAL');
    setFormSegunda(false);
    setFormTerca(false);
    setFormQuarta(false);
    setFormQuinta(false);
    setFormSexta(false);
    setFormCod('');
    setIsEditing(false);
    setShowForm(false);
  };

  const handleEditClick = (item: CidadeRota) => {
    setFormId(item.id);
    setFormCidade(item.cidade);
    setFormAlias(item.alias || '');
    setFormSetor(item.setor);
    setFormRota(item.rota);
    setFormPrazo(item.prazo_padrao);
    setFormPriority(item.prioridade_operacional);
    setFormSegunda(!!item.segunda);
    setFormTerca(!!item.terca);
    setFormQuarta(!!item.quarta);
    setFormQuinta(!!item.quinta);
    setFormSexta(!!item.sexta);
    setFormCod(item.cod || '');
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (!isMaster) return;
    if (confirm('Deseja realmente excluir esta regra de roteirização parametrizada?')) {
      try {
        await CidadeRotaRepository.delete(id);
        await loadOperationalData();
        if (onNotifyUpdate) onNotifyUpdate();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    const lines = csvText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    let count = 0;

    try {
      for (const line of lines) {
        if (line.toUpperCase().includes('CIDADE')) {
          continue; // pular linha do cabeçalho
        }

        const parts = line.split(/[;|]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 2) continue;

        const cidade = parts[0].toUpperCase();
        if (!cidade) continue;

        // Buscar registro existente para mesclar
        const existing = await CidadeRotaRepository.getByCidade(cidade);

        const isWeeklyFormat = parts.length >= 7 && (
          parts[2].toUpperCase() === 'X' || parts[2] === ''
        ) && (
          parts[3].toUpperCase() === 'X' || parts[3] === ''
        );

        let mergedItem: CidadeRota;

        if (isWeeklyFormat) {
          const setor = parts[1].toUpperCase();
          const rota = parts[1].toUpperCase();
          const segunda = parts[2].toUpperCase() === 'X';
          const terca = parts[3].toUpperCase() === 'X';
          const quarta = parts[4].toUpperCase() === 'X';
          const quinta = parts[5].toUpperCase() === 'X';
          const sexta = parts[6].toUpperCase() === 'X';
          const cod = parts[7] || '';

          mergedItem = {
            id: existing?.id,
            cidade,
            alias: existing?.alias || '',
            setor,
            rota,
            prazo_padrao: existing?.prazo_padrao || 2,
            prioridade_operacional: existing?.prioridade_operacional || 'NORMAL',
            segunda,
            terca,
            quarta,
            quinta,
            sexta,
            cod
          };
        } else {
          const alias = parts[1].toUpperCase();
          const setor = parts[2].toUpperCase();
          const rota = parts[3] ? parts[3].toUpperCase() : `ROTA ${setor}`;
          const prazo = parts[4] ? Number(parts[4]) : 2;
          const priority = (parts[5] || 'NORMAL').toUpperCase() as any;

          const validPriorities = ['CRÍTICA', 'ALTA', 'NORMAL', 'BAIXA'];
          const validatedPriority = validPriorities.includes(priority) ? priority : 'NORMAL';

          mergedItem = {
            id: existing?.id,
            cidade,
            alias: alias || existing?.alias || '',
            setor,
            rota,
            prazo_padrao: isNaN(prazo) ? (existing?.prazo_padrao || 2) : prazo,
            prioridade_operacional: validatedPriority,
            segunda: existing?.segunda || false,
            terca: existing?.terca || false,
            quarta: existing?.quarta || false,
            quinta: existing?.quinta || false,
            sexta: existing?.sexta || false,
            cod: existing?.cod || ''
          };
        }

        await CidadeRotaRepository.put(mergedItem);
        count++;
      }

      await loadOperationalData();
      if (onNotifyUpdate) onNotifyUpdate();
      alert(`Sucesso! ${count} regras foram importadas/atualizadas no BD_CIDADES_ROTAS.`);
      setCsvText('');
      setShowImporter(false);
    } catch (e) {
      console.error(e);
      alert('Houve um problema ao processar o arquivo de importação.');
    }
  };

  const handleLoadDefaults = async () => {
    if (!isMaster) return;
    if (confirm('Isso irá inserir as 39 regras padrões do sistema para roteirização rápida baseada na planilha oficial. Continuar?')) {
      for (const d of initialCidadesRotas) {
        const exist = await CidadeRotaRepository.getByCidade(d.cidade);
        await CidadeRotaRepository.put({
          id: exist?.id,
          ...d
         });
      }
      await loadOperationalData();
      if (onNotifyUpdate) onNotifyUpdate();
      alert('Padrões logísticos operacionais oficiais restaurados com sucesso.');
    }
  };

  // --- FILTERS AND SEARCH COMPILING ---

  // SSW
  const filteredSswCidades = sswCidades.filter(item => {
    const term = sswSearch.toLowerCase();
    const matchSearch = 
      item.cidadeDestino.toLowerCase().includes(term) ||
      (item.pracaDestino || '').toLowerCase().includes(term) ||
      item.unidadeOrigem.toLowerCase().includes(term) ||
      item.cidadeOrigem.toLowerCase().includes(term);

    const matchOrigem = sswFilterOrigem === 'TODAS' || item.unidadeOrigem === sswFilterOrigem;
    const matchUfDest = sswFilterUfDest === 'TODAS' || item.ufDestino === sswFilterUfDest;
    
    const matchAtivo = 
      sswFilterAtivo === 'TODOS' || 
      (sswFilterAtivo === 'ATIVOS' && item.ativo !== false) ||
      (sswFilterAtivo === 'INATIVOS' && item.ativo === false);

    return matchSearch && matchOrigem && matchUfDest && matchAtivo;
  });

  const sswUniqueOrigens = Array.from(new Set(sswCidades.map(s => s.unidadeOrigem))).sort();
  const sswUniqueUfsDest = Array.from(new Set(sswCidades.map(s => s.ufDestino))).sort();

  // Operational
  const filteredData = cidadeRotas.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.cidade.toLowerCase().includes(q) ||
      (item.alias || '').toLowerCase().includes(q) ||
      item.setor.toLowerCase().includes(q) ||
      item.rota.toLowerCase().includes(q);

    const matchPriority =
      filterPriority === 'Todos' || item.prioridade_operacional === filterPriority;

    return matchSearch && matchPriority;
  });

  // --- RENDERING VIEWS ---
  return (
    <div className="flex-1 p-6 space-y-6 text-left overflow-y-auto h-full">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1e2e4f]/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Exceções e Parâmetros de Rotas</h2>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/30 px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider">
              SSW_COBERTURA + EXCEÇÕES
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1.5">
            O banco de dados oficial de cubagem e prazos vem diretamente do SSW. Os parâmetros abaixo cadastram exceções, aliases de busca, setores personalizados e desvios operacionais.
          </p>
        </div>

        {/* Master Control mode info badge */}
        {!isMaster && (
          <div className="px-3 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-400 rounded-lg select-none flex items-center gap-1.5 shrink-0 self-start md:self-auto">
            🔒 Modo Consulta (Apenas Master Anderson Altera)
          </div>
        )}
      </div>

      {/* Internal Nav Tabs */}
      <div className="flex border-b border-[#14203a] gap-2 select-none">
        <button
          onClick={() => setActiveSubTab('ssw')}
          className={`px-4 py-2 bg-transparent text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'ssw'
              ? 'border-indigo-400 text-indigo-400 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          🗂️ 1. Cidades Atendidas SSW ({sswCidades.length})
        </button>
        <button
          onClick={() => setActiveSubTab('operacional')}
          className={`px-4 py-2 bg-transparent text-xs font-bold leading-none border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'operacional'
              ? 'border-indigo-400 text-indigo-400 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          📍 2. Ajustes e Exceções Operacionais ({cidadeRotas.length})
        </button>
      </div>

      {/* SUB-TAB 1: SSW CIDADES ATENDIDAS */}
      {activeSubTab === 'ssw' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-[#0e1726]/80 p-4 border border-[#1e2e4f]/70 rounded-xl">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Buscar destino..."
                value={sswSearch}
                onChange={(e) => setSswSearch(e.target.value)}
                className="w-56 bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-400 transition-all font-sans"
              />

              <select
                value={sswFilterOrigem}
                onChange={(e) => setSswFilterOrigem(e.target.value)}
                className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
              >
                <option value="TODAS">Origem: Todas ({sswUniqueOrigens.length})</option>
                {sswUniqueOrigens.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>

              <select
                value={sswFilterUfDest}
                onChange={(e) => setSswFilterUfDest(e.target.value)}
                className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
              >
                <option value="TODAS">UF Destino: Todas ({sswUniqueUfsDest.length})</option>
                {sswUniqueUfsDest.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>

              <select
                value={sswFilterAtivo}
                onChange={(e) => setSswFilterAtivo(e.target.value)}
                className="bg-surface text-on-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 text-xs outline-none font-sans"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="ATIVOS">Ativas</option>
                <option value="INATIVOS">Inativas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSswExportJson}
                className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
              >
                📥 Exportar JSON
              </button>
              <button
                onClick={handleSswExportCsv}
                className="bg-indigo-950/70 hover:bg-indigo-900/80 border border-[#1e3a6c]/60 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5"
              >
                📥 Exportar CSV
              </button>
              {isMaster && (
                <button
                  onClick={() => handleOpenSswModal(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1"
                >
                  ➕ Novo Registro
                </button>
              )}
            </div>
          </div>

          {/* Mass importer for SSW */}
          {isMaster && (
            <div
              onDragOver={handleSswDragOver}
              onDragLeave={handleSswDragLeave}
              onDrop={handleSswDrop}
              onClick={() => sswFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-250 select-none ${
                isSswDragging 
                  ? 'border-indigo-400 bg-indigo-500/10 text-white' 
                  : 'border-[#1e3a6c]/50 bg-[#0e1726]/30 hover:bg-[#0e1726]/60 text-gray-400 hover:text-white'
              }`}
            >
              <input
                type="file"
                ref={sswFileInputRef}
                onChange={handleSswFileSelect}
                accept=".csv,.json"
                className="hidden"
              />
              <span className="text-xl mb-1">🗂️</span>
              <p className="text-xs font-bold">Importação em Massa - Cidades Atendidas SSW</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Arraste e solte o arquivo <strong className="text-indigo-400">BD CIDADES ATENDIDAS.csv</strong> (extraído do SSW) ou JSON aqui.
              </p>
            </div>
          )}

          {/* Records Table */}
          <div className="border border-[#14203a] bg-[#0b1322]/90 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0e1726]/90 border-b border-[#14203a] text-indigo-300 font-bold text-xs select-none">
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Cidade Destino</th>
                    <th className="px-4 py-3 text-center">Unid/UF Dest.</th>
                    <th className="px-4 py-3 font-semibold">Praça Original</th>
                    <th className="px-4 py-3 font-semibold">Praça Normalizada</th>
                    <th className="px-4 py-3 font-semibold text-amber-300">Praça Hub</th>
                    <th className="px-4 py-3">Códigos IBGE</th>
                    <th className="px-4 py-3 text-right">KM</th>
                    <th className="px-4 py-3 text-right">Tarifa</th>
                    <th className="px-4 py-3 text-center">Prazo SLA</th>
                    <th className="px-4 py-3">Frequência</th>
                    <th className="px-4 py-3 text-center">Pedágios</th>
                    <th className="px-4 py-3 text-center">Regras</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    {isMaster && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14203a] text-xs font-mono">
                  {filteredSswCidades.length === 0 ? (
                    <tr>
                      <td colSpan={isMaster ? 15 : 14} className="text-center py-10 text-gray-500 font-sans">
                        Nenhum registro correspondente aos filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredSswCidades.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-indigo-950/20 transition-colors ${!item.ativo ? 'opacity-55 bg-black/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-white font-bold">{item.unidadeOrigem}</span>
                          <span className="text-gray-500 text-[10px] ml-1">({item.ufOrigem})</span>
                        </td>
                        <td className="px-4 py-3 text-white font-bold font-sans">
                          {item.cidadeDestino}
                        </td>
                        <td className="px-4 py-3 text-center font-sans">
                          <span className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.ufDestino}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-sans font-semibold">
                          {item.pracaDestinoOriginal || item.pracaDestino || '—'}
                        </td>
                        <td className="px-4 py-3 text-indigo-300 font-semibold font-sans">
                          {item.pracaDestinoNormalizada || '—'}
                        </td>
                        <td className="px-4 py-3 text-amber-300 font-bold font-sans">
                          {item.pracaHub || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-[11px]">
                          <div>O: {item.codigoIbgeOrigem || '—'}</div>
                          <div>D: {item.codigoIbgeDestino || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {item.distanciaKm !== undefined ? `${item.distanciaKm} km` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-300 font-bold">
                          {item.tarifa !== undefined ? `R$ ${item.tarifa.toFixed(2).replace('.', ',')}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-surface text-[#dae2fd] text-[10px] border border-outline-variant/30 font-bold">
                            D+{item.prazo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-sans">{item.frequencia || 'DIÁRIO'}</td>
                        <td className="px-4 py-3 text-center text-gray-300">{item.quantPedagios || 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 justify-center text-[9px] font-sans">
                            {item.cif && <span className="bg-[#101f30] text-blue-400 px-1 py-0.5 rounded font-extrabold" title="CIF Ativo">CIF</span>}
                            {item.fob && <span className="bg-purple-950 text-purple-300 px-1 py-0.5 rounded font-extrabold" title="FOB Ativo">FOB</span>}
                            {item.restrito && <span className="bg-red-950 text-red-300 px-1 py-0.5 rounded font-extrabold" title="Restrição de Entrega">REST</span>}
                            {item.tda && <span className="bg-amber-950 text-amber-300 px-1 py-0.5 rounded font-extrabold" title="TDA Cobrado">TDA</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            disabled={!isMaster}
                            onClick={() => handleToggleSswActivation(item)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold select-none ${
                              item.ativo !== false
                                ? 'bg-emerald-990 text-emerald-300 cursor-pointer'
                                : 'bg-red-950 text-red-300 cursor-pointer'
                            }`}
                          >
                            {item.ativo !== false ? '• ATIVA' : '• INATIVA'}
                          </button>
                        </td>
                        {isMaster && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenSswModal(item)}
                                className="bg-indigo-900/40 hover:bg-indigo-800 border border-indigo-700/30 text-indigo-200 p-1 rounded cursor-pointer"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteSsw(item.id!)}
                                className="bg-red-950/40 hover:bg-red-900/50 border border-red-800/20 text-red-300 p-1 rounded cursor-pointer"
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
            </div>
            <div className="px-4 py-3 bg-[#0e1726]/40 border-t border-[#14203a] flex items-center justify-between text-[11px] text-gray-400 select-none">
              <span>Mostrando {filteredSswCidades.length} de {sswCidades.length} registros</span>
              <span className="font-mono text-gray-500">SSW Cidades Atendidas Database</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: OPERATIONAL ROTAS */}
      {activeSubTab === 'operacional' && (
        <div className="space-y-6">
          {/* Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <span className="material-symbols-outlined">map</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">Cidades Modeladas</p>
                <p className="text-xl font-extrabold text-white mt-1 font-mono">{cidadeRotas.length}</p>
              </div>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                <span className="material-symbols-outlined">priority_high</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">Praças Críticas </p>
                <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono font-sans">
                  {cidadeRotas.filter(r => r.prioridade_operacional === 'CRÍTICA').length}
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3ecf8e]/10 flex items-center justify-center text-[#3ecf8e] border border-[#3ecf8e]/20">
                <span className="material-symbols-outlined">fast_forward</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">SLA Rápido (D+1)</p>
                <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono font-sans font-medium">
                  {cidadeRotas.filter(r => r.prazo_padrao === 1).length}
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <span className="material-symbols-outlined">find_replace</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">Sinônimos / Aliases</p>
                <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono font-sans leading-none font-medium">
                  {cidadeRotas.reduce((acc, curr) => acc + (curr.alias ? curr.alias.split(',').length : 0), 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Filters and List Block */}
          <div className="bg-[#0e1726]/80 rounded-xl border border-[#1e2e4f]/70 overflow-hidden flex flex-col">
            {/* Filters Panel */}
            <div className="p-4 border-b border-[#14203a] flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Pesquisar cidade, alias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-surface border border-[#1e3a6c]/60 rounded-lg px-3 py-1.5 font-sans text-xs text-white focus:outline-none focus:border-indigo-400 placeholder-on-surface-variant/60 w-56 uppercase"
                />

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-surface border border-[#1e3a6c]/60 rounded-lg px-2.5 py-1.5 font-sans text-xs text-[#dae2fd] focus:outline-none focus:border-indigo-400 cursor-pointer font-medium"
                >
                  <option value="Todos">Todas as prioridades</option>
                  <option value="CRÍTICA">CRÍTICA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="BAIXA">BAIXA</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {isMaster && (
                  <>
                    <button
                      onClick={() => setShowImporter(true)}
                      className="px-3.5 py-1.5 bg-[#14203a] hover:bg-[#1f3054] border border-[#1e3a6c]/60 rounded-lg text-xs font-bold text-indigo-300 transition-colors flex items-center gap-1.5"
                    >
                      📤 Importar Lote
                    </button>
                    <button
                      onClick={handleLoadDefaults}
                      className="px-3.5 py-1.5 bg-indigo-950/40 hover:bg-indigo-900 border border-amber-600/30 rounded-lg text-xs font-mono text-amber-500 font-bold transition-colors flex items-center gap-1.5 animate-pulse"
                      title="Restaurar cidades padrão"
                    >
                      🔄 Restaurar Padrões
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setShowForm(true);
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1"
                    >
                      ➕ Nova Regra
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Logistics Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs font-sans">
                <thead className="bg-[#0e2746]/40 text-[10.5px] text-indigo-300 font-bold uppercase tracking-wider border-b border-[#14203a]">
                  <tr>
                    <th className="px-4 py-3 text-white">Cidade Canonical</th>
                    <th className="px-4 py-3 text-center">COD</th>
                    <th className="px-4 py-3">Aliases cadastrados (Para De)</th>
                    <th className="px-4 py-3">Setor Padronizado</th>
                    <th className="px-4 py-3">Rota de Entrega</th>
                    <th className="px-4 py-3">Frequência Semanal</th>
                    <th className="px-4 py-3 text-center">Prazo SLA</th>
                    <th className="px-4 py-3">Prioridade</th>
                    {isMaster && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#14203a] text-xs font-mono">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={isMaster ? 9 : 8} className="text-center py-12 text-gray-500 font-sans">
                        Nenhuma parametrização de roteamento correspondente.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      let prioColor = 'bg-[#1e2538] text-slate-300 border-slate-700/50';
                      if (item.prioridade_operacional === 'CRÍTICA') prioColor = 'bg-[#93000a]/15 text-red-350 border-red-500/20';
                      else if (item.prioridade_operacional === 'ALTA') prioColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                      else if (item.prioridade_operacional === 'NORMAL') prioColor = 'bg-primary/10 text-sky-300 border-primary/20';

                      return (
                        <tr key={item.id} className="hover:bg-indigo-950/20 transition-colors">
                          <td className="px-4 py-3 text-[#dae2fd] font-bold font-sans">{item.cidade}</td>
                          <td className="px-2 py-3 text-center text-amber-400 font-bold font-mono text-[10px]">{item.cod || '-'}</td>
                          <td className="px-4 py-3 text-gray-400 font-sans italic">
                            {item.alias ? item.alias.split(',').join(' | ') : 'Nenhum sinônimo parametrizado.'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-indigo-300 font-sans">{item.setor}</td>
                          <td className="px-4 py-3 text-slate-300">{item.rota}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 font-sans text-[9px] font-bold">
                              <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.segunda ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold' : 'bg-slate-800 text-slate-600'}`}>S</span>
                              <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.terca ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold' : 'bg-slate-800 text-slate-600'}`}>T</span>
                              <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.quarta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold' : 'bg-slate-800 text-slate-600'}`}>Q</span>
                              <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.quinta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold' : 'bg-slate-800 text-slate-600'}`}>Q</span>
                              <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.sexta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold' : 'bg-slate-800 text-slate-600'}`}>S</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded bg-[#101524] text-[#dae2fd]">
                              D+{item.prazo_padrao}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-sans font-bold ${prioColor}`}>
                              {item.prioridade_operacional}
                            </span>
                          </td>
                          {isMaster && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditClick(item)}
                                  className="bg-indigo-900/40 hover:bg-indigo-800 border border-indigo-700/30 text-indigo-200 p-1 rounded cursor-pointer"
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => item.id && handleDeleteClick(item.id)}
                                  className="bg-red-950/40 hover:bg-red-900/50 border border-red-800/20 text-red-300 p-1 rounded cursor-pointer"
                                  title="Deletar"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-[#0e1726]/40 border-t border-[#14203a] flex items-center justify-between text-[11px] text-gray-400 select-none">
              <span>Mostrando {filteredData.length} de {cidadeRotas.length} registros</span>
              <span className="font-mono text-gray-500">BD Rotas Mapeamento Local</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SSW CIDADES ATENDIDAS CRUD */}
      {showSswModal && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="p-4 border-b border-[#14203a] flex justify-between items-center bg-surface">
              <span className="font-bold text-white text-sm">
                📌 {editingSsw ? 'Editar Cidade Atendida (SSW)' : 'Nova Cidade Atendida (SSW)'}
              </span>
              <button onClick={() => setShowSswModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSsw} className="p-5 space-y-4 bg-[#121828] max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Unidade Origem Mestre *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: VGA"
                    value={formSswUnidadeOrigem}
                    onChange={(e) => setFormSswUnidadeOrigem(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white uppercase focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">UF Origem *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MG"
                    value={formSswUfOrigem}
                    onChange={(e) => setFormSswUfOrigem(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white uppercase focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Cidade Origem</label>
                  <input
                    type="text"
                    value={formSswCidadeOrigem}
                    onChange={(e) => setFormSswCidadeOrigem(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Código IBGE Origem</label>
                  <input
                    type="text"
                    value={formSswCodigoIbgeOrigem}
                    onChange={(e) => setFormSswCodigoIbgeOrigem(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#14203a]">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Cidade Destino *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alfenas"
                    value={formSswCidadeDestino}
                    onChange={(e) => setFormSswCidadeDestino(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">UF Destino *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MG"
                    value={formSswUfDestino}
                    onChange={(e) => setFormSswUfDestino(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white uppercase focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Praça Destino</label>
                  <input
                    type="text"
                    placeholder="Ex: SUL_ALFENAS"
                    value={formSswPracaDestino}
                    onChange={(e) => setFormSswPracaDestino(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Código IBGE Destino</label>
                  <input
                    type="text"
                    value={formSswCodigoIbgeDestino}
                    onChange={(e) => setFormSswCodigoIbgeDestino(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Distância (KM)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="120"
                    value={formSswDistanciaKm}
                    onChange={(e) => setFormSswDistanciaKm(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tarifa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="14.50"
                    value={formSswTarifa}
                    onChange={(e) => setFormSswTarifa(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Prazo (Dias SLA)</label>
                  <input
                    type="number"
                    value={formSswPrazo}
                    onChange={(e) => setFormSswPrazo(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Frequência</label>
                  <input
                    type="text"
                    placeholder="Ex: SEGUNDA A SEXTA"
                    value={formSswFrequencia}
                    onChange={(e) => setFormSswFrequencia(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Quantidade Pedágios</label>
                  <input
                    type="number"
                    value={formSswQuantPedagios}
                    onChange={(e) => setFormSswQuantPedagios(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Praça Comercial (SSW)</label>
                <input
                  type="text"
                  placeholder="Ex: REGIAO_SUL_MINAS_A"
                  value={formSswPracaComercial}
                  onChange={(e) => setFormSswPracaComercial(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                />
              </div>

              {/* Rules Checkboxes */}
              <div className="bg-[#101524] p-3 rounded-lg border border-[#14203a] flex flex-wrap gap-4 justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formSswCif} onChange={(e) => setFormSswCif(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary w-4 h-4" />
                  <span className="text-xs text-gray-300 font-bold">Permite CIF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formSswFob} onChange={(e) => setFormSswFob(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary w-4 h-4" />
                  <span className="text-xs text-gray-300 font-bold">Permite FOB</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formSswRestrito} onChange={(e) => setFormSswRestrito(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary w-4 h-4" />
                  <span className="text-xs text-gray-300 font-bold">Entrega Restrita</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formSswTda} onChange={(e) => setFormSswTda(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary w-4 h-4" />
                  <span className="text-xs text-gray-300 font-bold">Cobra TDA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formSswAtivo} onChange={(e) => setFormSswAtivo(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary w-4 h-4" />
                  <span className="text-xs text-emerald-400 font-bold">Registro Ativo</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#14203a] flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setShowSswModal(false)}
                  className="px-4 py-2 text-gray-400 border border-[#1e2e4f]/70 rounded-lg hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
                >
                  Salvar Cidade SSW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OPERATIONAL ROTAS CRUD */}
      {showForm && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="p-4 border-b border-[#14203a] flex justify-between items-center bg-surface">
              <span className="font-bold text-white text-sm">
                {isEditing ? 'Editar Configuração de Praça' : 'Cadastrar Configuração de Praça'}
              </span>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-5 space-y-4 bg-[#121828]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Cidade Canonical *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: VARGINHA"
                    value={formCidade}
                    onChange={(e) => setFormCidade(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none uppercase"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Setor Operacional ERP *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ROTA 01"
                    value={formSetor}
                    onChange={(e) => setFormSetor(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Aliases / Sinônimos (Separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: VGA, VARGINHA MG"
                  value={formAlias}
                  onChange={(e) => setFormAlias(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Rota de Entrega *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SUL-VGA"
                    value={formRota}
                    onChange={(e) => setFormRota(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none uppercase"
                  />
                </div>

                <div className="space-y-1 col-span-1 border-none bg-transparent">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Prazo SLA</label>
                  <select
                    value={formPrazo}
                    onChange={(e) => setFormPrazo(Number(e.target.value))}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-2 py-2 text-xs text-[#dae2fd] focus:border-indigo-400 outline-none"
                  >
                    <option value={1}>D+1 (Expresso)</option>
                    <option value={2}>D+2 (Padrão)</option>
                    <option value={3}>D+3 (Especial)</option>
                    <option value={4}>Semanalizado</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Prioridade</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-2 py-2 text-xs text-[#dae2fd] focus:border-indigo-400 outline-none"
                  >
                    <option value="CRÍTICA">🔴 CRÍTICA</option>
                    <option value="ALTA">🟡 ALTA</option>
                    <option value="NORMAL">🔵 NORMAL</option>
                    <option value="BAIXA">🟢 BAIXA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-[#14203a] pt-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Código Rota (COD)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2"
                    value={formCod}
                    onChange={(e) => setFormCod(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-400 outline-none"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Frequência</label>
                  <div className="flex gap-2 pt-1 font-sans">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formSegunda} onChange={(e) => setFormSegunda(e.target.checked)} className="rounded bg-surface text-primary w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-300">Seg</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formTerca} onChange={(e) => setFormTerca(e.target.checked)} className="rounded bg-surface text-primary w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-300">Ter</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formQuarta} onChange={(e) => setFormQuarta(e.target.checked)} className="rounded bg-surface text-primary w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-300">Qua</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formQuinta} onChange={(e) => setFormQuinta(e.target.checked)} className="rounded bg-surface text-primary w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-300">Qui</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formSexta} onChange={(e) => setFormSexta(e.target.checked)} className="rounded bg-surface text-primary w-3.5 h-3.5" />
                      <span className="text-[10px] text-gray-300">Sex</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#14203a] flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-400 border border-[#1e2e4f]/70 rounded-lg hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLECTIVE CSV IMPORT OVERLAY */}
      {showImporter && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="p-4 border-b border-[#14203a] flex justify-between items-center bg-surface">
              <span className="font-bold text-white text-sm">📥 Importação Lote - Regras de Roteirização</span>
              <button onClick={() => setShowImporter(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4 bg-[#121828]">
              <div className="p-3.5 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[11px] text-[#3ecf8e] space-y-1 font-sans">
                <p className="font-bold">Formato do Layout esperado para importação (CSV):</p>
                <p className="font-mono text-[10px]">CIDADE ; ALIASES ; SETOR ; ROTA ; SLA_PRAZO ; PRIORIDADE</p>
                <p className="font-bold mt-2 font-sans">Exemplo:</p>
                <p className="font-mono text-[10px] select-all bg-slate-950 px-2 py-1 rounded border border-[#1e3a6c]/30 text-slate-300">
                  ALFENAS;ALFENA,ALFENAS-MG;ROTA 01;VGA-ALFENAS;2;ALTA<br />
                  LAVRAS;LAVRAS MG,LAVRAS-MG;ROTA 05;VGA-LAVRAS;2;NORMAL
                </p>
              </div>

              <div className="space-y-1 block">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Linhas de Texto Codificado (Cole aqui)</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="ALFENAS;ALFENA;ROTA 01;VGA-ALFENAS;2;ALTA"
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-xs text-white font-mono focus:border-indigo-400 outline-none"
                />
              </div>

              <div className="pt-2 border-t border-[#14203a] flex justify-end gap-2 text-xs font-bold">
                <button
                  onClick={() => setShowImporter(false)}
                  className="px-4 py-2 text-gray-400 border border-[#1e2e4f]/70 rounded-lg hover:text-white"
                >
                  Retornar
                </button>
                <button
                  disabled={!csvText.trim()}
                  onClick={handleCsvImport}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg"
                >
                  Processar e Sincronizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
