import { useState } from 'react';
import { Ticket } from '../types';

interface SolucaoViewProps {
  tickets: Ticket[];
  onResolveTicket: (id: string, resolution: 'Re-agendado' | 'Devolvido' | 'Troca Motorista') => void;
  searchValue: string;
}

export default function SolucaoView({ tickets, onResolveTicket, searchValue }: SolucaoViewProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(tickets[0]?.id || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleResolve = (resolution: 'Re-agendado' | 'Devolvido' | 'Troca Motorista') => {
    if (!selectedTicketId) return;

    onResolveTicket(selectedTicketId, resolution);
    setSuccessMsg(`Ticket ${selectedTicketId} resolvido com ação registrada: ${resolution.toUpperCase()}.`);

    // Reset selection to another pending ticket if any
    const remainingPending = tickets.filter((t) => t.id !== selectedTicketId && t.status === 'Pendente');
    if (remainingPending.length > 0) {
      setSelectedTicketId(remainingPending[0].id);
    } else {
      setSelectedTicketId(null);
    }
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(searchValue.toLowerCase()) ||
      t.title.toLowerCase().includes(searchValue.toLowerCase()) ||
      t.destinatario.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Fila de Solução de Problemas</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Apoio ao motorista em tempo real durante intercorrências extremas em portarias e janelas de descarregamento de alto risco.
        </p>
      </div>

      {successMsg && (
        <div className="bg-tertiary-container/10 border border-tertiary/20 text-tertiary p-4 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">verified</span>
          <div>
            <p className="text-xs font-semibold">Resolução Concluída</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Troubleshooting ticket queue (spans 7) */}
        <div className="lg:col-span-7 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-error text-[18px]">support_agent</span>
            Chamados de Suporte Rota Ativos
          </h3>

          <div className="space-y-3">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicketId === t.id;
              const hasResolved = t.status !== 'Pendente';

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTicketId(t.id);
                    setSuccessMsg(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-surface-container-highest border-primary shadow-[inset_3px_0_0_#adc6ff]'
                      : 'bg-surface border-outline-variant/60 hover:border-outline'
                  } ${hasResolved ? 'opacity-50' : ''}`}
                >
                  <div className="flex gap-3 min-w-0">
                    <span className="material-symbols-outlined text-error text-[20px] mt-0.5 shrink-0">
                      {t.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono text-primary">{t.id}</span>
                        {t.priority && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-error-container/10 text-error rounded border border-error/10">
                            {t.priority}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-on-surface text-sm mt-1 truncate">{t.title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Vínculo: {t.destinatario}</p>
                      <p className="text-[11px] text-on-surface-variant truncate font-mono mt-1 pr-2">{t.address}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 text-right font-mono">
                    <span className="text-[10px] text-on-surface-variant">
                      Idade: <span className="text-on-surface font-semibold">{t.ageMinutes} min</span>
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t.status === 'Pendente'
                          ? 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/20 shadow-sm'
                          : t.status === 'Re-agendado'
                          ? 'bg-primary/20 text-primary-fixed-dim border-primary/10'
                          : t.status === 'Devolvido'
                          ? 'bg-error-container/10 text-error border-error-container/20'
                          : 'bg-secondary-container/10 text-secondary border-[#b8c4ff]/20'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredTickets.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant">
                Nenhum chamado de suporte na fila.
              </div>
            )}
          </div>
        </div>

        {/* Right: Trouble Resolution Action desk (spans 5) */}
        <div className="lg:col-span-5 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          {selectedTicket ? (
            <div className="space-y-6">
              <div className="space-y-1.5 border-b border-outline-variant/40 pb-3">
                <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                  Tratamento de Ocorrência Técnica
                </p>
                <h3 className="text-lg font-bold text-on-surface leading-tight">
                  {selectedTicket.id} - {selectedTicket.title}
                </h3>
              </div>

              {/* Courier info description */}
              <div className="bg-surface-container-high border border-outline-variant/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Instruções de Logística
                </p>
                <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
                  <p>
                    <strong className="text-on-surface">Motorista de Rota:</strong> {selectedTicket.destinatario}
                  </p>
                  <p>
                    <strong className="text-on-surface">Endereço Fornecido:</strong> {selectedTicket.address}
                  </p>
                  <p>
                    O motorista está parado na via pública aguardando orientação operacional. Selecione uma ação abaixo para direcionar ou comandar o retorno sistêmico da carga.
                  </p>
                </div>
              </div>

              {selectedTicket.status === 'Pendente' ? (
                /* Interactive actions buttons block */
                <div className="space-y-3">
                  <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[16px]">how_to_reg</span>
                    Tomar Ação e Resolver Chamado
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleResolve('Re-agendado')}
                      className="w-full py-2.5 bg-surface text-on-surface border border-outline-variant hover:bg-surface-bright text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                      Re-agendar para Próximo Manifesto
                    </button>

                    <button
                      onClick={() => handleResolve('Devolvido')}
                      className="w-full py-2.5 bg-surface text-on-surface border border-outline-variant hover:bg-surface-bright text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-error text-[18px]">assignment_return</span>
                      Devolver Integralmente à Origem (Recusa)
                    </button>

                    <button
                      onClick={() => handleResolve('Troca Motorista')}
                      className="w-full py-2.5 bg-surface text-on-surface border border-outline-variant hover:bg-surface-bright text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-secondary text-[18px]">swap_horiz</span>
                      Redirecionar Carga (Trocar Motoristas)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 text-center py-6">
                  <span className="material-symbols-outlined text-tertiary text-[28px] mb-1.5">done_all</span>
                  <p className="text-xs font-bold text-on-surface">Chamado Resolvido</p>
                  <p className="text-[11px] text-on-surface-variant/80 mt-1">
                    Ação programada: {selectedTicket.status} - arquivado com sucesso.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[42px] mb-3 text-on-surface-variant/40">
                check_box
              </span>
              <p className="text-xs font-semibold">Tudo resolvido na fila!</p>
              <p className="text-[10px] mt-1 text-on-surface-variant/70">
                Nenhum chamado de suporte ativo necessita de interação neste momento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
