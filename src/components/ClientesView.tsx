import { useState, FormEvent } from 'react';
import { CriticClient } from '../types';

interface ClientesViewProps {
  clients: CriticClient[];
  onAddAuditNote: (clientId: string, note: string, author: string) => void;
  searchValue: string;
  isMaster?: boolean;
}

export default function ClientesView({ clients, onAddAuditNote, searchValue, isMaster = false }: ClientesViewProps) {
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

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(clients, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bd_clientes_criticos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['id', 'prefix', 'name', 'address', 'avgQueueTime', 'score', 'rejections30d', 'auditUser', 'auditTime', 'auditDetail'];
    const csvRows = [headers.join(';')];
    for (const item of clients) {
      const values = [
        item.id || '',
        item.prefix || '',
        item.name || '',
        item.address || '',
        item.avgQueueTime || '',
        String(item.score || 0),
        String(item.rejections30d || 0),
        item.auditUser || '',
        item.auditTime || '',
        item.auditDetail || ''
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
    link.download = `bd_clientes_criticos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[var(--router-text)] tracking-tight">Clientes Críticos</h2>
          <p className="text-sm text-[#9cb4e4] mt-1">
            Dossiê avançado de recebedores com gargalos operacionais crônicos, restrições físicas de frota ou devoluções sistêmicas.
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Clients List card */}
        <div className="lg:col-span-6 router-card rounded-xl border border-[var(--router-border)] p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-[var(--router-text)] flex items-center gap-2 mb-1">
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
                      ? 'router-card-highest border-error/50 shadow-[inset_3px_0_0_#ffdad6]'
                      : 'bg-[var(--router-surface-2)] border-[var(--router-border)]/60 hover:border-[var(--router-border)]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${badgeColors}`}>
                    {client.prefix}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-[var(--router-text)] text-sm truncate">{client.name}</p>
                      <span className="text-xs font-mono font-bold text-error shrink-0">
                        {client.rejections30d} recusas/30d
                      </span>
                    </div>
                    <p className="text-xs text-[var(--router-text-muted)] truncate mt-1">{client.address}</p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-[var(--router-text-muted)]">
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
              <div className="text-center py-10 text-[var(--router-text-muted)]">
                Nenhum cliente crítico encontrado respondente.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Selected Client dossier and Auditing log */}
        <div className="lg:col-span-6 router-card rounded-xl border border-[var(--router-border)] p-5 flex flex-col justify-between">
          {selectedClient?.id ? (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-[var(--router-text)] leading-tight">
                    {selectedClient.name}
                  </h3>
                  <p className="text-xs font-mono text-[var(--router-text-muted)] mt-1">
                    Código Interno CRM: {selectedClient.id}
                  </p>
                </div>
                <span className="bg-error-container/10 border border-error/20 text-error px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                  Bloqueio Crítico OP-03
                </span>
              </div>

              {/* Recurrent Issues Cards */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-[var(--router-text)] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
                  Histórico de Recorrências Gravadas
                </p>
                <div className="flex flex-col gap-2.5">
                  {selectedClient.recurrentIssues.map((issue, i) => (
                    <div key={i} className="bg-[var(--router-surface-2)] p-3 rounded-lg border border-[var(--router-border)]/60 flex gap-3">
                      <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">
                        {issue.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--router-text)]">{issue.title}</p>
                        <p className="text-[11px] text-[var(--router-text-muted)] mt-1 leading-normal">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  {selectedClient.recurrentIssues.length === 0 && (
                    <p className="text-[11px] text-[var(--router-text-muted)] italic">Sem intercorrências graves relatadas.</p>
                  )}
                </div>
              </div>

              {/* Last Audit Action card */}
              <div className="router-card-high border border-[var(--router-border)]/80 rounded-xl p-4">
                <p className="text-xs font-bold text-secondary flex items-center gap-1.5 mb-3.5">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Último Alerta de Auditoria Integrada
                </p>

                <div className="flex gap-3">
                  <img
                    src={selectedClient.auditAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full border border-[var(--router-border)] shrink-0 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-[var(--router-text)]">{selectedClient.auditUser}</h4>
                      <span className="text-[10px] font-mono text-[var(--router-text-muted)]">{selectedClient.auditTime}</span>
                    </div>
                    <p className="text-xs text-[var(--router-text)] font-semibold mt-1">
                      {selectedClient.auditDetail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post Audit note input form under audit trial */}
              {isMaster ? (
                <form onSubmit={handleAddNote} className="space-y-3">
                  <label className="text-xs font-bold text-[var(--router-text)] block">
                    Registrar Nova Nota de Governança
                  </label>
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Adicione orientações de entrega ou acordos comerciais..."
                      className="flex-1 bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary placeholder-on-surface-variant/70"
                    />
                    <button
                      type="submit"
                      className="bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold px-4 py-2 rounded-lg transition-transform active:scale-[0.98]"
                    >
                      Gravar Nota
                    </button>
                  </div>
                </form>
              ) : (
                <div className="px-3.5 py-1.5 bg-[#14203a] border border-[#1a2d54] text-xs text-gray-450 rounded-lg select-none text-center">
                  🔒 Notas de governança legadas estritamente a usuários Master.
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-16 text-center text-[var(--router-text-muted)]">
              <span className="material-symbols-outlined text-[42px] mb-3 text-[var(--router-text-muted)]/40">
                gpp_bad
              </span>
              <p className="text-xs font-semibold">Nenhum cliente selecionado</p>
              <p className="text-[10px] mt-1 text-[var(--router-text-muted)]/70">
                Selecione um cliente crítico na lista para ver o dossiê completo de auditoria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
