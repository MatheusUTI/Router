import { useState, useRef, DragEvent, ChangeEvent, FormEvent, useMemo } from 'react';
import { DeliveryOccurrence } from '../types';

interface DecodedResult {
  text: string;
  encoding: string;
  hasCorrupted: boolean;
}

function decodeBufferWithBestEncoding(arrayBuffer: ArrayBuffer): DecodedResult {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // 1. First check UTF-8 BOM (0xEF, 0xBB, 0xBF)
  if (uint8Array.length >= 3 && uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    const sliced = uint8Array.slice(3);
    const utf8Decoder = new TextDecoder('utf-8');
    const text = utf8Decoder.decode(sliced);
    const hasCorrupted = text.includes('\uFFFD') || text.includes('');
    return { text, encoding: 'UTF-8 BOM', hasCorrupted };
  }
  
  // 2. Try standard UTF-8
  const utf8Decoder = new TextDecoder('utf-8');
  const utf8Text = utf8Decoder.decode(uint8Array);
  if (!utf8Text.includes('\uFFFD') && !utf8Text.includes('')) {
    return { text: utf8Text, encoding: 'UTF-8', hasCorrupted: false };
  }
  
  // 3. Try Windows-1252
  try {
    const win1252Decoder = new TextDecoder('windows-1252');
    const win1252Text = win1252Decoder.decode(uint8Array);
    if (!win1252Text.includes('\uFFFD') && !win1252Text.includes('')) {
      return { text: win1252Text, encoding: 'Windows-1252', hasCorrupted: false };
    }
  } catch (e) {
    console.error('Windows-1252 decoding failed:', e);
  }
  
  // 4. Try ISO-8859-1
  try {
    const isoDecoder = new TextDecoder('iso-8859-1');
    const isoText = isoDecoder.decode(uint8Array);
    const hasCorrupted = isoText.includes('\uFFFD') || isoText.includes('');
    return { text: isoText, encoding: 'ISO-8859-1', hasCorrupted };
  } catch (e) {
    console.error('ISO-8859-1 decoding failed:', e);
  }
  
  // Fallback to UTF-8
  const hasCorrupted = utf8Text.includes('\uFFFD') || utf8Text.includes('');
  return { text: utf8Text, encoding: 'UTF-8 (com erro)', hasCorrupted };
}

interface OcorrenciasViewProps {
  occurrences: DeliveryOccurrence[];
  onAddOccurrence: (occurrence: DeliveryOccurrence) => void;
  onUpdateOccurrence: (occurrence: DeliveryOccurrence) => void;
  onRemoveOccurrence: (codigo: string) => void;
  onBulkImportOccurrences: (list: DeliveryOccurrence[], replaceMode?: boolean) => void;
  onClearAllOccurrences?: () => void;
  isSyncing?: boolean;
  isMaster?: boolean;
}

