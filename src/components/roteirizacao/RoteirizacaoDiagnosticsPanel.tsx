import React, { useState } from 'react';
import { RoteirizacaoDiagnostics } from '../../types';
import { AlertTriangle, Clipboard, Check, RefreshCw, X, ChevronRight, BarChart2 } from 'lucide-react';
import { CtrcRepository } from '../../infrastructure/localdb/repositories/ctrcRepository';

interface RoteirizacaoDiagnosticsPanelProps {
  diagnostics: RoteirizacaoDiagnostics;
  onClearFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
  adminUser?: any; // AppUser or null
  onRefreshCtrcs?: () => void;
}

export default function RoteirizacaoDiagnosticsPanel({
  diagnostics,
  onClearFilters,
  isOpen,
  onClose,
  adminUser,
  onRefreshCtrcs,
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
    <div className="absolute top-14 right-3 z-[60] w-[calc(100%-24px)] md:w-[480px] bg-[var(--router-bg)]/95 border border-[var(--router-border)] rounded-xl shadow-[var(--router-shadow)] overflow-hidden flex flex-col max-h-[80vh] animate-fade-in backdrop-blur-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--router-border)] bg-[var(--router-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[var(--router-primary)]">
            <BarChart2 className="w-5 h-5 text-[var(--router-primary)] animate-pulse" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--router-text)]">
              Diagnóstico Operacional da Mesa de Roteirização
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--router-text-muted)] hover:text-[var(--router-text)] bg-[var(--router-surface-2)] rounded hover:bg-[var(--router-surface-3)] transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contents scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-indigo-550 scrollbar-track-transparent dark:scrollbar-track-[#080c14]">
          
          {/* Smart Alerts */}
          {diagnostics.warnings.length > 0 && (
            <div className="bg-[var(--router-warning)]/10 border border-[var(--router-warning)]/30 p-4 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--router-warning)] shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-xs font-bold uppercase text-[var(--router-warning)] tracking-wider mb-1 opacity-90">
                  Alertas Inteligentes de Roteirização
                </p>
                <ul className="text-[11px] font-sans text-[var(--router-warning)] opacity-80 leading-relaxed list-disc list-inside space-y-1">
                  {diagnostics.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Audit & Clean-up Contaminated CTRCs Panel */}
          {(diagnostics.contaminationCount ?? 0) > 0 && (
            <div className="bg-[var(--router-danger)]/10 border border-[var(--router-danger)]/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-[var(--router-danger)]">
                <AlertTriangle className="w-5 h-5 text-[var(--router-danger)] shrink-0 animate-pulse" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider opacity-90">
                  Auditoria de Integridade Semântica (Destinatário = Cidade)
                </h4>
              </div>

              <div className="text-[11px] font-sans text-[var(--router-danger)] opacity-80 leading-relaxed space-y-2">
                <p>
                  Foi identificada uma anomalia grave em <strong className="font-mono font-bold">{(diagnostics.contaminationCount ?? 0)}</strong> de <strong className="font-mono font-bold">{diagnostics.totalCtrcs ?? 0}</strong> CTRCs ativos.
                </p>
                <div className="bg-[var(--router-danger)]/5 border border-[var(--router-danger)]/20 p-2.5 rounded text-[10px] space-y-1">
                  <div>🏁 <strong className="opacity-100 font-bold">Provável Causa:</strong> Mapeamento inadequado de colunas durante a importação do CSV/BI operacional.</div>
                  <div>🚨 <strong className="opacity-100 font-bold">Impacto Logístico:</strong> Faturas duplicando o nome da cidade no destinatário, distorcendo a visualização de filiais e rotas de entrega.</div>
                </div>

                {/* List Examples (Up to 20 Examples) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono block">
                    Exemplos Detectados (Exibindo até 20)
                  </span>
                  <div className="max-h-36 overflow-y-auto border border-[var(--router-danger)]/10 rounded bg-[var(--router-danger)]/5 pr-1 scrollbar-thin">
                    <table className="w-full text-left text-[10px] font-mono">
                      <thead className="bg-[var(--router-danger)]/10 sticky top-0 font-bold">
                        <tr>
                          <th className="px-2 py-1">Código CTRC</th>
                          <th className="px-2 py-1">Destinatário</th>
                          <th className="px-2 py-1">Cidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--router-danger)]/10">
                        {diagnostics.contaminationExamples?.map((ex, idx) => (
                          <tr key={idx} className="hover:bg-[var(--router-danger)]/10">
                            <td className="px-2 py-1 font-bold">{ex.id}</td>
                            <td className="px-2 py-1 truncate max-w-[120px] opacity-90">{ex.destinatario}</td>
                            <td className="px-2 py-1 truncate max-w-[100px] opacity-100 font-semibold">{ex.cidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Master Purge Tool */}
              {adminUser?.is_master ? (
                <div className="pt-2 border-t border-[var(--router-danger)]/20 space-y-2">
                  <div className="text-[10px] text-[var(--router-danger)] opacity-90 font-mono leading-relaxed bg-[var(--router-danger)]/10 p-2 rounded">
                    🛡️ <strong className="opacity-100 font-bold">Modo Master Ativo:</strong> Como administrador, você pode excluir os registros corrompidos identificados no IndexedDB local com total sincronização.
                  </div>
                  <button
                    onClick={async () => {
                      const confirmPurge = window.confirm(
                        `Deseja excluir DEFINITIVAMENTE todos os ${diagnostics.contaminationCount} CTRCs contaminados?\n\nEsta ação atualizará o faturamento operacional de forma irreversível.`
                      );
                      if (confirmPurge) {
                        try {
                          const idsToPurge = diagnostics.contaminationExamples?.map(ex => ex.id) || [];
                          if (idsToPurge.length > 0) {
                            await CtrcRepository.deleteMany(idsToPurge);
                            alert(`Expurgo Concluído: ${idsToPurge.length} faturas foram limpas da base.`);
                            if (onRefreshCtrcs) {
                              onRefreshCtrcs();
                            }
                            onClose();
                          } else {
                            alert("Não foi possível mapear os IDs para exclusão.");
                          }
                        } catch (err) {
                          console.error("Erro ao expurgar registros:", err);
                        }
                      }
                    }}
                    className="w-full bg-[var(--router-danger)]/10 hover:bg-[var(--router-danger)] text-[var(--router-danger)] hover:text-white border border-[var(--router-danger)]/30 rounded py-1.5 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <X className="w-3.5 h-3.5" />
                    Excluir importação contaminada ({diagnostics.contaminationCount} CTRCs)
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-[var(--router-warning)] leading-relaxed bg-[var(--router-warning)]/10 border border-[var(--router-warning)]/30 p-2.5 rounded font-mono">
                  🔒 <strong className="font-bold">Ação Restrita:</strong> Solicite a um usuário Master para realizar o expurgo das faturas contaminadas, ou limpe a base no menu de Configurações e importe o CSV novamente com o De-Para de correspondência correto.
                </div>
              )}
            </div>
          )}

          {/* Funnel Pipeline Visualization */}
          <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-4">
            <p className="font-mono text-[11px] font-bold uppercase text-[var(--router-primary)] tracking-wide mb-3">
              Funil do Processo de Filtro (Pipeline)
            </p>
            <div className="space-y-2">
              {steps.map((st, i) => {
                const max = diagnostics.totalIndexedDb ?? 1;
                const pct = max > 0 ? Math.round((st.count / max) * 100) : 0;
                const isZero = st.count === 0;

                return (
                  <div key={i} className="flex items-center text-xs">
                    <span className="w-6 font-mono text-[10px] text-[var(--router-text-muted)]">#{i+1}</span>
                    <span className="w-48 font-mono text-[11px] text-[var(--router-text-soft)] truncate">{st.name}</span>
                    <div className="flex-1 mx-3 bg-[var(--router-bg)] h-2.5 rounded-full overflow-hidden border border-[var(--router-border)]">
                      <div
                        className={`h-full transition-all duration-500 ${isZero ? 'bg-rose-600' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`w-12 text-right font-mono text-[11px] font-bold ${isZero ? 'text-rose-400' : 'text-indigo-300'}`}>
                      {st.count}
                    </span>
                    <span className="w-10 text-right font-mono text-[10px] text-[var(--router-text-muted)]">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botleneck Box */}
          <div className="bg-[var(--router-primary)]/10 border border-[var(--router-primary)]/30 p-3.5 rounded-lg">
            <p className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] tracking-wider">
              Diagnóstico do Gargalo (Maior Retenção de CTRCs)
            </p>
            <p className="font-sans text-xs text-[var(--router-text)] mt-1 font-semibold">
              ⚠️ {worstStepName}
            </p>
          </div>

          {/* Detailed distribution breakdowns counts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit */}
            <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] block mb-2 opacity-90">
                Filtro de Filiais / Unidades
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byUnit).length === 0 ? (
                  <p className="text-[var(--router-text-muted)] italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byUnit).map(([unid, count]) => (
                    <div key={unid} className="flex justify-between border-b border-[var(--router-border)] py-1">
                      <span className="text-[var(--router-text-soft)]">{unid}</span>
                      <span className="text-[var(--router-text)] font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Occurrence Sector */}
            <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] block mb-2 opacity-90">
                Setores de Ocorrência
              </span>
              <div className="space-y-1.5 font-mono text-[11px] max-h-48 overflow-y-auto pr-1">
                {Object.keys(diagnostics.byOccurrenceSector).length === 0 ? (
                  <p className="text-[var(--router-text-muted)] italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byOccurrenceSector).map(([sec, count]) => (
                    <div key={sec} className="flex justify-between border-b border-[var(--router-border)] py-1">
                      <span className="text-[var(--router-text-soft)] max-w-[200px] truncate">{sec}</span>
                      <span className="text-[var(--router-text)] font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Status counts */}
            <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] block mb-2 opacity-90">
                Status Operacional da Carga (Fase)
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byStatus).length === 0 ? (
                  <p className="text-[var(--router-text-muted)] italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byStatus).map(([st, count]) => (
                    <div key={st} className="flex justify-between border-b border-[var(--router-border)] py-1">
                      <span className="text-[var(--router-text-soft)]">{st}</span>
                      <span className="text-[var(--router-text)] font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Eligibility */}
            <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-3.5">
              <span className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] block mb-2 opacity-90">
                Elegibilidade de Roteirização
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {Object.keys(diagnostics.byRoutingEligibility).length === 0 ? (
                  <p className="text-[var(--router-text-muted)] italic">Nenhum dado</p>
                ) : (
                  Object.entries(diagnostics.byRoutingEligibility).map(([elig, count]) => (
                    <div key={elig} className="flex justify-between border-b border-[var(--router-border)] py-1">
                      <span className="text-[var(--router-text-soft)]">{elig}</span>
                      <span className="text-[var(--router-text)] font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Depot Compatibility counts */}
          <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-lg p-3.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[var(--router-primary)] block mb-2 opacity-90">
              Compatibilidade de Box / Depósito
            </span>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[var(--router-bg)] border border-[var(--router-border)] p-2.5 rounded text-center">
                <span className="text-[var(--router-success)] font-bold block text-lg font-mono">
                  {diagnostics.byLogisticCompatibility.compatible ?? 0}
                </span>
                <span className="text-[var(--router-text-muted)] text-[10px] uppercase font-mono">Compatíveis</span>
              </div>
              <div className="bg-[var(--router-bg)] border border-[var(--router-border)] p-2.5 rounded text-center">
                <span className="text-[var(--router-danger)] font-bold block text-lg font-mono">
                  {diagnostics.byLogisticCompatibility.incompatible ?? 0}
                </span>
                <span className="text-[var(--router-text-muted)] text-[10px] uppercase font-mono">Em trânsito p/ outro Box</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer controls */}
        <div className="px-5 py-4 border-t border-[var(--router-border)] bg-[var(--router-surface)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] text-[var(--router-text)] font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded flex items-center gap-1.5 select-none transition-all active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--router-success)]" />
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
              className="bg-[var(--router-primary)] hover:opacity-90 text-white font-mono font-bold text-xs uppercase tracking-wider px-4 py-2 rounded flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar Filtros da Mesa
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold text-[var(--router-text-muted)] hover:text-[var(--router-text)] hover:bg-[var(--router-surface-2)] rounded transition-all cursor-pointer"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
  );
}
