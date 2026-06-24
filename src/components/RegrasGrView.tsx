import React, { useState, useEffect } from 'react';
import { VehicleGrRule, AppUser } from '../types';
import { canEditGrRules } from '../utils/permissionUtils';

interface RegrasGrViewProps {
  adminUser: AppUser | null;
  rules: VehicleGrRule[];
  onUpdateRule: (rule: VehicleGrRule) => void;
  isSyncing?: boolean;
}

export default function RegrasGrView({
  adminUser,
  rules = [],
  onUpdateRule,
  isSyncing = false,
}: RegrasGrViewProps) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states
  const [maxValue, setMaxValue] = useState<number>(300000);
  const [requiresTracking, setRequiresTracking] = useState<boolean>(true);
  const [requiresAuth, setRequiresAuth] = useState<boolean>(true);
  const [blocksRouting, setBlocksRouting] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const hasPermission = canEditGrRules(adminUser);

  const startEditing = (rule: VehicleGrRule) => {
    if (!hasPermission) {
      setErrorMessage('Apenas usuários Master podem alterar regras protegidas de GR.');
      return;
    }
    setEditingRuleId(rule.id);
    setMaxValue(rule.maxValueWithoutGr);
    setRequiresTracking(rule.requiresTrackingAboveValue);
    setRequiresAuth(rule.requiresAuthorizationAboveLimit);
    setBlocksRouting(rule.blocksRoutingAboveLimit);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSave = (e: React.FormEvent, ruleId: string) => {
    e.preventDefault();
    
    // Logical blocking check (RF03 / RF05)
    if (!hasPermission) {
      setErrorMessage('Operação rejeitada: Permissão insuficiente para alterar regras de GR.');
      return;
    }

    const original = rules.find(r => r.id === ruleId);
    if (!original) return;

    const updatedRule: VehicleGrRule = {
      ...original,
      maxValueWithoutGr: Number(maxValue),
      requiresTrackingAboveValue: requiresTracking,
      requiresAuthorizationAboveLimit: requiresAuth,
      blocksRoutingAboveLimit: blocksRouting,
    };

    onUpdateRule(updatedRule);
    setEditingRuleId(null);
    setSuccessMessage(`Regra para ${getFriendlyTypeName(ruleId)} atualizada com sucesso!`);
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const getFriendlyTypeName = (id: string) => {
    switch (id.toUpperCase()) {
      case 'PROPRIO':
        return 'Frota Própria (Estável)';
      case 'AGREGADO':
        return 'Agregados';
      case 'APOIO':
        return 'Apoio Operacional';
      case 'TERCEIRO':
        return 'Terceiros / Spot';
      default:
        return id;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--router-border)]/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">security</span>
            Regras de Gerenciamento de Risco (GR)
          </h2>
          <p className="text-xs text-[var(--router-text-soft)]">
            Definição de parâmetros corporativos, exigências de rastreamento e limites de autorização por classificação de veículo.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasPermission ? (
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Sessão Master Ativa (Acesso Total)
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Modo Operador (Somente Leitura)
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;
          const friendlyName = getFriendlyTypeName(rule.id);
          
          return (
            <div 
              key={rule.id}
              className={`router-card rounded-2xl border transition-all duration-300 p-5 space-y-4 ${
                isEditing 
                  ? 'border-primary shadow-[0_0_15px_rgba(77,142,255,0.15)] bg-surface-container-highest' 
                  : 'border-[var(--router-border)]/80 hover:border-primary/40'
              }`}
            >
              <div className="flex justify-between items-start border-b border-[var(--router-border)]/40 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[var(--router-text)] flex items-center gap-2 uppercase font-mono">
                    <span className="material-symbols-outlined text-primary text-[18px]">local_shipping</span>
                    {friendlyName}
                  </h3>
                  <p className="text-[10px] font-mono text-[var(--router-text-muted)] mt-0.5">
                    Classificação: <span className="text-primary font-bold">{rule.vehicleType}</span>
                  </p>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEditing(rule)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      hasPermission
                        ? 'bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20'
                        : 'bg-surface-container text-[var(--router-text-muted)] border border-outline-variant/30 opacity-70 cursor-not-allowed'
                    }`}
                    title={hasPermission ? 'Editar Regras' : 'Bloqueado para Operadores'}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {hasPermission ? 'edit' : 'lock'}
                    </span>
                    {hasPermission ? 'Alterar Regra' : 'Protegido'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={(e) => handleSave(e, rule.id)} className="space-y-4">
                  <div className="space-y-3.5">
                    <div className="text-left">
                      <label className="text-xs font-semibold text-[var(--router-text)] block mb-1">
                        Valor Máximo Permitido sem GR (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={maxValue}
                        onChange={(e) => setMaxValue(parseInt(e.target.value) || 0)}
                        className="w-full bg-[var(--router-surface-2)] border border-[var(--router-border)] rounded-lg px-3 py-2 text-xs text-[var(--router-text)] focus:outline-none focus:border-primary font-mono"
                        required
                      />
                      <p className="text-[10px] text-[var(--router-text-muted)] mt-1">
                        Sugerido para veículos com rastreador ativo. Se não rastreado, o limite operacional sugerido poderá ser rebaixado para R$ 300.000.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-[var(--router-border)]/40 pt-3">
                      <label className="text-xs font-bold text-[var(--router-text)] block mb-2">
                        Exigências & Bloqueios de Roteirização
                      </label>

                      <label className="flex items-center gap-3 p-2 bg-[var(--router-surface-2)] border border-[var(--router-border)]/40 rounded-lg hover:bg-[var(--router-surface-3)] transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requiresTracking}
                          onChange={(e) => setRequiresTracking(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-0 focus:ring-offset-0 bg-transparent border-[var(--router-border)]"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[var(--router-text)]">
                            Exigir Rastreamento Ativo
                          </p>
                          <p className="text-[10px] text-[var(--router-text-muted)]">
                            Sinaliza alerta caso o veículo carregue mais de R$ 300k sem rastreamento.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2 bg-[var(--router-surface-2)] border border-[var(--router-border)]/40 rounded-lg hover:bg-[var(--router-surface-3)] transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={requiresAuth}
                          onChange={(e) => setRequiresAuth(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-0 focus:ring-offset-0 bg-transparent border-[var(--router-border)]"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[var(--router-text)]">
                            Exigir Autorização do Gerente
                          </p>
                          <p className="text-[10px] text-[var(--router-text-muted)]">
                            Exige autorização explícita para o pré-romaneio caso o limite de valor seja ultrapassado.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-2 bg-[var(--router-surface-2)] border border-[var(--router-border)]/40 rounded-lg hover:bg-[var(--router-surface-3)] transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={blocksRouting}
                          onChange={(e) => setBlocksRouting(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-0 focus:ring-offset-0 bg-transparent border-[var(--router-border)]"
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-[var(--router-text)]">
                            Bloquear Fechamento Operacional
                          </p>
                          <p className="text-[10px] text-[var(--router-text-muted)]">
                            Impede a finalização/emissão de romaneios que infrinjam os parâmetros de GR definidos.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--router-border)]/40">
                    <button
                      type="button"
                      onClick={() => setEditingRuleId(null)}
                      className="px-3.5 py-1.5 bg-[var(--router-surface-2)] hover:bg-[var(--router-surface)] border border-[var(--router-border)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                    >
                      Salvar Regra Protegida
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-[var(--router-surface-2)] p-3 rounded-xl border border-[var(--router-border)]/30">
                    <span className="text-xs text-[var(--router-text-soft)]">Valor Máximo sem GR</span>
                    <span className="text-sm font-bold text-primary font-mono">
                      {rule.maxValueWithoutGr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-[#121a2c]/60 p-2.5 rounded-lg border border-[var(--router-border)]/20 text-center">
                      <span className="material-symbols-outlined text-cyan-400 text-[18px] block mb-1">
                        {rule.requiresTrackingAboveValue ? 'playlist_add_check' : 'close'}
                      </span>
                      <p className="text-[10px] text-[var(--router-text-muted)] font-semibold leading-none">Rastreio Exigido</p>
                      <p className="text-[11px] font-bold text-[var(--router-text)] mt-1">
                        {rule.requiresTrackingAboveValue ? 'SIM (> 300k)' : 'NÃO'}
                      </p>
                    </div>

                    <div className="bg-[#121a2c]/60 p-2.5 rounded-lg border border-[var(--router-border)]/20 text-center">
                      <span className="material-symbols-outlined text-amber-400 text-[18px] block mb-1">
                        {rule.requiresAuthorizationAboveLimit ? 'verified' : 'close'}
                      </span>
                      <p className="text-[10px] text-[var(--router-text-muted)] font-semibold leading-none">Exige Autoriz.</p>
                      <p className="text-[11px] font-bold text-[var(--router-text)] mt-1">
                        {rule.requiresAuthorizationAboveLimit ? 'SIM (> limite)' : 'NÃO'}
                      </p>
                    </div>

                    <div className="bg-[#121a2c]/60 p-2.5 rounded-lg border border-[var(--router-border)]/20 text-center">
                      <span className="material-symbols-outlined text-rose-400 text-[18px] block mb-1">
                        {rule.blocksRoutingAboveLimit ? 'block' : 'check_circle'}
                      </span>
                      <p className="text-[10px] text-[var(--router-text-muted)] font-semibold leading-none">Bloqueio Ativo</p>
                      <p className="text-[11px] font-bold text-[var(--router-text)] mt-1">
                        {rule.blocksRoutingAboveLimit ? 'BLOQUEIA' : 'NÃO'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
