import { useState, useRef, DragEvent, ChangeEvent, FormEvent } from 'react';
import { Ctrc } from '../types';

interface ImportacaoViewProps {
  onAddCtrcs: (newCtrcs: Ctrc[]) => void;
}

// Exact Camilo dos Santos ERP output from user prompt
const CAMILO_DOS_SANTOS_RAW = `0;RODOVIARIO CAMILO DOS SANTOS  ;CTRCs EXPEDIDOS E RECEBIDOS;PREVISAO DE ENTREGA: 22/05/26 A 27/05/26;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
1;Serie/Numero CTRC;Cliente Remetente;Cliente Pagador;Cliente Destinatario;Endereco do Destinatario;Bairro do Destinatario;Setor de Destino;Praca de Destino;Cidade do Destinatario;Cliente Recebedor;Local de Entrega;Endereco;Bairro;Cidade de Entrega;Unidade Receptora;Numero da Nota Fiscal;Peso Real em Kg;Quantidade de Volumes;Valor da Mercadoria;Valor do Frete;TDE;Agendamento;Codigo da Ultima Ocorrencia;Data de inclusao da Ultima Ocorrencia;Data da Ultima Ocorrencia;Usuario da Ultima Ocorrencia;Unidade da Ultima Ocorrencia;Descricao da Ultima Ocorrencia;Latitude da Ultima Ocorrencia;Longitude da Ultima Ocorrencia;Previsao de Entrega;Entrega Programada;Data da Entrega Realizada;Quantidade de Dias de Atraso;Localizacao Atual;Data do Cancelamento;Motivo do Cancelamento;Codigo dos Correios
2;VGA433233-4;MARELLI COFAP DO BRASIL LTDA.;MARELLI COFAP DO BRASIL LTDA.;COMPANHIA BRASILEIRA DE DISTRIBUICAO AUTOMOTIVA S.A;R HUMBERTO PIZZO 20 LETRA A;JARDIM CANAA;99;VGAP;VARGINHA;COMPANHIA BRASILEIRA DE DISTRIBUICAO AUTOMOTIVA S.A;;;;VARGINHA;VGA;368498;169,58;20;26919,32;316,9;150;0;30;22/05/2026;22/05/2026;tmoreira;RCS - MTZ;COMPANHIA BRASILEIRA;;;26/05/2026;;;0;RCS VGA-CT-e autorizado com 20 volumes e 170 Kg. Destino: MG/VARGINHA. Previsao de entrega: 26/05/26;;;
2;CPQ854800-5;HONDA AUTOMOVEIS DO BRASIL LTDA;HONDA AUTOMOVEIS DO BRASIL LTDA;MIGOTO COMERCIO DE VEICULOS LTDA;AVENIDA PRINCESA DO SUL 830 ;JARDIM ANDERE;01  ROTA 1;VGAP;VARGINHA;MIGOTO COMERCIO DE VEICULOS LTDA;;;;VARGINHA;VGA;5917913;6,615;5;5925;65,86;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854847-1;HONDA AUTOMOVEIS DO BRASIL LTDA;HONDA AUTOMOVEIS DO BRASIL LTDA;MIGOTO COMERCIO DE VEICULOS LTDA;AVENIDA PRINCESA DO SUL 830 ;JARDIM ANDERE;01  ROTA 1;VGAP;VARGINHA;MIGOTO COMERCIO DE VEICULOS LTDA;;;;VARGINHA;VGA;5917649;19,18;2;3402,45;103,65;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854892-7;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;UNIFENAS UNIVERS. DO ROSARIO V;ARTHUR BERNARDES 717 CENTRO;.;02  ROTA 2;VGAP;ALFENAS;UNIFENAS UNIVERS. DO ROSARIO V;UNIVERSIDADE JOSE DO ROSARIO VELLANO- UNIFENAS;R. JOAO DE CAMARGO , 520;CENTRO;ALFENAS;VGA;180985;21,2;6;2302,2;77,16;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ854901-0;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;COMPANHIA BRASILEIRA DE EDUCACAO E SISTEMAS DE ENSINO S.A;ASSOCIACAO CULTURAL PROF. ROQUE TAMBURIN;RUA TARGINO NOGUEIRA 144 ;VILA NOGUEIRA;01  ROTA 1;VGAP;VARGINHA;ASSOCIACAO CULTURAL PROF. ROQUE TAMBURIN;;;;VARGINHA;VGA;181152;3,092;1;1134,3;41,98;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;25/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855058-1;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;MOTO STAR T C LTDA;AVENIDA REI PELE 1361 ;JARDIM NOVO HORIZONTE;05  ROTA 5;VGAP;TRES CORACOES;MOTO STAR T C LTDA;;;;TRES CORACOES;VGA;16412544;10,135;8;3115,01;65,35;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855065-4;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;GUIOMOTO LTDA;AV ANTONIO JUNQUEIRA DE SOUZA 321 ;CENTRO;07  ROTA 7;VGAP;SAO LOURENCO;GUIOMOTO LTDA;;;;SAO LOURENCO;VGA;16412523;12,35;9;4128,92;70,34;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855066-2;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;BY MOTO LAVRAS VEICULOS E PECA;AV ERNESTO MATIOLI 860 ;PLANALTO;06  ROTA 6;VGAP;LAVRAS;BY MOTO LAVRAS VEICULOS E PECA;;;;LAVRAS;VGA;16412634;15,73;10;4579,74;86,97;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;CPQ855072-7;MOTO HONDA DA AMAZONIA LTDA;MOTO HONDA DA AMAZONIA LTDA;BRENO MOTOS LTDA;AV ARLINDO FIGUEIREDO 2029 ;SAO FRANCISCO;10  ROTA 10;VGAR;PASSOS;BRENO MOTOS LTDA;;;;PASSOS;VGA;16412806;5,7;6;1554,81;65,07;0;0;58;23/05/2026;23/05/2026;guisanto;RCS - PPY;Saida da unidade POUSO ALEGRE em 23/05/26, 05:02h. Previsao de chegada na unidade VARGINHA em 23/05/26, 07:02h.;;;26/05/2026;;;0;RCS VGA - EM TRANSITO COM DESTINO A UNIDADE VARGINHA;;;
2;BHZ907302-7;CLARA COMERCIO DE COSMETICOS L;CLARA COMERCIO DE COSMETICOS L;ROBERTA MACHADO VASCONCELOS MESQUITA;R LUCIANO PEREIRA PENHA 36 LOJA 1;CENTRO;05  ROTA 5;VGAP;TRES CORACOES;ROBERTA MACHADO VASCONCELOS MESQUITA;;;;TRES CORACOES;VGA;59992;40;4;1915,74;109,18;0;0;59;22/05/2026;22/05/2026;danielk;RCS - VGA;Chegada na unidade VARGINHA em 22/05/26, 07:25h.;;;25/05/2026;;;0;RCS VGA - VARGINHA - APONTADO PARA ENTREGA - VEICULO: CSF5246;;;
2;BHZ907482-1;MAXIBRASIL INDUSTRIA DE COSMET;MAXIBRASIL INDUSTRIA DE COSMET;MAGALHAES;AVENIDA PEDRO SALES 167 ;CENTRO;06  ROTA 6;VGAP;LAVRAS;MAGALHAES;;;;LAVRAS;VGA;154360;121,447;23;6870,76;321,34;0;0;60;23/05/2026;23/05/2026;danielk;RCS - VGA;Saida para entrega na cidade de LAVRAS.;;;25/05/2026;;;0;RCS VGA - EM ENTREGA;;;
9;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;`;

