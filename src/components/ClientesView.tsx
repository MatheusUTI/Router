import { useState, FormEvent } from 'react';
import { CriticClient } from '../types';

interface ClientesViewProps {
  clients: CriticClient[];
  onAddAuditNote: (clientId: string, note: string, author: string) => void;
  searchValue: string;
}

export default function ClientesView({ clients, onAddAuditNote, searchValue }: ClientesViewProps) {
  const [selectedClient, setSelectedClient] = useState<CriticClient>(clients[0] || {} as CriticClient);
  const [noteText, setNoteText] = useState('');

  const handleAddNote = (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    onAddAuditNote(selectedClient.id, noteText, 'Anderson M.');
    
    // Update local selection so it displays immediately
    setSelectedClient(prev => ({
      ...prev,
      auditUser: 'Anderson M.',
      auditTime: 'Agora mesmo',
      auditDetail: noteText,
    }));

    setNoteText('');
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.address.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Clientes Críticos</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Dossiê avançado de recebedores com gargalos operacionais crônicos, restrições físicas de frota ou devoluções sistêmicas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Clients List card */}
        <div className="lg:col-span-6 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-error text-[18px]">warning</span>
            Alertas de Fornecimento Crítico
          </h3>

          <div className="space-y-3">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              
              // Resolve Prefix Badge Colors
              const badgeColors =
                client.prefix === 'CD'
                  ? 'bg-primary-container text-on-primary-container'
                  : client.prefix === 'SM'
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-[#93000a]/10 text-[#ffb4ab] border border-[#ffb4ab]/20';

              return (
                <div
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    setNoteText('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-surface-container-highest border-error/50 shadow-[inset_3px_0_0_#ffdad6]'
                      : 'bg-surface border-outline-variant/60 hover:border-outline'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${badgeColors}`}>
                    {client.prefix}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-on-surface text-sm truncate">{client.name}</p>
                      <span className="text-xs font-mono font-bold text-error shrink-0">
                        {client.rejections30d} recusas/30d
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate mt-1">{client.address}</p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        Espera: {client.avgQueueTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">grade</span>
                        Nível Risco: {100 - client.score}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredClients.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant">
                Nenhum cliente crítico encontrado respondente.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Selected Client dossier and Auditing log */}
        <div className="lg:col-span-6 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          {selectedClient?.id ? (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-on-surface leading-tight">
                    {selectedClient.name}
                  </h3>
                  <p className="text-xs font-mono text-on-surface-variant mt-1">
                    Código Interno CRM: {selectedClient.id}
                  </p>
                </div>
                <span className="bg-error-container/10 border border-error/20 text-error px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                  Bloqueio Crítico OP-03
                </span>
              </div>

              {/* Recurrent Issues Cards */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
                  Histórico de Recorrências Gravadas
                </p>
                <div className="flex flex-col gap-2.5">
                  {selectedClient.recurrentIssues.map((issue, i) => (
                    <div key={i} className="bg-surface p-3 rounded-lg border border-outline-variant/60 flex gap-3">
                      <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">
                        {issue.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-on-surface">{issue.title}</p>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-normal">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedClient.recurrentIssues.length === 0 && (
                    <p className="text-[11px] text-on-surface-variant italic">Sem intercorrências graves relatadas.</p>
                  )}
                </div>
              </div>

              {/* Last Audit Action card */}
              <div className="bg-surface-container-high border border-outline-variant/80 rounded-xl p-4">
                <p className="text-xs font-bold text-secondary flex items-center gap-1.5 mb-3.5">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Último Alerta de Auditoria Integrada
                </p>

                <div className="flex gap-3">
                  <img
                    src={selectedClient.auditAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full border border-outline-variant shrink-0 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-on-surface">{selectedClient.auditUser}</h4>
                      <span className="text-[10px] font-mono text-on-surface-variant">{selectedClient.auditTime}</span>
                    </div>
                    <p className="text-xs text-on-surface font-semibold mt-1">
                      {selectedClient.auditDetail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post Audit note input form under audit trial */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <label className="text-xs font-bold text-on-surface block">
                  Registrar Nova Nota de Governança
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Adicione orientações de entrega ou acordos comerciais..."
                    className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary placeholder-on-surface-variant/70"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold px-4 py-2 rounded-lg transition-transform active:scale-[0.98]"
                  >
                    Gravar Nota
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[42px] mb-3 text-on-surface-variant/40">
                gpp_bad
              </span>
              <p className="text-xs font-semibold">Nenhum cliente selecionado</p>
              <p className="text-[10px] mt-1 text-on-surface-variant/70">
                Selecione um cliente crítico na lista para ver o dossiê completo de auditoria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
