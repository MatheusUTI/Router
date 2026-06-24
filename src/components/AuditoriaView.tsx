import React, { useState } from 'react';
import { AuditLog, AppUser } from '../types';

interface AuditoriaViewProps {
  adminUser: AppUser | null;
  logs: AuditLog[];
  onRefreshLogs?: () => Promise<void>;
  isSyncing?: boolean;
}

export default function AuditoriaView({
  adminUser,
  logs = [],
  onRefreshLogs,
  isSyncing = false,
}: AuditoriaViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Verify Master check as per RF05
  const isMaster = adminUser?.is_master === true;

  if (!isMaster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center" id="audit-denied-container">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] select-none">block</span>
        </div>
        <h3 className="text-lg font-bold text-[var(--router-text)] mb-2">Acesso Negado</h3>
        <p className="text-sm text-[var(--router-text-muted)] max-w-md">
          A visualização das trilhas de auditoria administrativa é restrita exclusivamente a usuários com perfil Master / Administrador.
        </p>
      </div>
    );
  }

  // Handle filtering
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActionBadgeColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UPDATE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getActionLabel = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'Criação';
      case 'UPDATE':
        return 'Edição';
      case 'DELETE':
        return 'Exclusão';
      default:
        return action;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'VEHICLE_REGISTRY':
        return 'local_shipping';
      case 'VEHICLE_GR_RULE':
        return 'security';
      default:
        return 'description';
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'VEHICLE_REGISTRY':
        return 'Cadastro de Veículo';
      case 'VEHICLE_GR_RULE':
        return 'Regra de GR';
      default:
        return entityType;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full font-sans text-[var(--router-text)]" id="audit-logs-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--router-border)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--router-text-muted)] text-xs font-mono mb-1">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>ADMINISTRAÇÃO • CONTROL TOWER</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--router-text)] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">history</span>
            Auditoria & Logs Operacionais
          </h1>
          <p className="text-xs text-[var(--router-text-muted)] mt-1">
            Rastreabilidade de alterações críticas em regras de GR, veículos e exclusões administrativas.
          </p>
        </div>

        {onRefreshLogs && (
          <button
            onClick={onRefreshLogs}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface-3)] active:scale-[0.98] transition-all px-4 py-2 rounded-lg text-xs font-semibold border border-[var(--router-border)] disabled:opacity-50"
            id="audit-refresh-btn"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            Atualizar Logs
          </button>
        )}
      </div>

      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl p-4 shadow-sm" id="audit-filters-bar">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[16px] text-[var(--router-text-muted)]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário, placa, regra ou descrição..."
            className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary placeholder-[var(--router-text-muted)]"
            id="audit-search-input"
          />
        </div>

        {/* Action filter */}
        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
            id="audit-action-filter"
          >
            <option value="ALL">Todas as Ações</option>
            <option value="CREATE">Criações</option>
            <option value="UPDATE">Edições</option>
            <option value="DELETE">Exclusões</option>
          </select>
        </div>

        {/* Entity filter */}
        <div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary"
            id="audit-entity-filter"
          >
            <option value="ALL">Todas as Entidades</option>
            <option value="VEHICLE_REGISTRY">Cadastro de Veículo</option>
            <option value="VEHICLE_GR_RULE">Regra de GR</option>
          </select>
        </div>
      </div>

      {/* Logs count */}
      <div className="flex items-center justify-between text-xs text-[var(--router-text-muted)] px-1">
        <span>Mostrando {filteredLogs.length} de {logs.length} registros</span>
        {filteredLogs.length > 0 && (
          <span className="font-mono text-[10px] bg-[var(--router-surface-2)] px-2 py-0.5 rounded border border-[var(--router-border)] text-emerald-400">
            Trilha Ativa
          </span>
        )}
      </div>

      {/* Logs Table / List */}
      <div className="bg-[var(--router-surface)] border border-[var(--router-border)] rounded-xl overflow-hidden shadow-sm" id="audit-table-card">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center" id="audit-empty-state">
            <span className="material-symbols-outlined text-[48px] text-[var(--router-text-muted)] opacity-50 mb-3 select-none">
              find_in_page
            </span>
            <p className="text-sm font-semibold text-[var(--router-text-muted)]">Nenhum log encontrado</p>
            <p className="text-xs text-[var(--router-text-muted)] mt-1 max-w-md">
              Tente redefinir seus filtros de busca ou verifique se foram registradas alterações administrativas elegíveis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--router-surface-2)] border-b border-[var(--router-border)] text-[var(--router-text-muted)] font-semibold text-[10px] uppercase tracking-wider">
                  <th className="px-5 py-3 w-[15%]">Data / Hora</th>
                  <th className="px-5 py-3 w-[15%]">Usuário / Perfil</th>
                  <th className="px-5 py-3 w-[10%]">Ação</th>
                  <th className="px-5 py-3 w-[15%]">Entidade</th>
                  <th className="px-5 py-3 w-[45%]">Descrição da Alteração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--router-border)]">
                {sortedLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR');
                  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--router-surface-2)] transition-colors text-xs text-[var(--router-text)] group"
                      id={`log-row-${log.id}`}
                    >
                      {/* Date / Time */}
                      <td className="px-5 py-3 font-mono text-[11px] text-[var(--router-text)] whitespace-nowrap">
                        <div className="font-semibold">{formattedDate}</div>
                        <div className="text-[var(--router-text-muted)] text-[10px] mt-0.5">{formattedTime}</div>
                      </td>

                      {/* User / Profile */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-semibold">{log.user}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold tracking-wider ${
                            log.profile === 'MASTER' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {log.profile}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${getActionBadgeColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-[var(--router-text-muted)]">
                          <span className="material-symbols-outlined text-[15px] select-none text-primary">
                            {getEntityIcon(log.entityType)}
                          </span>
                          <span>{getEntityLabel(log.entityType)}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-[var(--router-surface-2)] px-1.5 py-0.5 rounded text-[var(--router-text-muted)] mt-1 inline-block">
                          ID: {log.entityId}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3 text-[var(--router-text)] leading-relaxed font-sans max-w-sm">
                        <div className="text-[var(--router-text)]">{log.description}</div>
                        {(log.oldValue !== undefined || log.newValue !== undefined) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] bg-[var(--router-surface-2)] p-1.5 rounded border border-[var(--router-border)]">
                            {log.oldValue !== undefined && (
                              <div className="text-red-400/80 truncate max-w-[180px]">
                                <span className="text-[var(--router-text-muted)] mr-1">Antes:</span>
                                {log.oldValue || 'Vazio'}
                              </div>
                            )}
                            {log.oldValue !== undefined && log.newValue !== undefined && (
                              <span className="material-symbols-outlined text-[10px] text-[var(--router-text-muted)] select-none">
                                arrow_forward
                              </span>
                            )}
                            {log.newValue !== undefined && (
                              <div className="text-emerald-400 truncate max-w-[180px]">
                                <span className="text-[var(--router-text-muted)] mr-1">Depois:</span>
                                {log.newValue || 'Vazio'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