export default function ImportacaoView({ onAddCtrcs }: ImportacaoViewProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>('');
  
  // Custom header selection state
  const [lines, setLines] = useState<string[]>([]);
  const [headerLineIndex, setHeaderLineIndex] = useState<number>(-1); // -1 = unselected
  const [delimiter, setDelimiter] = useState<string>(';');
  const [removePrefix, setRemovePrefix] = useState<boolean>(true);

  // Field mappings state (associated column headers)
  const [mappings, setMappings] = useState<Record<string, string>>({
    id: '',
    destinatario: '',
    cidade: '',
    weight: '',
    volume: '',
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const loadCsvContent = (text: string) => {
    setCsvRawText(text);
    // Split into individual non-empty lines
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    setLines(rawLines);

    // Auto-detect Semicolon vs Comma
    let detectedDelimiter = ';';
    if (rawLines.length > 0) {
      const commas = (rawLines[0].match(/,/g) || []).length;
      const semicolons = (rawLines[0].match(/;/g) || []).length;
      if (commas > semicolons) {
        detectedDelimiter = ',';
      }
    }
    setDelimiter(detectedDelimiter);

    // Auto-detect header row line: Find the row containing 'ctrc' or 'cliente'
    let bestHeaderIdx = 0; // Default to line 1
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      const lower = rawLines[i].toLowerCase();
      if (lower.includes('ctrc') || lower.includes('numero') || lower.includes('destinatario')) {
        bestHeaderIdx = i;
        break;
      }
    }
    setHeaderLineIndex(bestHeaderIdx);

    // Auto-detect prefix pattern (e.g. "1;Serie/Numero" or "2;VGA")
    let hasPrefixes = false;
    if (rawLines.length > 1) {
      hasPrefixes = rawLines.slice(0, 3).every(line => /^\d+[;,]/.test(line));
    }
    setRemovePrefix(hasPrefixes);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        loadCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadDemo = () => {
    setFileName("sistema_camilosantos_export.csv");
    loadCsvContent(CAMILO_DOS_SANTOS_RAW);
    setSuccessMsg(null);
  };

  const cleanPrefix = (lineStr: string) => {
    if (!removePrefix) return lineStr;
    const regex = new RegExp(`^\\d+\\s*\\${delimiter}`);
    return lineStr.replace(regex, '');
  };

  const getExtractedHeaders = (): string[] => {
    if (headerLineIndex === -1 || !lines[headerLineIndex]) return [];
    const lineWithCleanedPrefix = cleanPrefix(lines[headerLineIndex]);
    return lineWithCleanedPrefix.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
  };

  const extractedHeaders = getExtractedHeaders();

  // Trigger when header row index or headers list changes to auto-map fields
  const handleMapChange = (field: string, csvHeader: string) => {
    setMappings(prev => ({ ...prev, [field]: csvHeader }));
  };

  // Run auto-mapping logic based on keywords
  const triggerAutoMapping = () => {
    const newMappings = { id: '', destinatario: '', cidade: '', weight: '', volume: '' };
    extractedHeaders.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('ctrc') || lower.includes('numero') || lower.includes('número')) {
        newMappings.id = h;
      } else if (lower.includes('destinatario') || lower.includes('recebedor') || lower.includes('cliente')) {
        // Prefer Destinatario over Remetente/Pagador
        if (!newMappings.destinatario || lower.includes('destinatario')) {
          newMappings.destinatario = h;
        }
      } else if (lower.includes('cidade de entrega') || lower.includes('cidade do destinatario') || lower.includes('cidade') || lower.includes('praca')) {
        if (!newMappings.cidade || lower.includes('entrega')) {
          newMappings.cidade = h;
        }
      } else if (lower.includes('peso') || lower.includes('weight') || lower.includes('kg')) {
        newMappings.weight = h;
      } else if (lower.includes('volume') || lower.includes('qtde') || lower.includes('m3') || lower.includes('cubagem')) {
        newMappings.volume = h;
      }
    });
    setMappings(newMappings);
  };

  // Run auto-match click hander
  const handleAutoMatchFields = () => {
    triggerAutoMapping();
  };

  const parsePtBrFloat = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Generate parsed records for live feedback / database saving
  const parseRows = (): Ctrc[] => {
    if (headerLineIndex === -1 || lines.length <= headerLineIndex + 1) return [];

    const columnHeaders = extractedHeaders;
    const idIdx = columnHeaders.indexOf(mappings.id);
    const destIdx = columnHeaders.indexOf(mappings.destinatario);
    const cityIdx = columnHeaders.indexOf(mappings.cidade);
    const weightIdx = mappings.weight ? columnHeaders.indexOf(mappings.weight) : -1;
    const volIdx = mappings.volume ? columnHeaders.indexOf(mappings.volume) : -1;

    // We collect data rows lying strictly BELOW the selected header row line
    const dataLines = lines.slice(headerLineIndex + 1);
    const results: Ctrc[] = [];

    dataLines.forEach((rawLine, idx) => {
      const cleaned = cleanPrefix(rawLine);
      const cells = cleaned.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      // If the row cells are mostly empty or shorter than critical index, skip it
      if (cells.length < 2 || cells.every(c => c === '')) return;

      const idVal = idIdx !== -1 ? cells[idIdx] : '';
      const destVal = destIdx !== -1 ? cells[destIdx] : '';
      const cityVal = cityIdx !== -1 ? cells[cityIdx] : '';

      // Skip invalid header rows duplicated or trailer rows like "9;;;;..." represented as empty cells
      if (!idVal && !destVal) return;

      let weightVal = 180; // default average fallback
      if (weightIdx !== -1 && cells[weightIdx]) {
        weightVal = parsePtBrFloat(cells[weightIdx]);
      }

      let volumesVal = 4; // default volumes fallback
      if (volIdx !== -1 && cells[volIdx]) {
        volumesVal = parsePtBrFloat(cells[volIdx]);
      }

      results.push({
        id: idVal ? idVal : `CTRC #${90400 + idx}`,
        destinatario: destVal || 'Destinatário Desconhecido',
        cidade: cityVal || 'Ponto de Distribuição',
        weight: weightVal || 150,
        volume: volumesVal || 2, // Treated as packages / weight metric support
        type: (weightVal > 1000) ? 'CURVA A' : 'NORMAL',
        status: 'Pendente',
      });
    });

    return results;
  };

  const parsedRecords = parseRows();
  const previewCollection = parsedRecords.slice(0, 5); // display first 5

  const handleApplyMapping = () => {
    if (!mappings.id || !mappings.destinatario || !mappings.cidade) {
      alert("Por favor, preencha ao menos as associações obrigatórias: ID CTRC, Destinatário e Cidade de Destino.");
      return;
    }

    if (parsedRecords.length === 0) {
      alert("Nenhum registro de CTRC válido pôde ser extraído com a configuração atual. Altere a linha do cabeçalho.");
      return;
    }

    onAddCtrcs(parsedRecords);
    setSuccessMsg(`Importação realizada com sucesso de ${parsedRecords.length} CTRCs vindos do arquivo local! Eles acabaram de ser anexados ao painel operacional e estão prontos para a formulação do seu Romaneio.`);
    
    // reset states
    setFileName(null);
    setLines([]);
    setHeaderLineIndex(-1);
    setCsvRawText('');
    setMappings({ id: '', destinatario: '', cidade: '', weight: '', volume: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h2 className="text-3xl font-extrabold text-[#dae2fd] tracking-tight">Importação & Governança de Manifestos</h2>
        <p className="text-sm text-on-surface-variant mt-1.5 max-w-4xl text-[#9cb4e4] leading-relaxed">
          Evite a redigitação manual de CTRCs. Faça o upload do arquivo bruto extraído do seu ERP institucional (como Camilo dos Santos), mapeie qual linha define os cabeçalhos de forma interativa e trace as colunas físicas para o nosso de-para de rateio.
        </p>
      </div>

      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 text-on-surface p-4 rounded-xl flex items-start gap-3 relative overflow-hidden backdrop-blur-sm animate-scale-up">
          <div className="absolute top-0 left-0 w-2.5 h-full bg-primary" />
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
          <div>
            <p className="text-xs font-bold text-white">Banco de Dados Complementado</p>
            <p className="text-[11px] text-[#9cb4e4] mt-0.5 leading-normal">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Main step grid flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* STEP 1 & 2: Load File & Choose Header Row */}
        <div className="lg:col-span-7 bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl space-y-6">
          
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">1</span>
              Carregar Arquivo Sistema ERP
            </h3>
            <p className="text-[11px] text-[#9cb4e4] mb-4">
              Arraste seu manifesto ou use o botão para capturar do seu dispositivo corporativo.
            </p>

            {/* Drag & Drop Frame */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? 'border-primary bg-primary-container/10 scale-[0.99]'
                  : 'border-outline-variant hover:border-[#4d8eff]/50 hover:bg-[#1f2945]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.txt"
                onChange={handleFileChange}
              />
              
              <div className="w-12 h-12 rounded-full bg-[#1b2540] flex items-center justify-center border border-outline-variant mb-3 text-primary shadow-inner">
                <span className="material-symbols-outlined text-[24px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  upload_file
                </span>
              </div>
              
              <p className="text-[11px] font-semibold text-white">Solte o arquivo do manifesto bruto aqui</p>
              <p className="text-[10px] text-[#9cb4e4] mt-1">Semicolon (;), Comma (,) ou Tabulações</p>

              <div className="flex gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary hover:bg-[#3d7edf] text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-[0.98]"
                >
                  Procurar Arquivo
                </button>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#dae2fd] border border-slate-700 text-xs font-semibold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">cloud_download</span>
                  Usar Arquivo Anexo (ERP)
                </button>
              </div>
            </div>

            {fileName && (
              <div className="mt-3 bg-[#111624] p-3 rounded-xl border border-outline-variant/60 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">lab_profile</span>
                  <span className="text-xs font-mono text-white truncate font-semibold">{fileName}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-primary bg-[#4d8eff]/10 px-2 py-0.5 rounded-full font-mono">
                  {lines.length} linhas
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Line selection as header */}
          {lines.length > 0 && (
            <div className="pt-4 border-t border-outline-variant/40 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">2</span>
                  Selecione a Linha de Cabeçalho do Arquivo
                </h3>
                <p className="text-[11px] text-[#9cb4e4] leading-relaxed">
                  Como cada analista exporta o relatório de maneira variada, indique ao RotaOperational qual das primeiras 10 linhas contém os nomes corretos dos campos.
                </p>
              </div>

              {/* Parsing global settings config */}
              <div className="bg-[#111624] p-3 rounded-lg border border-outline-variant/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#dae2fd] block mb-1">Separador de Colunas</label>
                  <select
                    value={delimiter}
                    onChange={(e) => {
                      setDelimiter(e.target.value);
                      // Clear mappings to avoid incongruence
                      setMappings({ id: '', destinatario: '', cidade: '', weight: '', volume: '' });
                    }}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 rounded px-2.5 py-1 text-xs text-[#dae2fd] focus:outline-none"
                  >
                    <option value=";">Ponto-e-vírgula ( ; )</option>
                    <option value=",">Vírgula ( , )</option>
                    <option value="\t">Tabulação ( TAB )</option>
                  </select>
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-[#dae2fd] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removePrefix}
                      onChange={(e) => setRemovePrefix(e.target.checked)}
                      className="w-4 h-4 bg-[#1b2540] border border-outline-variant/60 rounded accent-primary cursor-pointer"
                    />
                    <span>Remover ID de controle de Linha (ex: '1;', '2;')</span>
                  </label>
                </div>
              </div>

              {/* Rows List Selector */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 select-none border border-outline-variant/40 rounded-xl p-2.5 bg-[#121828]">
                {lines.slice(0, 10).map((line, idx) => {
                  const isSelected = headerLineIndex === idx;
                  const displayLine = line.length > 100 ? `${line.substring(0, 100)}...` : line;
                  return (
                    <div
                      key={idx}
                      onClick={() => setHeaderLineIndex(idx)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center md:items-start gap-3 justify-between ${
                        isSelected
                          ? 'bg-[#1b2b4d] border-primary text-white shadow-md'
                          : 'bg-[#181f33] border-outline-variant/30 hover:border-outline-variant text-[#9cb4e4] hover:bg-[#1a233b]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-primary' : 'border-outline-variant/60'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </span>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-90">Linha {idx + 1}</p>
                          <p className="text-[11px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] md:max-w-xl text-left">{displayLine}</p>
                        </div>
                      </div>
                      {idx === 1 && (
                        <span className="text-[9px] bg-emerald-500/25 text-emerald-300 font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-widest hidden md:block">
                          Cabeçalho Comum
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* STEP 3: Attribute De-Para Column Pairing Map */}
        <div className="lg:col-span-5 bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col justify-between self-stretch">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-primary-container text-on-primary-container text-[11px] flex items-center justify-center font-bold">3</span>
                De-Para de Atributos do Schema
              </h3>
              {extractedHeaders.length > 0 && (
                <button
                  onClick={handleAutoMatchFields}
                  className="text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                >
                  <span className="material-symbols-outlined text-[13px]">magic_button</span>
                  Auto-Detectar
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#9cb4e4] mb-4">
              Diga qual coluna do arquivo físico corresponde aos nossos campos operacionais padrão de roteirização.
            </p>

            {extractedHeaders.length === 0 ? (
              <div className="py-14 text-center text-[#9cb4e4] bg-[#111624] border border-outline-variant/50 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                <span className="material-symbols-outlined text-[36px] text-slate-600">border_all</span>
                <span className="text-xs font-semibold text-white">Associação Desativada</span>
                <span className="text-[10px] text-[#9cb4e4]/70 max-w-[220px]">Indique acima qual linha representa o cabeçalho para habilitar os selects</span>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* ID CTRC */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dae2fd] flex items-center gap-1">
                    Número do CTRC ou Manifesto <span className="text-rose-500 font-mono">*</span>
                  </label>
                  <select
                    value={mappings.id}
                    onChange={(e) => handleMapChange('id', e.target.value)}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Selecione a coluna correspondente --</option>
                    {extractedHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Cliente / Destinatário */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dae2fd] flex items-center gap-1">
                    Cliente Recebedor / Destinatário <span className="text-rose-500 font-mono">*</span>
                  </label>
                  <select
                    value={mappings.destinatario}
                    onChange={(e) => handleMapChange('destinatario', e.target.value)}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Selecione a coluna correspondente --</option>
                    {extractedHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Cidade de Destino */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dae2fd] flex items-center gap-1">
                    Cidade de Entrega <span className="text-rose-500 font-mono">*</span>
                  </label>
                  <select
                    value={mappings.cidade}
                    onChange={(e) => handleMapChange('cidade', e.target.value)}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Selecione a coluna correspondente --</option>
                    {extractedHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Peso Real */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dae2fd] flex items-center gap-1">
                    Peso Real em Kg (Opcional)
                  </label>
                  <select
                    value={mappings.weight}
                    onChange={(e) => handleMapChange('weight', e.target.value)}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Desconsiderar coluna real --</option>
                    {extractedHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Volumes / Cubagem */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#dae2fd] flex items-center gap-1">
                    Quantidade de Volumes / Cubagem (Opcional)
                  </label>
                  <select
                    value={mappings.volume}
                    onChange={(e) => handleMapChange('volume', e.target.value)}
                    className="w-full bg-[#1b2540] border border-outline-variant/60 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-primary"
                  >
                    <option value="">-- Desconsiderar coluna volumes --</option>
                    {extractedHeaders.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-outline-variant/30 flex justify-between items-center gap-4">
            <span className="text-[10px] text-[#9cb4e4] font-mono leading-tight">
              {parsedRecords.length > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  {parsedRecords.length} registros extraídos
                </span>
              ) : (
                '0 registros identificados'
              )}
            </span>
            <button
              disabled={extractedHeaders.length === 0 || !mappings.id || !mappings.destinatario || !mappings.cidade}
              onClick={handleApplyMapping}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow ${
                extractedHeaders.length === 0 || !mappings.id || !mappings.destinatario || !mappings.cidade
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-[#4d8eff] text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Confirmar e Carregar para Rota
            </button>
          </div>
        </div>

      </div>

      {/* STEP 4: Live Simulated CTRC database Preview */}
      {previewCollection.length > 0 && (
        <div className="bg-[#161d30] border border-outline-variant rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">quick_reference_all</span>
                Visualização do Rateio Operacional (Primeiros 5 Registros Extraídos)
              </h3>
              <p className="text-[11px] text-[#9cb4e4] mt-0.5">
                Observe como os dados serão inseridos de forma padronizada de acordo com as conversões de de-para.
              </p>
            </div>
            <div className="text-[10px] font-mono bg-[#111624] border border-outline-variant px-3 py-1 rounded-xl text-[#dae2fd]">
              UTF-8 CSV Decoder
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline-variant/50 bg-[#111624]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#12192a] border-b border-outline-variant/60 text-[#dae2fd]/70 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-4 py-3">Código CTRC</th>
                  <th className="px-4 py-3">Cliente Destinatário</th>
                  <th className="px-4 py-3">Cidade de Entrega</th>
                  <th className="px-4 py-3 text-right">Peso Real</th>
                  <th className="px-4 py-3 text-right">Volumes</th>
                  <th className="px-4 py-3 text-center">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 leading-normal font-mono text-[11px]">
                {previewCollection.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-[#4d8eff] font-bold">{row.id}</td>
                    <td className="px-4 py-3 text-white truncate max-w-[220px] font-sans font-medium">{row.destinatario}</td>
                    <td className="px-4 py-3 text-[#dae2fd] font-sans">{row.cidade}</td>
                    <td className="px-4 py-3 text-right text-amber-200 font-bold">{row.weight.toLocaleString('pt-BR')} Kg</td>
                    <td className="px-4 py-3 text-right text-sky-200">{row.volume} vol</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-[9px] font-sans font-bold px-2 py-0.5 rounded-full ${
                        row.type === 'CURVA A'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
