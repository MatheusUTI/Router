import React, { useState } from 'react';
import { RoteirizacaoDiagnostics } from '../../types';
import { AlertTriangle, Clipboard, Check, RefreshCw, X, ChevronRight, BarChart2 } from 'lucide-react';

interface RoteirizacaoDiagnosticsPanelProps {
  diagnostics: RoteirizacaoDiagnostics;
  onClearFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function RoteirizacaoDiagnosticsPanel({
  diagnostics,
  onClearFilters,
  isOpen,
  onClose,
}: RoteirizacaoDiagnosticsPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Identify the biggest drop point
  const steps = [
    { name: 'Importados (IndexedDB)', count: diagnostics.totalIndexedDb ?? 0 },
    { name: 'Disponíveis Localmente', count: diagnostics.totalAppAvailable ?? 0 },
    { name: 'Pós-Enriquecimento', count: diagnostics.totalAfterEnrichment },
    { name: 'Filtro de Filial/Unidade', count: diagnostics.totalAfterUnitFilter },
    { name: 'Filtro de Rota/Setor', count: diagnostics.totalAfterRouteFilter },
    { name: 'Filtro de Setor Ocorrência', count: diagnostics.totalAfterOccurrenceFilter },
    { name: 'Filtro de Busca Textual', count: diagnostics.totalAfterSearchFilter },
    { name: 'Compatibilidade Logística', count: diagnostics.totalAfterLogisticFilter },
    { name: 'Filtro de Status/Fase', count: diagnostics.totalAfterStatusFilter },
  ];

  let worstStepName = 'Sem perdas críticas';
  let worstStepDrop = 0;

  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];
    const drop = current.count - next.count;
    if (drop > worstStepDrop) {
      worstStepDrop = drop;
      worstStepName = `Gargalo na transição de "${current.name}" para "${next.name}" (-${drop} itens)`;
    }
  }

  // Format diagnostics payload for copying
  const copyToClipboard = () => {
    const text = `=== DIAGNÓSTICO OPERACIONAL DA MESA ===
Data/Hora: ${new Date().toLocaleString()}

-- FLUXO DO PIPELINE DE FILTROS --
1. Banco Local (IndexedDB): ${diagnostics.totalIndexedDb ?? 0}
2. Disponíveis p/ Roteirização: ${diagnostics.totalAppAvailable ?? 0} (Vinculados: ${diagnostics.totalAppLinked ?? 0})
3. Entrada Roteirização: ${diagnostics.totalBeforeEnrichment}
4. Pós-Enriquecimento: ${diagnostics.totalAfterEnrichment}
5. Pós-Filtro de Filial: ${diagnostics.totalAfterUnitFilter}
6. Pós-Filtro de Rota/Setor: ${diagnostics.totalAfterRouteFilter}
7. Pós-Filtro Setor Ocorrência: ${diagnostics.totalAfterOccurrenceFilter}
8. Pós-Busca Textual: ${diagnostics.totalAfterSearchFilter}
9. Pós-Compatibilidade Logística: ${diagnostics.totalAfterLogisticFilter}
10. Pós-Status Operacional: ${diagnostics.totalAfterStatusFilter}
11. Final Visível na Mesa: ${diagnostics.totalFinalVisible}

-- CORRELAÇÃO DE RETENÇÃO --
Gargalo de maior perda identificada:
* ${worstStepName}

-- METADADOS DE DISTRIBUIÇÃO --
Filtro de Filiais Ativos:
${JSON.stringify(diagnostics.byUnit, null, 2)}

Ocorrências por Setores:
${JSON.stringify(diagnostics.byOccurrenceSector, null, 2)}

Elegibilidade de Roteirização:
${JSON.stringify(diagnostics.byRoutingEligibility, null, 2)}

Estatísticas da Fase/Status:
${JSON.stringify(diagnostics.byStatus, null, 2)}

Compatibilidade de Depósito:
${JSON.stringify(diagnostics.byLogisticCompatibility, null, 2)}

-- FATORES DE ATENÇÃO / ALERTA --
${diagnostics.warnings.length > 0 ? diagnostics.warnings.map(w => `- ${w}`).join('\n') : '- Nenhum aviso registrado.'}
`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-[#0b1322] border border-[#1e2e4f] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#14203a] bg-[#0e1726] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-indigo-400">
            <BarChart2 className="w-5 h-5 text-indigo-500 animate-pulse" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Diagnóstico Operacional da Mesa de Roteirização
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 bg-[#14203a] rounded hover:bg-[#1e2e4f] transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contents scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-indigo-550 scrollbar-track-[#080c14]">
          
          {/* Smart Alerts */}
          {diagnostics.warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-xs font-bold uppercase text-amber-400 tracking-wider mb-1">
                  Alertas Inteligentes de Roteirização
                </p>
                <ul className="text-[11px] font-sans text-amber-300 leading-relaxed list-disc list-inside space-y-1">
                  {diagnostics.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Funnel Pipeline Visualization */}
          <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-4">
            <p className="font-mono text-[11px] font-bold uppercase text-indigo-300 tracking-wide mb-3">
              Funil do Processo de Filtro (Pipeline)
            </p>
            <div className="space-y-2">
              {steps.map((st, i) => {
                const max = diagnostics.totalIndexedDb ?? 1;
                const pct = max > 0 ? Math.round((st.count / max) * 100) : 0;
                const isZero = st.count === 0;

                return (
                  <div key={i} className="flex items-center text-xs">
                    <span className="w-6 font-mono text-[10px] text-slate-500">#{i+1}</span>
                    <span className="w-48 font-mono text-[11px] text-slate-300 truncate">{st.name}</span>
                    <div className="flex-1 mx-3 bg-[#080c14] h-2.5 rounded-full overflow-hidden border border-[#14203a]">
                      <div
                        className={`h-full transition-all duration-500 ${isZero ? 'bg-rose-600' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`w-12 text-right font-mono text-[11px] font-bold ${isZero ? 'text-rose-400' : 'text-indigo-300'}`}>
                      {st.count}
                    </span>
                    <span className="w-10 text-right font-mono text-[10px] text-slate-500">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botleneck Box */}
          <div className="bg-indigo-950/30 border border-indigo-950/60 p-3.5 rounded-lg">
            <p className="font-mono text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
              Diagnóstico do Gargalo (Maior Retenção de CTRCs)
            </p>
            <p className="font-sans text-xs text-slate-200 mt-1 font-semibold">
              ⚠️ {worstStepName}
            </p>
          </div>

          {/* Detailed distribution breakdowns counts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit */}
            <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-indigo-300 block mb-2">
                Filtro de Filiais / Unidades
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byUnit).length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byUnit).map(([unid, count]) => (
                    <div key={unid} className="flex justify-between border-b border-[#14203a]/50 py-1">
                      <span className="text-slate-400">{unid}</span>
                      <span className="text-slate-200 font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Occurrence Sector */}
            <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-indigo-300 block mb-2">
                Setores de Ocorrência
              </span>
              <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                {Object.keys(diagnostics.byOccurrenceSector).length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byOccurrenceSector).map(([sec, count]) => (
                    <div key={sec} className="flex justify-between border-b border-[#14203a]/50 py-1">
                      <span className="text-slate-400 max-w-[200px] truncate">{sec}</span>
                      <span className="text-slate-200 font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Status counts */}
            <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-indigo-300 block mb-2">
                Status Operacional da Carga (Fase)
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byStatus).length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byStatus).map(([st, count]) => (
                    <div key={st} className="flex justify-between border-b border-[#14203a]/50 py-1">
                      <span className="text-slate-400">{st}</span>
                      <span className="text-slate-200 font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-indigo-300 block mb-2">
                Elegibilidade de Roteirização
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byRoutingEligibility).length === 0 ? (
                  <p className="text-slate-500 italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byRoutingEligibility).map(([elig, count]) => (
                    <div key={elig} className="flex justify-between border-b border-[#14203a]/50 py-1">
                      <span className="text-slate-400">{elig}</span>
                      <span className="text-slate-200 font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Depot Compatibility counts */}
          <div className="bg-[#0e1726] border border-[#14203a] rounded-lg p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase text-indigo-300 block mb-2">
              Compatibilidade de Box / Depósito
            </span>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[#080c14] border border-[#14203a] p-2.5 rounded text-center">
                <span className="text-emerald-400 font-bold block text-lg font-mono">
                  {diagnostics.byLogisticCompatibility.compatible ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Compatíveis</span>
              </div>
              <div className="bg-[#080c14] border border-[#14203a] p-2.5 rounded text-center">
                <span className="text-rose-400 font-bold block text-lg font-mono">
                  {diagnostics.byLogisticCompatibility.incompatible ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Em trânsito p/ outro Box</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer controls */}
        <div className="px-5 py-4 border-t border-[#14203a] bg-[#0c121f] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded flex items-center gap-1.5 select-none transition-all active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copiado!
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  Copiar Diagnóstico
                </>
              )}
            </button>
            <button
              onClick={onClearFilters}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar Filtros da Mesa
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold text-slate-400 hover:text-slate-200 hover:bg-[#14203a] rounded transition-all"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
