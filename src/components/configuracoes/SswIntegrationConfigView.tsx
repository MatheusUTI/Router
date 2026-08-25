import React, { useState, useEffect, useCallback } from 'react';
import { SswConfigService, SswConnectionTestResult, SswValidationResponse } from '../../services/sswConfigService';
import { SswFullConfigDTO, SswConnectionConfig, Ssw455Config, DEFAULT_SSW_455_CONFIG } from '../../integrations/ssw/types/config';
import { SswHealthSummaryDTO } from '../../integrations/ssw/contracts/dtos';

export default function SswIntegrationConfigView() {
  const [loading, setLoading] = useState(true);
  const [savingConn, setSavingConn] = useState(false);
  const [saving455, setSaving455] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [validating455, setValidating455] = useState(false);

  // Form State - Connection
  const [empresa, setEmpresa] = useState('');
  const [useri, setUseri] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [unidade, setUnidade] = useState('VGA');
  const [baseUrl, setBaseUrl] = useState('https://sistema.ssw.inf.br');

  // Form State - Capability 455
  const [config455, setConfig455] = useState<Ssw455Config>({ ...DEFAULT_SSW_455_CONFIG });

  // Telemetry & Diagnostics
  const [healthData, setHealthData] = useState<SswHealthSummaryDTO | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  // Notifications & Modals
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<SswConnectionTestResult | null>(null);
  const [validationResult, setValidationResult] = useState<SswValidationResponse | null>(null);

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [fullConfig, healthSummary] = await Promise.all([
        SswConfigService.getConfig(),
        SswConfigService.getHealthSummary().catch(() => null)
      ]);

      if (fullConfig) {
        const conn = fullConfig.connection;
        setEmpresa(conn.empresa || '');
        setUseri(conn.useri || '');
        setUsuario(conn.usuario || '');
        setUnidade(conn.unidade || 'VGA');
        setBaseUrl(conn.baseUrl || 'https://sistema.ssw.inf.br');
        setHasPassword(Boolean(conn.hasPassword));
        setSenha(''); // Clear input

        if (fullConfig.capabilities && fullConfig.capabilities['455']) {
          setConfig455(fullConfig.capabilities['455']);
        }
      }

      if (healthSummary) {
        setHealthData(healthSummary.health);
        setSessionData(healthSummary.session);
      }
    } catch (err: any) {
      notify('error', `Erro ao carregar dados do SSW: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Save Connection
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConn(true);
      const updated = await SswConfigService.saveConfig({
        connection: {
          empresa,
          useri,
          usuario,
          senha: senha.trim() ? senha.trim() : undefined,
          unidade,
          baseUrl
        }
      });

      if (updated.connection.hasPassword) {
        setHasPassword(true);
      }
      setSenha('');
      notify('success', 'Credenciais e conexão com o SSW atualizadas com sucesso no backend!');
      // Reload diagnostics
      const healthSummary = await SswConfigService.getHealthSummary().catch(() => null);
      if (healthSummary) {
        setHealthData(healthSummary.health);
        setSessionData(healthSummary.session);
      }
    } catch (err: any) {
      notify('error', `Falha ao salvar conexão: ${err.message}`);
    } finally {
      setSavingConn(false);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConn(true);
      setTestResult(null);
      const res = await SswConfigService.testConnection();
      setTestResult(res);
      if (res.success) {
        notify('success', 'Conexão SSW testada e autenticada com sucesso!');
      } else {
        notify('error', `Teste falhou: ${res.message}`);
      }
      // Refresh session data
      const healthSummary = await SswConfigService.getHealthSummary().catch(() => null);
      if (healthSummary) {
        setHealthData(healthSummary.health);
        setSessionData(healthSummary.session);
      }
    } catch (err: any) {
      notify('error', `Erro ao testar conexão: ${err.message}`);
      setTestResult({
        success: false,
        message: err.message || 'Erro inesperado no teste'
      });
    } finally {
      setTestingConn(false);
    }
  };

  // Handle Save 455 Config
  const handleSave455Config = async () => {
    try {
      setSaving455(true);
      await SswConfigService.saveConfig({
        capabilities: {
          '455': config455
        }
      });
      notify('success', 'Parâmetros da Capability 455 salvos com sucesso!');
    } catch (err: any) {
      notify('error', `Falha ao salvar parâmetros do 455: ${err.message}`);
    } finally {
      setSaving455(false);
    }
  };

  // Handle Restore 455 Defaults
  const handleRestore455Defaults = async () => {
    if (!window.confirm('Deseja restaurar todos os parâmetros do Relatório 455 para o padrão oficial do SSWTools?')) {
      return;
    }
    try {
      setSaving455(true);
      const res = await SswConfigService.restore455Defaults();
      setConfig455(res.config455);
      notify('success', 'Parâmetros padrão do SSWTools restaurados com sucesso para a Capability 455!');
    } catch (err: any) {
      notify('error', `Erro ao restaurar defaults: ${err.message}`);
    } finally {
      setSaving455(false);
    }
  };

  // Handle Validate 455 Config
  const handleValidate455Config = async () => {
    try {
      setValidating455(true);
      setValidationResult(null);
      const res = await SswConfigService.validate455Config(config455);
      setValidationResult(res);
      if (res.isValid) {
        notify('success', 'Configuração 455 validada com sucesso! Sem inconsistências.');
      } else {
        notify('error', `Inconsistências detectadas: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      notify('error', `Erro na validação: ${err.message}`);
    } finally {
      setValidating455(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-on-surface">
        <span className="material-symbols-outlined text-4xl text-[var(--router-primary)] animate-spin">
          progress_activity
        </span>
        <p className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
          Carregando Central de Configurações SSW...
        </p>
      </div>
    );
  }

  const isConnected = sessionData?.isAuthenticated || false;
  const isConfigured = sessionData?.isConfigured || hasPassword;

  return (
    <div className="space-y-6 text-left text-on-surface">
      {/* Top Banner: Status da Integração SSW */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isConfigured
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <span className="material-symbols-outlined text-[24px]">
                {isConnected ? 'cloud_done' : isConfigured ? 'cloud_sync' : 'cloud_off'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-on-surface">
                  Status da Integração SSW
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isConnected
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : isConfigured
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                }`}>
                  {isConnected ? 'Sessão Ativa' : isConfigured ? 'Pronto para Conectar' : 'Não Configurado'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Central de gerenciamento das capacidades operacionais SSW. Protocolos desacoplados por camada de gateway e tolerância a falhas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConn || !isConfigured}
              className="px-4 py-2 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed font-bold text-xs rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${testingConn ? 'animate-spin' : ''}`}>
                {testingConn ? 'sync' : 'network_check'}
              </span>
              <span>{testingConn ? 'Testando Conexão...' : 'Testar Conexão SSW'}</span>
            </button>

            <button
              type="button"
              onClick={loadAllData}
              className="px-3.5 py-2 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Telemetry Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-outline-variant/40 text-xs">
          <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
            <span className="text-[10px] text-on-surface-variant block uppercase font-mono font-bold">Usuário Operacional</span>
            <span className="text-xs font-semibold text-on-surface font-mono">{usuario || sessionData?.authenticatedUser || 'Não informado'}</span>
          </div>
          <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
            <span className="text-[10px] text-on-surface-variant block uppercase font-mono font-bold">Empresa / Sigla</span>
            <span className="text-xs font-semibold text-on-surface font-mono">{empresa || sessionData?.authenticatedEmpresa || 'Não informado'}</span>
          </div>
          <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
            <span className="text-[10px] text-on-surface-variant block uppercase font-mono font-bold">Unidade Padrão</span>
            <span className="text-xs font-semibold text-emerald-400 font-mono font-bold">{unidade || sessionData?.authenticatedUnid || 'VGA'}</span>
          </div>
          <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
            <span className="text-[10px] text-on-surface-variant block uppercase font-mono font-bold">Última Autenticação</span>
            <span className="text-xs font-semibold text-on-surface font-mono">
              {sessionData?.lastAuthenticatedAt ? new Date(sessionData.lastAuthenticatedAt).toLocaleTimeString() : 'Pendente'}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Notification Message */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : notification.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : 'bg-[var(--router-primary)]/10 border-[var(--router-primary)]/30 text-[var(--router-primary)]'
        }`}>
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
            {notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}
          </span>
          <div className="flex-1 text-xs leading-relaxed">
            <p className="font-semibold">{notification.text}</p>
          </div>
        </div>
      )}

      {/* Test Connection Result Box */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="flex items-start gap-2.5">
            <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
              testResult.success ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {testResult.success ? 'verified' : 'cancel'}
            </span>
            <div className="space-y-1">
              <p className={`text-xs font-bold ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {testResult.success ? 'Diagnóstico de Conexão: Sucesso' : 'Diagnóstico de Conexão: Falha'}
              </p>
              <p className="text-[11px] text-on-surface-variant">{testResult.message}</p>
              {testResult.session && (
                <p className="text-[10px] text-on-surface-variant font-mono">
                  Sessão ativa para usuário: <strong>{testResult.session.authenticatedUser}</strong> | Filial: <strong>{testResult.session.authenticatedUnid}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Validation Result Box */}
      {validationResult && (
        <div className={`p-4 rounded-xl border space-y-2 ${
          validationResult.isValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold flex items-center gap-1.5 ${
              validationResult.isValid ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className="material-symbols-outlined text-[16px]">
                {validationResult.isValid ? 'check_circle' : 'warning'}
              </span>
              Validação dos Parâmetros do 455
            </span>
            <button
              type="button"
              onClick={() => setValidationResult(null)}
              className="text-on-surface-variant hover:text-on-surface text-xs"
            >
              Fechar
            </button>
          </div>

          {validationResult.errors.length > 0 && (
            <ul className="text-xs text-rose-400 list-disc list-inside space-y-0.5">
              {validationResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}

          {validationResult.warnings.length > 0 && (
            <ul className="text-xs text-amber-300 list-disc list-inside space-y-0.5">
              {validationResult.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          )}

          {validationResult.isValid && validationResult.warnings.length === 0 && (
            <p className="text-xs text-emerald-400">
              Todos os parâmetros estão em perfeita conformidade com o protocolo do SSWTools.
            </p>
          )}
        </div>
      )}

      {/* Grid: Conexão & Capability 455 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Conexão & Autenticação (xl:col-span-5) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
                  key
                </span>
                Conexão & Autenticação Backend
              </h4>
              <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase">
                Segurança Estrita
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Credenciais utilizadas pelo servidor para autenticar no SSW e gerenciar cookies de sessão. As senhas nunca são expostas na interface nem no bundle frontend.
            </p>

            <form onSubmit={handleSaveConnection} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  Empresa / Sigla (f1 / Domínio)
                </label>
                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ex: TRP"
                  className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    User I (f2)
                  </label>
                  <input
                    type="text"
                    value={useri}
                    onChange={(e) => setUseri(e.target.value)}
                    placeholder="Ex: USER_I"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Usuário Operacional (f3)
                  </label>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ex: joao.silva"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Senha de Acesso SSW (f4)</span>
                  {hasPassword && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Configurada no Backend
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={hasPassword ? '•••••••• (Deixe em branco para manter a atual)' : 'Digite a senha de login SSW'}
                  className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Unidade Padrão (UNID)
                  </label>
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value.toUpperCase())}
                    placeholder="Ex: VGA"
                    maxLength={5}
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Base URL SSW
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://sistema.ssw.inf.br"
                    className="w-full bg-surface border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-outline-variant/40 text-[11px] text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-[var(--router-primary)] text-[16px] shrink-0 mt-0.5">
                  security
                </span>
                <span>
                  <strong>Isolamento Arquitetural:</strong> A senha nunca é gravada em localStorage, IndexedDB ou no cliente. Precedência: Configuração do Router &gt; Variáveis de Ambiente (.env) &gt; Defaults.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingConn}
                className="w-full py-2.5 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed font-bold text-xs rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className={`material-symbols-outlined text-[16px] ${savingConn ? 'animate-spin' : ''}`}>
                  {savingConn ? 'sync' : 'save'}
                </span>
                <span>{savingConn ? 'Salvando Conexão...' : 'Salvar Conexão SSW'}</span>
              </button>
            </form>
          </div>

          {/* Card: Diagnóstico de Circuit Breakers & Resiliência */}
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/40 pb-3">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">
                shield_with_heart
              </span>
              Resiliência & Circuit Breakers
            </h4>

            {healthData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 bg-surface rounded-xl border border-outline-variant/40">
                  <span className="text-on-surface-variant font-medium">Estado Geral:</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                    healthData.overallStatus === 'HEALTHY'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-amber-400 bg-amber-500/10'
                  }`}>
                    {healthData.overallStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
                    <span className="text-[10px] text-on-surface-variant block uppercase font-mono">Capacidades Ativas</span>
                    <span className="font-bold font-mono text-on-surface">{healthData.activeCapabilities} / {healthData.totalCapabilities}</span>
                  </div>
                  <div className="p-2.5 bg-surface rounded-xl border border-outline-variant/40">
                    <span className="text-[10px] text-on-surface-variant block uppercase font-mono">Circuitos Abertos</span>
                    <span className={`font-bold font-mono ${healthData.openCircuits > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {healthData.openCircuits}
                    </span>
                  </div>
                </div>

                {/* Capability Table */}
                <div className="overflow-x-auto border border-outline-variant/50 rounded-xl bg-surface">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant text-[9px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-2">Capability</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Circuito</th>
                        <th className="p-2">Falhas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 font-mono">
                      {healthData.capabilities.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2 font-semibold text-on-surface">{c.id.replace('REPORT_', '')}</td>
                          <td className="p-2">
                            <span className="text-emerald-400 font-bold">{c.status}</span>
                          </td>
                          <td className="p-2">
                            <span className={c.circuitState === 'CLOSED' ? 'text-emerald-400' : 'text-rose-400'}>
                              {c.circuitState}
                            </span>
                          </td>
                          <td className="p-2 text-on-surface-variant">{c.failureCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Telemetria de resiliência não disponível no momento.</p>
            )}
          </div>
        </div>

        {/* Coluna Direita: Parâmetros da Capability 455 (xl:col-span-7) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
              <div>
                <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
                    tune
                  </span>
                  Capability 455 — Parâmetros do Relatório de Entregas
                </h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Parâmetros de negócio para geração do relatório 455 no SSW. Mapeados funcionalmente sem hardcode na View.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestore455Defaults}
                  disabled={saving455}
                  title="Restaura os defaults exatos do SSWTools"
                  className="px-2.5 py-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-[11px] font-semibold text-amber-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">restore</span>
                  <span>Restaurar Padrão</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidate455Config}
                  disabled={validating455}
                  className="px-2.5 py-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-[11px] font-semibold text-[var(--router-primary)] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">checklist</span>
                  <span>Validar</span>
                </button>
              </div>
            </div>

            {/* Parameter Field Groups */}
            <div className="space-y-4 text-xs">
              {/* Grupo 1: Período & Datas */}
              <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/50 space-y-3">
                <h5 className="text-xs font-bold text-on-surface flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                  1. Temporalidade & Tipo de Período
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo de Período Padrão
                    </label>
                    <select
                      value={config455.tipoPeriodo}
                      onChange={(e) => setConfig455({ ...config455, tipoPeriodo: e.target.value as any })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="AUTORIZACAO">Autorização do CTRC (Padrão SSWTools - f11/f12)</option>
                      <option value="EMISSAO">Emissão do CTRC (f9/f10)</option>
                      <option value="PREVISAO">Previsão de Entrega (f13/f14)</option>
                      <option value="ENTREGA">Data Real de Entrega (f15/f16)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Status de Entrega da Carga (f22)
                    </label>
                    <select
                      value={config455.entrega}
                      onChange={(e) => setConfig455({ ...config455, entrega: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="p">Pendentes de Entrega ('p' - Padrão RotaOperational)</option>
                      <option value="E">Entregues ('E')</option>
                      <option value="T">Todas ('T')</option>
                      <option value="R">Recusadas ('R')</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grupo 2: Localização & Unidades */}
              <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/50 space-y-3">
                <h5 className="text-xs font-bold text-on-surface flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  2. Filtros de Unidade, Regional e UF
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo de Unidade (f3)
                    </label>
                    <select
                      value={config455.unidadeTipo}
                      onChange={(e) => setConfig455({ ...config455, unidadeTipo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="A">Todas ('A' - Padrão)</option>
                      <option value="P">Própria ('P')</option>
                      <option value="T">Terceirizada ('T')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo Regional (reg_tipo)
                    </label>
                    <select
                      value={config455.regionalTipo}
                      onChange={(e) => setConfig455({ ...config455, regionalTipo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="E">Emitente ('E' - Padrão)</option>
                      <option value="D">Destinatária ('D')</option>
                      <option value="R">Redespacho ('R')</option>
                      <option value="T">Todas ('T')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo UF (f5)
                    </label>
                    <select
                      value={config455.ufTipo}
                      onChange={(e) => setConfig455({ ...config455, ufTipo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold focus:outline-none focus:border-primary"
                    >
                      <option value="R">Remetente ('R' - Padrão)</option>
                      <option value="D">Destinatário ('D')</option>
                      <option value="E">Entrega ('E')</option>
                      <option value="T">Todos ('T')</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grupo 3: Clientes, Documentos e Frete */}
              <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/50 space-y-3">
                <h5 className="text-xs font-bold text-on-surface flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  3. Documentos, Frete & Liquidação
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo Cliente (f8)
                    </label>
                    <select
                      value={config455.clienteTipo}
                      onChange={(e) => setConfig455({ ...config455, clienteTipo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="T">Todos ('T')</option>
                      <option value="R">Remetente ('R')</option>
                      <option value="D">Destinatário ('D')</option>
                      <option value="P">Pagador ('P')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Documento (f18)
                    </label>
                    <select
                      value={config455.tipoDocumento}
                      onChange={(e) => setConfig455({ ...config455, tipoDocumento: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="T">Todos ('T')</option>
                      <option value="C">Conhecimento ('C')</option>
                      <option value="N">Nota Fiscal ('N')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo Frete (f19)
                    </label>
                    <select
                      value={config455.tipoFrete}
                      onChange={(e) => setConfig455({ ...config455, tipoFrete: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="T">Todos ('T')</option>
                      <option value="C">CIF ('C')</option>
                      <option value="F">FOB ('F')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Imposto Rep. (f20)
                    </label>
                    <select
                      value={config455.impostoRepassado}
                      onChange={(e) => setConfig455({ ...config455, impostoRepassado: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="S">Sim ('S')</option>
                      <option value="N">Não ('N')</option>
                      <option value="T">Todos ('T')</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Liquidação (f21)
                    </label>
                    <select
                      value={config455.liquidacao}
                      onChange={(e) => setConfig455({ ...config455, liquidacao: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="X">Todos ('X')</option>
                      <option value="S">Sim ('S')</option>
                      <option value="N">Não ('N')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Pagamento Vista (f23)
                    </label>
                    <select
                      value={config455.pagamentoVista}
                      onChange={(e) => setConfig455({ ...config455, pagamentoVista: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="A">Ambos ('A')</option>
                      <option value="S">Sim ('S')</option>
                      <option value="N">Não ('N')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Tipo Cálculo (f25)
                    </label>
                    <select
                      value={config455.tipoCalculo}
                      onChange={(e) => setConfig455({ ...config455, tipoCalculo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2 py-1.5 text-xs text-on-surface font-semibold focus:outline-none"
                    >
                      <option value="T">Todos ('T')</option>
                      <option value="N">Normal ('N')</option>
                      <option value="S">Subcontratado ('S')</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grupo 4: Formato de Exportação */}
              <div className="p-3.5 bg-surface rounded-xl border border-outline-variant/50 space-y-3">
                <h5 className="text-xs font-bold text-on-surface flex items-center gap-1.5 text-primary">
                  <span className="material-symbols-outlined text-[15px]">file_download</span>
                  4. Estrutura do Arquivo de Saída (Obrigatório para o Parser)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Arquivo (f35)
                    </label>
                    <select
                      value={config455.arquivo}
                      onChange={(e) => setConfig455({ ...config455, arquivo: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-bold focus:outline-none text-emerald-400"
                    >
                      <option value="e">Excel / CSV ('e' - Obrigatório)</option>
                      <option value="t">Texto ('t')</option>
                      <option value="p">PDF ('p')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Complementares (f37)
                    </label>
                    <select
                      value={config455.dadosComplementares}
                      onChange={(e) => setConfig455({ ...config455, dadosComplementares: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-bold focus:outline-none text-emerald-400"
                    >
                      <option value="B">Completo / Bloco ('B' - Obrigatório)</option>
                      <option value="S">Sim ('S')</option>
                      <option value="N">Não ('N')</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                      Relatório Básico (basico)
                    </label>
                    <select
                      value={config455.basico}
                      onChange={(e) => setConfig455({ ...config455, basico: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-bold focus:outline-none text-emerald-400"
                    >
                      <option value="N">Não ('N' - Completo)</option>
                      <option value="S">Sim ('S')</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave455Config}
              disabled={saving455}
              className="w-full py-2.5 bg-[var(--router-primary)] text-on-primary hover:bg-[var(--router-primary)]-fixed font-bold text-xs rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span className={`material-symbols-outlined text-[16px] ${saving455 ? 'animate-spin' : ''}`}>
                {saving455 ? 'sync' : 'save'}
              </span>
              <span>{saving455 ? 'Salvando Parâmetros 455...' : 'Salvar Parâmetros da Capability 455'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Próximas Capabilities (Arquitetura Extensível) */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--router-primary)] text-[18px]">
              hub
            </span>
            Catálogo Extensível de Capabilities SSW
          </h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Arquitetura preparada para integração das próximas capabilities operacionais do ecossistema SSW.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 101 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-[10px] rounded">
                SSW 101
              </span>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 font-sans font-bold text-[9px] rounded-full uppercase">
                Próximo Ciclo (SSW-101-001)
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Coletas & Consulta de CTRCs</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Consulta de coletas pendentes e busca de dados sumários de CTRCs específicos por chave/número.
            </p>
          </div>

          {/* 063 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-surface-container border border-outline-variant font-mono font-bold text-[10px] text-on-surface-variant rounded">
                SSW 063
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-sans font-semibold text-[9px] rounded-full uppercase">
                Não implementado
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Rastreamento de Cargas</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Tracking de mercadorias em trânsito e localização por nota fiscal ou chave NFe.
            </p>
          </div>

          {/* 029 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-surface-container border border-outline-variant font-mono font-bold text-[10px] text-on-surface-variant rounded">
                SSW 029
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-sans font-semibold text-[9px] rounded-full uppercase">
                Não implementado
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Faturas & Previsão Financeira</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Gestão de faturamento de frete, boletos emitidos e auditoria de pagamentos.
            </p>
          </div>

          {/* 030 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-surface-container border border-outline-variant font-mono font-bold text-[10px] text-on-surface-variant rounded">
                SSW 030
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-sans font-semibold text-[9px] rounded-full uppercase">
                Não implementado
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Manifestos de Carga</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Consulta e auditoria estruturada de manifestos emitidos e viagens em curso.
            </p>
          </div>

          {/* 023 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-surface-container border border-outline-variant font-mono font-bold text-[10px] text-on-surface-variant rounded">
                SSW 023
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-sans font-semibold text-[9px] rounded-full uppercase">
                Não implementado
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Ocorrências & Auditoria</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Registro e sincronização de ocorrências de entrega, recusas e devoluções.
            </p>
          </div>

          {/* 264 */}
          <div className="p-4 bg-surface rounded-xl border border-outline-variant/60 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-surface-container border border-outline-variant font-mono font-bold text-[10px] text-on-surface-variant rounded">
                SSW 264
              </span>
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-sans font-semibold text-[9px] rounded-full uppercase">
                Não implementado
              </span>
            </div>
            <h5 className="text-xs font-bold text-on-surface">Descarga & Romaneios</h5>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Controle de conferência física na descarga e romaneios de entrega.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