export default function OcorrenciasView({
  occurrences,
  onAddOccurrence,
  onUpdateOccurrence,
  onRemoveOccurrence,
  onBulkImportOccurrences,
  onClearAllOccurrences,
  isSyncing = false,
  isMaster = false
}: OcorrenciasViewProps) {
  // Main view state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsabilidade, setFilterResponsabilidade] = useState('Todos');
  const [filterTipo, setFilterTipo] = useState('Todos');

  const [selectedCodigos, setSelectedCodigos] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Check for corrupted occurrences (with  symbol)
  const hasCorruptedOccurrences = occurrences.some(occ => 
    occ.codigo.includes('') || occ.codigo.includes('\uFFFD') || 
    occ.descricao.includes('') || occ.descricao.includes('\uFFFD') || 
    (occ.responsabilidade && (occ.responsabilidade.includes('') || occ.responsabilidade.includes('\uFFFD'))) || 
    (occ.tipo && (occ.tipo.includes('') || occ.tipo.includes('\uFFFD'))) || 
    (occ.setor_ocorr && (occ.setor_ocorr.includes('') || occ.setor_ocorr.includes('\uFFFD'))) || 
    (occ.tratativa_solucao && (occ.tratativa_solucao.includes('') || occ.tratativa_solucao.includes('\uFFFD')))
  );

  const corruptedList = occurrences.filter(occ => 
    occ.codigo.includes('') || occ.codigo.includes('\uFFFD') || 
    occ.descricao.includes('') || occ.descricao.includes('\uFFFD') || 
    (occ.responsabilidade && (occ.responsabilidade.includes('') || occ.responsabilidade.includes('\uFFFD'))) || 
    (occ.tipo && (occ.tipo.includes('') || occ.tipo.includes('\uFFFD'))) || 
    (occ.setor_ocorr && (occ.setor_ocorr.includes('') || occ.setor_ocorr.includes('\uFFFD'))) || 
    (occ.tratativa_solucao && (occ.tratativa_solucao.includes('') || occ.tratativa_solucao.includes('\uFFFD')))
  );

  const handleRemoveCorrupted = async () => {
    if (corruptedList.length === 0) return;
    if (window.confirm(`Você está prestes a excluir todos os ${corruptedList.length} registros contendo caracteres corrompidos (). Esta ação não poderá ser desfeita. Deseja continuar?`)) {
      for (const occ of corruptedList) {
        await onRemoveOccurrence(occ.codigo);
      }
      setSelectedCodigos(prev => prev.filter(code => !corruptedList.some(c => c.codigo === code)));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedCodigos.length === 0) return;
    if (window.confirm(`Excluir as ${selectedCodigos.length} ocorrências selecionadas? Esta ação não poderá ser desfeita.`)) {
      for (const code of selectedCodigos) {
        await onRemoveOccurrence(code);
      }
      setSelectedCodigos([]);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Você está prestes a apagar TODA a base de Ocorrências. Recomenda-se exportar um backup antes. Deseja continuar?")) {
      if (onClearAllOccurrences) {
        await onClearAllOccurrences();
      } else {
        // Fallback
        for (const occ of occurrences) {
          await onRemoveOccurrence(occ.codigo);
        }
      }
      setSelectedCodigos([]);
      alert("Base de Ocorrências limpa com sucesso.");
    }
  };

  // Form states (Add/Edit)
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formResponsabilidade, setFormResponsabilidade] = useState('Transportador');
  const [formTipo, setFormTipo] = useState('Recusa');
  const [formSetor, setFormSetor] = useState('Comercial');
  const [formRetorno, setFormRetorno] = useState<'Sim' | 'Não'>('Não');
  const [formTratativa, setFormTratativa] = useState('');

  // CSV Import States
  const [showImporter, setShowImporter] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importLines, setImportLines] = useState<string[]>([]);
  const [importDelimiter, setImportDelimiter] = useState(';');
  const [importedPreview, setImportedPreview] = useState<DeliveryOccurrence[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [detectedEncoding, setDetectedEncoding] = useState<string>('');
  const [previewHasCorrupted, setPreviewHasCorrupted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueSectorsInPreview = useMemo(() => {
    const sectorsSet = new Set<string>();
    importedPreview.forEach(o => {
      if (o.setor_ocorr) {
        sectorsSet.add(o.setor_ocorr.trim());
      }
    });
    return Array.from(sectorsSet);
  }, [importedPreview]);

  // Filter lists
  const responsabilidades = ['Todos', 'Transportador', 'Remetente', 'Destinatário', 'Cliente', 'Ajudante', 'Alheio'];
  const tipos = ['Todos', 'Recusa', 'Atraso', 'Avaria', 'Reentrega', 'Troca', 'Fiscal', 'Devolução'];

  // Handle single submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formDescricao.trim()) {
      alert('Código e Descrição são campos absolutamente obrigatórios.');
      return;
    }

    const item: DeliveryOccurrence = {
      codigo: formCodigo.trim().toUpperCase(),
      descricao: formDescricao.trim(),
      responsabilidade: formResponsabilidade,
      tipo: formTipo,
      setor_ocorr: formSetor,
      retorno_rota: formRetorno,
      tratativa_solucao: formTratativa.trim() || 'Nenhuma tratativa definida'
    };

    if (isEditing) {
      onUpdateOccurrence(item);
    } else {
      // Check duplicate code
      const duplicateIdx = occurrences.findIndex(o => o.codigo.toUpperCase() === item.codigo.toUpperCase());
      if (duplicateIdx !== -1) {
        alert(`O código de ocorrência "${item.codigo}" já está cadastrado no sistema.`);
        return;
      }
      onAddOccurrence(item);
    }

    resetForm();
  };

  const handleEditClick = (item: DeliveryOccurrence) => {
    setFormCodigo(item.codigo);
    setFormDescricao(item.descricao);
    setFormResponsabilidade(item.responsabilidade);
    setFormTipo(item.tipo);
    setFormSetor(item.setor_ocorr);
    setFormRetorno(item.retorno_rota);
    setFormTratativa(item.tratativa_solucao);
    setIsEditing(true);
    setShowForm(true);
    setShowImporter(false);
  };

  const resetForm = () => {
    setFormCodigo('');
    setFormDescricao('');
    setFormResponsabilidade('Transportador');
    setFormTipo('Recusa');
    setFormSetor('Comercial');
    setFormRetorno('Não');
    setFormTratativa('');
    setIsEditing(false);
    setShowForm(false);
  };

  // CSV Drag/Drop Mechanics
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const loadCsvContent = (decoded: DecodedResult) => {
    setDetectedEncoding(decoded.encoding);
    setPreviewHasCorrupted(decoded.hasCorrupted);

    const rawLines = decoded.text.split(/\r?\n/).map(l => l.trim().replace(/^\uFEFF/, '')).filter(l => l.length > 0);
    setImportLines(rawLines);

    // Auto-detect delimiter Semicolon vs Comma
    let detected = ';';
    if (rawLines.length > 0) {
      const commas = (rawLines[0].match(/,/g) || []).length;
      const semicolons = (rawLines[0].match(/;/g) || []).length;
      if (commas > semicolons) detected = ',';
    }
    setImportDelimiter(detected);
    parseList(rawLines, detected, decoded.hasCorrupted);
  };

  const parseList = (rawLines: string[], delim: string, hasCorruptedFromDecode: boolean = false) => {
    if (rawLines.length < 2) {
      setImportedPreview([]);
      setPreviewHasCorrupted(hasCorruptedFromDecode);
      return;
    }

    // Skip column headers
    const headerRow = rawLines[0].toLowerCase();
    const isHeader = headerRow.includes('cod') || headerRow.includes('desc') || headerRow.includes('tipo');
    const records = isHeader ? rawLines.slice(1) : rawLines;

    const list: DeliveryOccurrence[] = [];
    let hasCorruptedField = hasCorruptedFromDecode;

    records.forEach((line) => {
      const cells = line.split(delim).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cells.length < 2 || cells.every(c => c === '')) return;

      const codeVal = cells[0].toUpperCase();
      const descVal = cells[1];
      if (!codeVal || !descVal) return;

      // Audit cells for replacement character
      cells.forEach(cell => {
        if (cell.includes('\uFFFD') || cell.includes('')) {
          hasCorruptedField = true;
        }
      });

      list.push({
        codigo: codeVal,
        descricao: descVal,
        responsabilidade: cells[2] || 'Transportador',
        tipo: cells[3] || 'Recusa',
        setor_ocorr: cells[4] || 'Comercial',
        retorno_rota: (cells[5] && cells[5].toLowerCase().startsWith('s')) ? 'Sim' : 'Não',
        tratativa_solucao: cells[6] || 'Reentrega imediata'
      });
    });

    setImportedPreview(list);
    setPreviewHasCorrupted(hasCorruptedField);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImportFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const decodedResult = decodeBufferWithBestEncoding(arrayBuffer);
        loadCsvContent(decodedResult);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const decodedResult = decodeBufferWithBestEncoding(arrayBuffer);
        loadCsvContent(decodedResult);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleApplyCsvImport = () => {
    if (importedPreview.length === 0) {
      alert('Nenhum registro de ocorrência válido pôde ser extraído.');
      return;
    }

    if (importMode === 'replace') {
      if (window.confirm("Substituir a base atual de Ocorrências pelo arquivo importado? Os registros atuais serão apagados.")) {
        onBulkImportOccurrences(importedPreview, true);
        alert(`Sucesso! Foram importados e gravados com sucesso ${importedPreview.length} ocorrências. A base anterior foi substituída.`);
        setShowImporter(false);
        setImportFileName(null);
        setImportedPreview([]);
        setSelectedCodigos([]);
      }
    } else {
      onBulkImportOccurrences(importedPreview, false);
      alert(`Sucesso! Foram mesclados/atualizados com sucesso ${importedPreview.length} ocorrências no banco de dados.`);
      setShowImporter(false);
      setImportFileName(null);
      setImportedPreview([]);
      setSelectedCodigos([]);
    }
  };

  const loadDemoCsv = () => {
    const demo = `codigo;descricao;responsabilidade;tipo;setor_ocorr;retorno_rota;tratativa_solucao
01;CLIENTE AUSENTE NO LOCAL;Destinatário;Atraso;Operação;Sim;Aguardar até final da rota e re-agendar
02;FORA DO HORARIO COMERCIAL;Destinatário;Atraso;Transportação;Não;Agendar próxima entrega matutina
04;AVARIA DE MERCADORIA NO RATEIO;Transportador;Avaria;Qualidade;Sim;Recusa parcial com devolução imediata
09;DIVERGENCIA DE PREÇOS NA NF;Remetente;Fiscal;Comercial;Não;Aprovação de desconto com filial emissora`;
    setImportFileName("exemplo_ocorrencias.csv");
    loadCsvContent({ text: demo, encoding: 'Simulado (UTF-8)', hasCorrupted: false });
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(occurrences, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_ocorrencias_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['codigo', 'descricao', 'responsabilidade', 'tipo', 'setor_ocorr', 'retorno_rota', 'tratativa_solucao'];
    const csvRows = [headers.join(';')];
    for (const item of occurrences) {
      const values = [
        item.codigo || '',
        item.descricao || '',
        item.responsabilidade || '',
        item.tipo || '',
        item.setor_ocorr || '',
        item.retorno_rota || '',
        item.tratativa_solucao || ''
      ];
      const escapedValues = values.map(v => {
        let str = String(v).replace(/"/g, '""');
        if (str.includes(';') || str.includes('\n') || str.includes('"')) {
          str = `"${str}"`;
        }
        return str;
      });
      csvRows.push(escapedValues.join(';'));
    }
    const csvStr = csvRows.join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_ocorrencias_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter logic
  const filtered = occurrences.filter((occ) => {
    const matchesSearch =
      occ.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      occ.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      occ.tratativa_solucao.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesResp = filterResponsabilidade === 'Todos' || occ.responsabilidade === filterResponsabilidade;
    const matchesType = filterTipo === 'Todos' || occ.tipo === filterTipo;

    return matchesSearch && matchesResp && matchesType;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in text-[#dae2fd]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold text-[#dae2fd] tracking-tight">Dicionário & Tabela de Ocorrências</h2>
            {isSyncing && (
              <span className="text-[10px] bg-[#4d8eff]/20 text-[#4d8eff] border border-[#4d8eff]/30 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                Sincronizando...
              </span>
            )}
          </div>
          <p className="text-sm text-[#9cb4e4] mt-1">
            Cadastre ocorrências de devolução total, parcial ou reentregas. Sincronize layouts das transportadoras e mantenha conformidade operacional.
          </p>
        </div>

        <div className="flex gap-2">
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
            <>
              <button
                onClick={handleClearAll}
                className="px-4 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Limpar toda a base de ocorrências"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Limpar Base
              </button>

              <button
                onClick={() => {
                  setShowImporter(!showImporter);
                  setShowForm(false);
                }}
                className="px-4 py-1.5 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[#dae2fd] text-xs font-bold rounded-lg border border-[var(--router-border)] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Importar CSV
              </button>
              
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setIsEditing(false);
                  setShowImporter(false);
                  if (!showForm) {
                    setFormCodigo('');
                    setFormDescricao('');
                    setFormResponsabilidade('Transportador');
                    setFormTipo('Recusa');
                    setFormSetor('Comercial');
                    setFormRetorno('Não');
                    setFormTratativa('');
                  }
                }}
                className="px-4 py-1.5 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Nova Ocorrência
              </button>
            </>
          ) : (
            <div className="px-3.5 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-450 rounded-lg select-none flex items-center gap-1">
              <span>🔒 Mapeamento Restrito ao Master</span>
            </div>
          )}
        </div>
      </div>

      {hasCorruptedOccurrences && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0 text-amber-400">warning</span>
            <div className="text-xs space-y-1 text-left">
              <p className="font-bold uppercase tracking-wider text-amber-400">Atenção: Caracteres corrompidos detectados na base atual</p>
              <p className="opacity-90">
                Foram detectados caracteres de substituição (<span className="font-mono bg-amber-950/40 px-1 py-0.5 rounded text-amber-200"></span>) nos registros de ocorrências salvos. 
                Isso costuma ocorrer quando uma importação anterior foi feita utilizando uma codificação incorreta (ex: UTF-8 ao invés de Windows-1252).
              </p>
              <p className="font-semibold mt-1 text-amber-200">
                Recomendamos reimportar seu arquivo de ocorrências. O importador foi atualizado e agora possui detecção inteligente que lê corretamente UTF-8, Windows-1252 e ISO-8859-1 sem corromper acentos.
              </p>
            </div>
          </div>
          {isMaster && (
            <button
              onClick={handleRemoveCorrupted}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 uppercase shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              Excluir corrompidos ({corruptedList.length})
            </button>
          )}
        </div>
      )}

      {/* CSV IMPORT SHOWER */}
      {showImporter && (
        <div className="bg-[#161d30] border border-[var(--router-border)] rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-[18px]">cloud_upload</span>
                Importação em Lote via CSV
              </h3>
              <p className="text-[11px] text-[#9cb4e4]">
                Carregue múltiplos códigos com colunas ordenadas por: Código, Descrição, Responsabilidade, Tipo, Setor, Retorno, Solução.
              </p>
            </div>
            <button
              onClick={() => setShowImporter(false)}
              className="p-1 rounded hover:bg-[var(--router-surface-2)] text-[#dae2fd] hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive ? 'border-primary bg-primary-container/10 scale-[0.99]' : 'border-[var(--router-border)] hover:border-primary/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              <span className="material-symbols-outlined text-[32px] text-primary mb-2">upload_file</span>
              <p className="text-xs font-bold text-white">Solte o arquivo de ocorrências (.csv)</p>
              <p className="text-[10px] text-[#9cb4e4] mt-1 font-mono">Separado por ponto-e-vírgula (;)</p>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-[#3d7edf]"
                >
                  Procurar
                </button>
                <button
                  type="button"
                  onClick={loadDemoCsv}
                  className="px-3.5 py-1.5 bg-[var(--router-surface-2)] text-[#dae2fd] text-xs font-semibold rounded-lg hover:bg-[var(--router-surface-2)]"
                >
                  Carregar Exemplo
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#dae2fd] block">Configuração de Delimitador</label>
              <select
                value={importDelimiter}
                onChange={(e) => {
                  setImportDelimiter(e.target.value);
                  parseList(importLines, e.target.value);
                }}
                className="w-full bg-[#1b2540] border border-[var(--router-border)]/60 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value=";">Ponto-e-vírgula ( ; )</option>
                <option value=",">Vírgula ( , )</option>
              </select>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#dae2fd] block">Modo de Importação</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-primary/20 border-primary text-white font-extrabold'
                        : 'bg-[#1b2540] border-[var(--router-border)]/60 text-[#9cb4e4] hover:text-white'
                    }`}
                  >
                    <span>Substituir Base</span>
                    <span className="text-[9px] opacity-75 font-normal mt-0.5">Apagar registros antigos (Padrão)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      importMode === 'merge'
                        ? 'bg-primary/20 border-primary text-white font-extrabold'
                        : 'bg-[#1b2540] border-[var(--router-border)]/60 text-[#9cb4e4] hover:text-white'
                    }`}
                  >
                    <span>Mesclar / Atualizar</span>
                    <span className="text-[9px] opacity-75 font-normal mt-0.5">Atualizar por código / manter existentes</span>
                  </button>
                </div>
              </div>
              
              {importFileName && (
                <div className="p-3 bg-[#111624] rounded-lg border border-[var(--router-border)]/40 text-[11px] font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-white font-bold">{importFileName}</span>
                    <span className="text-emerald-400 font-bold shrink-0">{importedPreview.length} registros</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#9cb4e4]">Codificação Detectada:</span>
                    <span className="px-2 py-0.5 rounded font-bold bg-[#1b2540] text-primary">{detectedEncoding || 'Desconhecido'}</span>
                  </div>
                </div>
              )}

              {previewHasCorrupted && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-[#fca5a5] space-y-2 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    BLOQUEIO DE CORRUPÇÃO DE CARACTERES
                  </div>
                  <p>
                    O arquivo importado contém caracteres corrompidos (<strong className="bg-rose-500/20 px-1 py-0.2 rounded text-white"></strong>).
                  </p>
                  <p className="text-[10px] leading-relaxed opacity-90">
                    A importação foi bloqueada preventivamente para preservar a integridade da Mesa de Roteirização. Por favor, exporte ou salve seu arquivo CSV usando codificação <strong>UTF-8</strong> (com ou sem BOM) e tente novamente.
                  </p>
                </div>
              )}

              <button
                disabled={importedPreview.length === 0 || previewHasCorrupted}
                onClick={handleApplyCsvImport}
                className={`w-full py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-transform ${
                  (importedPreview.length === 0 || previewHasCorrupted)
                    ? 'bg-[var(--router-surface-2)] text-[var(--router-text-muted)] cursor-not-allowed'
                    : 'bg-primary hover:bg-[#4d8eff] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Salvar Registros Importados ({importedPreview.length})
              </button>
            </div>
          </div>

          {importedPreview.length > 0 && (
            <div className="space-y-4">
              <div className="border border-[var(--router-border)]/40 rounded-xl overflow-hidden mt-4">
                <div className="bg-[#12192a] px-4 py-2 border-b border-[var(--router-border)]/40 text-[10px] font-bold text-white uppercase tracking-wider flex justify-between items-center">
                  <span>Amostra das ocorrências identificadas (Primeiras 5 linhas)</span>
                  <span className="text-[9px] font-mono opacity-75">Exibindo {Math.min(5, importedPreview.length)} de {importedPreview.length}</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto font-mono text-[10px] divide-y divide-outline-variant/20 bg-[#111624]">
                  {importedPreview.slice(0, 5).map((row, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between hover:bg-[var(--router-surface-2)]/10 gap-4">
                      <div className="truncate text-left">
                        <span className="text-primary font-bold mr-2">[{row.codigo}]</span>
                        <span className="text-white font-sans">{row.descricao}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[#9cb4e4] bg-[#161d30] px-1.5 py-0.5 rounded text-[9px]">{row.responsabilidade}</span>
                        <span className="text-amber-200 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px]">{row.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unique Sectors detected */}
              <div className="p-3 bg-[#111624]/60 border border-[var(--router-border)]/30 rounded-xl text-left">
                <span className="text-[10px] font-bold text-[#9cb4e4] uppercase tracking-wider block mb-2">
                  Setores de Ocorrência Detectados ({uniqueSectorsInPreview.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSectorsInPreview.map((sec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1b2540] text-[#9cb4e4] border border-[var(--router-border)]/20"
                    >
                      {sec || 'Não Definido'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SINGLE FORM DRAWER (Add/Edit) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#161d30] border border-[var(--router-border)] rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]/30">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">{isEditing ? 'edit_square' : 'add_circle'}</span>
              {isEditing ? `Editar Ocorrência [${formCodigo}]` : 'Cadastrar Nova Ocorrência Operacional'}
            </h3>
            <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-[var(--router-surface-2)] text-[#dae2fd] hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Código Ocorrência <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="Ex: 01"
                value={formCodigo}
                disabled={isEditing}
                onChange={(e) => setFormCodigo(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50"
                required
              />
            </div>
            <div className="text-left md:col-span-2">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Descrição Comercial / Motivo <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="Ex: CLIENTE ALEGA ENTREGA COM ATRASO"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Responsabilidade Direta</label>
              <select
                value={formResponsabilidade}
                onChange={(e) => setFormResponsabilidade(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
              >
                {responsabilidades.slice(1).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Tipo Classificação</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                {tipos.slice(1).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Setor Responsável</label>
              <input
                type="text"
                placeholder="Ex: Qualidade, SAC"
                value={formSetor}
                onChange={(e) => setFormSetor(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Gera retorno imediato à base?</label>
              <select
                value={formRetorno}
                onChange={(e) => setFormRetorno(e.target.value as any)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Sim">Sim (Gera Devolução/Reentrega)</option>
                <option value="Não">Não (Tratativa em trânsito / Baixado)</option>
              </select>
            </div>
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Tratativa de Solução Proposta</label>
              <input
                type="text"
                placeholder="Ex: Re-entrega amanhã sem cobrança"
                value={formTratativa}
                onChange={(e) => setFormTratativa(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[#dae2fd] text-xs font-bold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold rounded-lg shadow-md"
            >
              {isEditing ? 'Atualizar Ocorrência' : 'Cadastrar Ocorrência'}
            </button>
          </div>
        </form>
      )}

      {/* FILTER PANEL */}
      <div className="bg-[#161d30]/60 p-4 rounded-xl border border-[var(--router-border)]/40 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#9cb4e4]">search</span>
          <input
            type="text"
            placeholder="Pesquisar por Código, Descrição ou Tratativa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111624] border border-[var(--router-border)] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
          <div className="min-w-[140px] flex-1 md:flex-initial">
            <select
              value={filterResponsabilidade}
              onChange={(e) => setFilterResponsabilidade(e.target.value)}
              className="w-full bg-[#111624] border border-[var(--router-border)] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none font-sans"
            >
              {responsabilidades.map(r => (
                <option key={r} value={r}>Resp: {r}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px] flex-1 md:flex-initial">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full bg-[#111624] border border-[var(--router-border)] rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none font-sans"
            >
              {tipos.map(t => (
                <option key={t} value={t}>Tipo: {t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SELECTED ITEMS ACTIONS BAR */}
      {selectedCodigos.length > 0 && (
        <div className="bg-indigo-950/90 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-white">
            <span className="bg-indigo-500 text-white rounded-full px-2 py-0.5 font-mono font-bold">
              {selectedCodigos.length}
            </span>
            <span>selecionados</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCodigos([])}
              className="text-indigo-300 hover:text-white font-semibold cursor-pointer underline"
            >
              Limpar seleção
            </button>
            {isMaster && (
              <button
                onClick={handleRemoveSelected}
                className="bg-rose-500 hover:bg-rose-400 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Excluir selecionados
              </button>
            )}
          </div>
        </div>
      )}

      {/* OCCURRENCES SELECTION LIST GRID */}
      <div className="router-card rounded-xl border border-[var(--router-border)] p-5">
        <div className="overflow-x-auto rounded-lg border border-[var(--router-border)]/60">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#131b2e] border-b border-[var(--router-border)] text-[11px] font-bold text-[var(--router-text-muted)]">
              <tr>
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(occ => selectedCodigos.includes(occ.codigo))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const visibleCodes = filtered.map(o => o.codigo);
                        setSelectedCodigos(prev => Array.from(new Set([...prev, ...visibleCodes])));
                      } else {
                        const visibleCodes = filtered.map(o => o.codigo);
                        setSelectedCodigos(prev => prev.filter(c => !visibleCodes.includes(c)));
                      }
                    }}
                    className="scale-110 cursor-pointer accent-indigo-500"
                  />
                </th>
                <th className="px-5 py-3">Cód</th>
                <th className="px-5 py-3">Motivo / Descrição</th>
                <th className="px-5 py-3">Responsabilidade</th>
                <th className="px-5 py-3 text-center">Tipo</th>
                <th className="px-5 py-3 text-center">Retorno base?</th>
                <th className="px-5 py-3">Tratativa de Solução</th>
                {isMaster && <th className="px-5 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 leading-normal">
              {filtered.map((occ) => {
                const getResponsabilidadeColor = (resp: string) => {
                  switch (resp) {
                    case 'Transportador': return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                    case 'Remetente': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                    case 'Destinatário': return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
                    default: return 'bg-[#1b2540] text-gray-300 border-gray-500/25';
                  }
                };

                return (
                  <tr key={occ.codigo} className={`hover:bg-[var(--router-surface-2)]/30 border-b border-[var(--router-border)]/30 transition-colors ${selectedCodigos.includes(occ.codigo) ? 'bg-indigo-500/10' : ''}`}>
                    <td className="px-5 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedCodigos.includes(occ.codigo)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCodigos(prev => [...prev, occ.codigo]);
                          } else {
                            setSelectedCodigos(prev => prev.filter(c => c !== occ.codigo));
                          }
                        }}
                        className="scale-110 cursor-pointer accent-indigo-500"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-primary text-[12px]">{occ.codigo}</td>
                    <td className="px-5 py-3.5 font-medium text-white max-w-[200px] truncate">{occ.descricao}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold font-sans ${getResponsabilidadeColor(occ.responsabilidade)}`}>
                        {occ.responsabilidade}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-white">{occ.tipo}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        occ.retorno_rota === 'Sim'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {occ.retorno_rota === 'Sim' ? 'Devolução' : 'Direto'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300 font-sans italic max-w-[240px] truncate">{occ.tratativa_solucao}</td>
                    {isMaster && (
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(occ)}
                            className="p-1 rounded hover:bg-[#1f2945] text-[#dae2fd] hover:text-primary transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir a ocorrência [${occ.codigo}] - ${occ.descricao}?`)) {
                                onRemoveOccurrence(occ.codigo);
                              }
                            }}
                            className="p-1 rounded hover:bg-[#1f2945] text-[#dae2fd] hover:text-error transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                   <td colSpan={isMaster ? 8 : 7} className="text-center py-20 text-[#9cb4e4]">
                    Nenhuma ocorrência encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
