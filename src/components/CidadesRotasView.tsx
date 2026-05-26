import React, { useState, FormEvent, useEffect } from 'react';
import { CidadeRota } from '../types';
import { CidadeRotaRepository } from '../infrastructure/localdb/repositories/cidadeRotaRepository';
import { initialCidadesRotas } from '../data';

interface CidadesRotasViewProps {
  onNotifyUpdate?: () => void;
}

export default function CidadesRotasView({ onNotifyUpdate }: CidadesRotasViewProps) {
  const [cidadeRotas, setCidadeRotas] = useState<CidadeRota[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('Todos');

  // Single record Form states
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

  // Bulk CSV loader states
  const [showImporter, setShowImporter] = useState(false);
  const [csvText, setCsvText] = useState('');

  const loadData = async () => {
    try {
      const data = await CidadeRotaRepository.getAll();
      setCidadeRotas(data);
    } catch (e) {
      console.error('[CidadesRotas] Erro ao carregar dados:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await loadData();
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
    if (confirm('Deseja realmente excluir esta regra de roteirização parametrizada?')) {
      try {
        await CidadeRotaRepository.delete(id);
        await loadData();
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

        // Detectar o formato:
        // Layout A (Antigo): CIDADE;ALIAS;SETOR;ROTA;PRAZO;PRIORIDADE
        // Layout B (Frequência Semanal): CIDADE;SETOR;SEGUNDA;TERÇA;QUARTA;QUINTA;SEXTA;COD
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

      await loadData();
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
    if (confirm('Isso irá inserir as 39 regras padrões do sistema para roteirização rápida baseada na planilha oficial. Continuar?')) {
      for (const d of initialCidadesRotas) {
        const exist = await CidadeRotaRepository.getByCidade(d.cidade);
        await CidadeRotaRepository.put({
          id: exist?.id,
          ...d
         });
      }
      await loadData();
      if (onNotifyUpdate) onNotifyUpdate();
      alert('Padrões logísticos operacionais oficiais restaurados com sucesso.');
    }
  };

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

  return (
    <div className="flex-1 p-6 space-y-6 text-left overflow-y-auto h-full">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">Parametrização de Rotas</h2>
            <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wider">
              BD_CIDADES_ROTAS
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1.5">
            Mapeamento corretivo de-para para cidades, setores, aliases de ERP, prioridades operacionais e prazos SLAs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsEditing(false);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold font-sans rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Nova Praça / Cidade
          </button>

          <button
            onClick={() => setShowImporter(true)}
            className="px-4 py-2 bg-surface hover:bg-surface-container border border-outline-variant rounded-lg text-xs font-bold text-[#dae2fd] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">publish</span>
            Importação Lote
          </button>

          <button
            onClick={handleLoadDefaults}
            className="px-3.5 py-2 bg-surface hover:bg-surface-container border border-outline-variant rounded-lg text-xs font-mono text-amber-500 font-bold transition-colors flex items-center gap-1.5"
            title="Adicionar cidades principais para teste rápido para demonstração"
          >
            <span className="material-symbols-outlined text-[16px]">restore</span>
            Restaurar Padrões
          </button>
        </div>
      </div>

      {/* Main Stats / Overview row */}
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
            <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono">
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
            <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono">
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
            <p className="text-xl font-extrabold text-[#dae2fd] mt-1 font-mono">
              {cidadeRotas.reduce((acc, curr) => acc + (curr.alias ? curr.alias.split(',').length : 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and List Block */}
      <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden flex flex-col">
        {/* Filters Panel */}
        <div className="p-4 border-b border-outline-variant/40 bg-surface/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Pesquisar cidade, alias ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 font-sans text-xs text-white focus:outline-none focus:border-primary placeholder-on-surface-variant/60 w-full uppercase"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <span className="text-xs font-sans text-on-surface-variant font-medium">Prioridade:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 font-sans text-xs text-[#dae2fd] focus:outline-none focus:border-primary cursor-pointer hover:border-outline transition-colors font-medium"
            >
              <option value="Todos">Todas as prioridades</option>
              <option value="CRÍTICA">CRÍTICA</option>
              <option value="ALTA">ALTA</option>
              <option value="NORMAL">NORMAL</option>
              <option value="BAIXA">BAIXA</option>
            </select>
          </div>
        </div>

        {/* Dense Logistics Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs font-sans">
            <thead className="bg-[#101524] text-[10.5px] text-on-surface-variant font-semibold uppercase tracking-wider border-b border-outline-variant/40">
              <tr>
                <th className="px-4 py-3 text-white">Cidade Canonical</th>
                <th className="px-4 py-3 text-center">COD</th>
                <th className="px-4 py-3">Aliases cadastrados (Para De)</th>
                <th className="px-4 py-3">Setor Padronizado</th>
                <th className="px-4 py-3">Rota de Entrega</th>
                <th className="px-4 py-3">Frequência Semanal</th>
                <th className="px-4 py-3 text-center">Prazo SLA</th>
                <th className="px-4 py-3">Operação Fiscal</th>
                <th className="px-4 py-3 text-right">Ações de Governança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-[11px] font-mono font-medium">
              {filteredData.map((item) => {
                let prioColor = 'bg-[#1e2538] text-slate-300 border-slate-700/50';
                if (item.prioridade_operacional === 'CRÍTICA') prioColor = 'bg-[#93000a]/15 text-red-300 border-red-500/20';
                else if (item.prioridade_operacional === 'ALTA') prioColor = 'bg-amber-500/10 text-amber-200 border-amber-500/20';
                else if (item.prioridade_operacional === 'NORMAL') prioColor = 'bg-primary/10 text-sky-300 border-primary/20';

                return (
                  <tr key={item.id} className="hover:bg-surface/40 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-[#dae2fd] uppercase font-sans">{item.cidade}</td>
                    <td className="px-2 py-2.5 text-center text-amber-400 font-bold font-mono text-[10px]">{item.cod || '-'}</td>
                    <td className="px-4 py-2.5 text-on-surface-variant text-[10.5px] font-sans italic hover:text-white transition-colors">
                      {item.alias ? item.alias.split(',').join(' | ') : 'Nenhum sinônimo parametrizado.'}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-primary">{item.setor}</td>
                    <td className="px-4 py-2.5 text-slate-300">{item.rota}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 font-sans text-[9px] font-bold">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.segunda ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-600 border border-transparent'}`} title="Segunda-feira">S</span>
                        <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.terca ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-600 border border-transparent'}`} title="Terça-feira">T</span>
                        <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.quarta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-600 border border-transparent'}`} title="Quarta-feira">Q</span>
                        <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.quinta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-600 border border-transparent'}`} title="Quinta-feira">Q</span>
                        <span className={`w-5 h-5 flex items-center justify-center rounded-md ${item.sexta ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-600 border border-transparent'}`} title="Sexta-feira">S</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      <span className="px-2 py-0.5 rounded bg-surface border border-outline-variant/40 text-[#dae2fd]">
                        D+{item.prazo_padrao}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-sans font-bold tracking-wide ${prioColor}`}>
                        {item.prioridade_operacional}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1 cursor-pointer hover:bg-slate-800 rounded text-sky-400 hover:text-white transition-colors"
                          title="Editar parametrização da cidade"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => item.id && handleDeleteClick(item.id)}
                          className="p-1 cursor-pointer hover:bg-slate-800 rounded text-error hover:text-red-500 transition-colors"
                          title="Remover regra logistica"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-on-surface-variant font-sans">
                    <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 mb-1 block">
                      grid_off
                    </span>
                    <p className="text-xs font-semibold">Nenhuma cidade ou de-para de rota encontrado.</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                      Tente alterar a pesquisa por texto ou pressione "Restaurar Padrões".
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single CRUD Edit/Create Record Form Overlay Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_road</span>
                <span className="font-bold text-white text-sm">
                  {isEditing ? 'Editar Configuração de Praça' : 'Cadastrar Configuração de Praça'}
                </span>
              </div>
              <button onClick={resetForm} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-5 space-y-4 bg-[#121828]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Cidade Principal (Canonical)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: VARGINHA"
                    value={formCidade}
                    onChange={(e) => setFormCidade(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Setor Operacional ERP</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ROTA 01"
                    value={formSetor}
                    onChange={(e) => setFormSetor(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Sinônimos / Aliases no ERP (Separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: VGA, VARGINHA-MG, VARG, VARGINHA MG"
                  value={formAlias}
                  onChange={(e) => setFormAlias(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary uppercase animate-fade-in"
                />
                <span className="text-[9px] text-on-surface-variant leading-none">O normalizador local redirecionará qualquer um desses termos para a cidade canonical ao processar arquivos do ERP.</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-3 sm:col-span-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Rota Operacional</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SUL-VGA"
                    value={formRota}
                    onChange={(e) => setFormRota(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <div className="space-y-1 col-span-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Prazo Padrão SLA</label>
                  <select
                    value={formPrazo}
                    onChange={(e) => setFormPrazo(Number(e.target.value))}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-primary cursor-pointer uppercase font-medium"
                  >
                    <option value={1}>D+1 (Expresso)</option>
                    <option value={2}>D+2 (Padrão)</option>
                    <option value={3}>D+3 (Especial)</option>
                    <option value={4}>Semanalizado</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Prioridade Operacional</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-2.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-primary cursor-pointer uppercase font-medium"
                  >
                    <option value="CRÍTICA">🔴 CRÍTICA</option>
                    <option value="ALTA">🟡 ALTA</option>
                    <option value="NORMAL">🔵 NORMAL</option>
                    <option value="BAIXA">🟢 BAIXA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Código interno Rota (COD)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2"
                    value={formCod}
                    onChange={(e) => setFormCod(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary uppercase"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Dias de Frequência</label>
                  <div className="flex gap-2 pt-1">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formSegunda} onChange={(e) => setFormSegunda(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#dae2fd] font-semibold">Seg</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formTerca} onChange={(e) => setFormTerca(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#dae2fd] font-semibold">Ter</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formQuarta} onChange={(e) => setFormQuarta(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#dae2fd] font-semibold">Qua</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formQuinta} onChange={(e) => setFormQuinta(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#dae2fd] font-semibold">Qui</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={formSexta} onChange={(e) => setFormSexta(e.target.checked)} className="rounded border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5" />
                      <span className="text-[10px] text-[#dae2fd] font-semibold">Sex</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-[#dae2fd] hover:text-white hover:bg-surface-bright rounded-lg border border-outline-variant/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold font-sans rounded-lg transition-transform active:scale-[0.98] shadow-lg"
                >
                  Salvar Parâmetro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Dialog */}
      {showImporter && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[#111625] border border-outline-variant rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col text-left">
            <div className="p-4 border-b border-outline-variant/60 flex justify-between items-center bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3ecf8e]">unarchive</span>
                <span className="font-bold text-white text-sm">Importação Coletiva das Cidades e Rotas (De-Para)</span>
              </div>
              <button onClick={() => setShowImporter(false)} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 bg-[#121828]">
              <div className="p-3.5 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[11px] text-[#3ecf8e] space-y-1 font-sans">
                <p className="font-bold">Formato do Layout esperado para importação (CSV):</p>
                <p className="font-mono text-[10px]">CIDADE ; ALIASES (separados por vírgula) ; SETOR ; ROTA ; SLA_PRAZO ; PRIORIDADE</p>
                <p className="font-bold mt-2">Exemplo padrão para copiar/colar:</p>
                <p className="font-mono text-[10px] select-all bg-slate-950 px-2 py-1 rounded border border-outline-variant/30 text-slate-300">
                  ALFENAS;ALFENA,ALFENAS-MG;ROTA 01;VGA-ALFENAS;2;ALTA<br />
                  LAVRAS;LAVRAS MG,LAVRAS-MG;ROTA 05;VGA-LAVRAS;2;NORMAL
                </p>
              </div>

              <div className="space-y-1 block">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Código Bruto Delimitado por Ponto e Vírgula (Colar)</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Insira as linhas de importadores aqui..."
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#3ecf8e]"
                />
              </div>

              <div className="pt-2 border-t border-outline-variant/60 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowImporter(false)}
                  className="px-4 py-2 text-xs font-bold text-[#dae2fd] hover:text-white hover:bg-surface-bright rounded-lg border border-outline-variant/50 transition-colors"
                >
                  Retornar
                </button>
                <button
                  disabled={!csvText.trim()}
                  onClick={handleCsvImport}
                  className="px-5 py-2 bg-[#3ecf8e] hover:bg-[#32b274] disabled:opacity-50 text-slate-950 text-xs font-bold font-sans rounded-lg transition-transform active:scale-[0.98] shadow-lg flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">verified</span>
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
