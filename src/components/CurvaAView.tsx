import React, { useState, FormEvent } from 'react';
import { CurvaAClient } from '../types';

interface CurvaAViewProps {
  clients: CurvaAClient[];
  onAddClient: (client: CurvaAClient) => void;
  onUpdateClient: (client: CurvaAClient) => void;
  onRemoveClient: (cnpj: string) => void;
  onBulkImportClients: (list: CurvaAClient[]) => void;
  isSyncing?: boolean;
  isMaster?: boolean;
}

export default function CurvaAView({
  clients,
  onAddClient,
  onUpdateClient,
  onRemoveClient,
  onBulkImportClients,
  isSyncing = false,
  isMaster = false
}: CurvaAViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('Todos');

  // Single record Form
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formCnpj, setFormCnpj] = useState('');
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('A+');

  // Bulk CSV loader
  const [showImporter, setShowImporter] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importedList, setImportedList] = useState<CurvaAClient[]>([]);

  const handleSingleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formCnpj.trim() || !formName.trim()) {
      alert('CNPJ Remetente e Razão Social são mandatórios.');
      return;
    }

    const item: CurvaAClient = {
      cnpj_remetente: formCnpj.trim().replace(/[^\d]/g, ''), // clean standard punctuation
      cliente_remetente: formName.trim().toUpperCase(),
      curva_a: formClass
    };

    if (isEditing) {
      onUpdateClient(item);
    } else {
      const exists = clients.some(c => c.cnpj_remetente === item.cnpj_remetente);
      if (exists) {
        alert(`O CNPJ ${item.cnpj_remetente} já possui o ranqueamento de Curva A.`);
        return;
      }
      onAddClient(item);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormCnpj('');
    setFormName('');
    setFormClass('A+');
    setIsEditing(false);
    setShowForm(false);
  };

  const handleEditClick = (item: CurvaAClient) => {
    setFormCnpj(item.cnpj_remetente);
    setFormName(item.cliente_remetente);
    setFormClass(item.curva_a);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCsvImport = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed: CurvaAClient[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[;,]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) return;

      const cnpjClean = parts[0].replace(/[^\d]/g, '');
      const nameVal = parts[1].toUpperCase();
      const ranking = parts[2] || 'A';

      if (cnpjClean && nameVal) {
        parsed.push({
          cnpj_remetente: cnpjClean,
          cliente_remetente: nameVal,
          curva_a: ranking
        });
      }
    });

    if (parsed.length > 0) {
      onBulkImportClients(parsed);
      alert(`${parsed.length} Clientes Curva A importados com sucesso!`);
      setCsvText('');
      setShowImporter(false);
    } else {
      alert('Nenhum dado pôde ser extraído. Verifique o formato CNPJ;Cliente;Classificação.');
    }
  };

  const loadExampleData = () => {
    setCsvText(`71.120.455/0001-20;ALBINO S.A IND ALIMENTÍCIA;A+
43.511.908/0002-88;BIFARMA EMBALAGENS BRASIL;A
09.431.250/0001-90;CRISTALIA PRODUTOS QUIMICOS CO;A`);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(clients, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_curva_a_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['cnpj_remetente', 'cliente_remetente', 'curva_a'];
    const csvRows = [headers.join(';')];
    for (const item of clients) {
      const values = [
        item.cnpj_remetente || '',
        item.cliente_remetente || '',
        item.curva_a || ''
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
    link.download = `bd_curva_a_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.cnpj_remetente.includes(searchTerm) ||
      c.cliente_remetente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'Todos' || c.curva_a === filterClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in text-[#dae2fd]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold text-[#dae2fd] tracking-tight">Base de Clientes Curva A</h2>
            {isSyncing && (
              <span className="text-[10px] bg-[#4d8eff]/20 text-[#4d8eff] border border-[#4d8eff]/30 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                Sincronizando...
              </span>
            )}
          </div>
          <p className="text-sm text-[#9cb4e4] mt-1">
            Gestão estratégica dos parceiros de alta representatividade comercial. Clientes cadastrados nesta base ganham priorização absoluta e classificação autônoma de-para.
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
                onClick={() => {
                  setShowImporter(!showImporter);
                  setShowForm(false);
                }}
                className="px-4 py-1.5 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-2)] text-[#dae2fd] text-xs font-bold rounded-lg border border-[var(--router-border)] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Importar TXT/CSV
              </button>
              
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setIsEditing(false);
                  setShowImporter(false);
                  if (!showForm) {
                    setFormCnpj('');
                    setFormName('');
                    setFormClass('A+');
                  }
                }}
                className="px-4 py-1.5 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                Mapear Cliente
              </button>
            </>
          ) : (
            <div className="px-3.5 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-450 rounded-lg select-none flex items-center gap-1">
              <span>🔒 Modo Consulta (Apenas Master)</span>
            </div>
          )}
        </div>
      </div>

      {/* CSV IMPORTER DRAWER */}
      {showImporter && (
        <div className="bg-[#161d30] border border-[var(--router-border)] rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]/30">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">cloud_upload</span>
              Importar Clientes Curva A por Texto
            </h3>
            <button onClick={() => setShowImporter(false)} className="text-[#9cb4e4] hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <p className="text-[11px] text-[#9cb4e4]">
            Insira o conteúdo do arquivo abaixo, onde cada linha contemple: <strong>CNPJ;Nome do Cliente;Raking de Curva</strong>.
          </p>

          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Exemplo:&#10;12345678000100;ALIMENTOS BRASILEIROS LTDA;A+&#10;98765432000200;LOG TRANSPORTES NACIONAIS SO;A"
            className="w-full bg-[#111624] border border-[var(--router-border)]/65 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-primary"
          />

          <div className="flex justify-between items-center">
            <button
              onClick={loadExampleData}
              className="text-[#4d8eff] hover:underline text-[11px] font-bold"
            >
              Exemplo de Formato Comum
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImporter(false)}
                className="px-4.5 py-1.5 bg-[var(--router-surface-2)] text-white rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleCsvImport}
                className="px-5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow hover:bg-[#3d7edf]"
              >
                Salvar Clientes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE EDIT/ADD CLIENT FORM */}
      {showForm && (
        <form onSubmit={handleSingleSubmit} className="bg-[#161d30] border border-[var(--router-border)] rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--router-border)]/30">
            <h3 className="text-sm font-bold text-white flex items-center gap-1">
              <span className="material-symbols-outlined text-primary">{isEditing ? 'edit' : 'add_circle'}</span>
              {isEditing ? `Editar Cadastro de Cliente ${formCnpj}` : 'Vincular Novo Cliente Parceiro Curva A'}
            </h3>
            <button type="button" onClick={resetForm} className="text-[#9cb4e4] hover:text-white">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">CNPJ Remetente <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="Apenas números ou formatado"
                value={formCnpj}
                disabled={isEditing}
                onChange={(e) => setFormCnpj(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary disabled:opacity-50 font-mono"
                required
              />
            </div>

            <div className="text-left md:col-span-2">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Razão Social / Nome do Cliente <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="NOME CORPORATIVO DO REMETENTE OU EXPEDIDOR"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="text-left">
              <label className="text-[11px] font-bold text-[#dae2fd] block mb-1">Classificação de Curva</label>
              <select
                value={formClass}
                onChange={(e) => setFormClass(e.target.value)}
                className="w-full bg-[#1b2540] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="A+">Prioridade Máxima (A+)</option>
                <option value="A">Prioritário Padrão (A)</option>
                <option value="A-">Nível Secundário (A-)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-[var(--router-surface-2)] text-white rounded-lg text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow"
            >
              Confirmar Dados
            </button>
          </div>
        </form>
      )}

      {/* SEARCH AND FILTERS */}
      <div className="bg-[#161d30]/60 p-4 rounded-xl border border-[var(--router-border)]/40 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#9cb4e4]">search</span>
          <input
            type="text"
            placeholder="Pesquisar por Razão Social or CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111624] border border-[var(--router-border)] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="min-w-[150px] w-full md:w-auto">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full bg-[#111624] border border-[var(--router-border)]/50 rounded-lg px-3 py-2 text-xs text-[#dae2fd] focus:outline-none"
          >
            <option value="Todos">Todas as Curvas</option>
            <option value="A+">Categoria A+</option>
            <option value="A">Categoria A</option>
            <option value="A-">Categoria A-</option>
          </select>
        </div>
      </div>

      {/* READ TABLE */}
      <div className="router-card rounded-xl border border-[var(--router-border)] p-5">
        <div className="overflow-x-auto rounded-lg border border-[var(--router-border)]/60">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#131b2e] border-b border-[var(--router-border)] text-[11px] font-bold text-[var(--router-text-muted)]">
              <tr>
                <th className="px-5 py-3">CNPJ Mapeado</th>
                <th className="px-5 py-3">Razão Social do Cliente Remetente</th>
                <th className="px-5 py-3 text-center">Classificação Curva A</th>
                <th className="px-5 py-3 text-center">Atendimento Priorizado</th>
                {isMaster && <th className="px-5 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 leading-normal">
              {filteredClients.map((client, idx) => {
                const getBadgeColors = (bracket: string) => {
                  if (bracket === 'A+') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                  if (bracket === 'A') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                };

                return (
                  <tr key={`${client.cnpj_remetente}_${idx}`} className="hover:bg-[var(--router-surface-2)]/30 border-b border-[var(--router-border)]/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[#dae2fd] font-semibold text-[11.5px]">{client.cnpj_remetente}</td>
                    <td className="px-5 py-3.5 text-white font-sans font-medium uppercase">{client.cliente_remetente}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getBadgeColors(client.curva_a)}`}>
                        {client.curva_a}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-emerald-400 font-bold font-mono">
                      ⭐ SIM
                    </td>
                    {isMaster && (
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(client)}
                            className="p-1 rounded hover:bg-[#1f2945] text-[#dae2fd] hover:text-primary transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remover cliente ${client.cliente_remetente} da lista Curva A?`)) {
                                onRemoveClient(client.cnpj_remetente);
                              }
                            }}
                            className="p-1 rounded hover:bg-[#1f2945] text-[#dae2fd] hover:text-error transition-colors cursor-pointer"
                            title="Remover"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={isMaster ? 5 : 4} className="text-center py-20 text-[#9cb4e4]">
                    Nenhum cliente cadastrado nesta diretriz.
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
