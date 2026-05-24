import { useState, FormEvent, useEffect } from 'react';
import { Vehicle, DriverScore, Ctrc, Ticket, CriticClient, AppUser } from '../types';
import { 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  exportStateToSupabase, 
  importStateFromSupabase,
  SUPABASE_SQL_SCHEMA,
  getSavedCredentials,
  updateActiveSupabaseClient,
  encryptCredentials,
  decryptCredentials,
  getAppUsers,
  saveAppUser,
  deleteAppUser
} from '../supabase';
import secureConfig from '../supabase_config_enc.json';

interface ConfiguracoesViewProps {
  onResetOP01: () => void;
  onResetOP02: () => void;
  onResetOP03: () => void;
  adminUser: AppUser;
  onUpdateAdminUser: (user: AppUser) => void;
  vehicles: Vehicle[];
  drivers: DriverScore[];
  availableCtrcs: Ctrc[];
  tickets: Ticket[];
  clients: CriticClient[];
  onSyncFromSupabase: (data: {
    vehicles?: Vehicle[];
    drivers?: DriverScore[];
    ctrcs?: Ctrc[];
    tickets?: Ticket[];
    clients?: CriticClient[];
  }) => void;
}

export default function ConfiguracoesView({
  onResetOP01,
  onResetOP02,
  onResetOP03,
  adminUser,
  onUpdateAdminUser,
  vehicles,
  drivers,
  availableCtrcs,
  tickets,
  clients,
  onSyncFromSupabase,
}: ConfiguracoesViewProps) {
  const [tempName, setTempName] = useState(adminUser.name);
  const [tempRole, setTempRole] = useState(adminUser.role);
  const [message, setMessage] = useState<string | null>(null);

  // Users Database management states
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormRole, setUserFormRole] = useState('Operador de Despacho');
  const [userFormIsMaster, setUserFormIsMaster] = useState(false);

  // Supabase Custom Form States for Database Setup
  const [customUrl, setCustomUrl] = useState(() => {
    const creds = getSavedCredentials();
    return creds.url;
  });
  const [customKey, setCustomKey] = useState(() => {
    const creds = getSavedCredentials();
    return creds.key;
  });
  const [activeSource, setActiveSource] = useState(() => {
    const creds = getSavedCredentials();
    return creds.source;
  });
  const [passphrase, setPassphrase] = useState(() => {
    return localStorage.getItem('supabase_passphrase') || '';
  });
  const [generatedEncryptedJson, setGeneratedEncryptedJson] = useState<string | null>(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Supabase Integration States
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  // Load registered system users
  const handleLoadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const users = await getAppUsers();
      setAppUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    handleLoadUsers();
    // Synced profile update in case props changed
    setTempName(adminUser.name);
    setTempRole(adminUser.role);
  }, [adminUser]);

  const handleCreateOrUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminUser.is_master) {
      alert("Operação bloqueada! Somente usuários MASTER podem criar ou editar usuários.");
      return;
    }

    const usernameRaw = userFormUsername.trim().toLowerCase();
    const nameRaw = userFormName.trim();

    if (!usernameRaw || !nameRaw) {
      alert("Insira um nome completo e e-mail/username válidos.");
      return;
    }

    const payload: AppUser = {
      username: usernameRaw,
      password: userFormPassword.trim() || '123',
      name: nameRaw,
      role: userFormRole,
      is_master: userFormIsMaster
    };

    const res = await saveAppUser(payload);
    setMessage(res.message);
    setTimeout(() => setMessage(null), 3500);

    // Clear user fields
    setUserFormUsername('');
    setUserFormPassword('');
    setUserFormName('');
    setUserFormIsMaster(false);

    handleLoadUsers();
  };

  const handleDeleteUserClick = async (usernameToDelete: string) => {
    if (!adminUser.is_master) {
      alert("Apenas administradores MASTER podem remover operadores.");
      return;
    }
    if (usernameToDelete.toLowerCase() === adminUser.username.toLowerCase()) {
      alert("Você está autenticado nesta conta e não pode excluir a si mesmo!");
      return;
    }
    if (confirm(`Tem certeza que deseja remover o usuário operacional '${usernameToDelete}'?`)) {
      const res = await deleteAppUser(usernameToDelete);
      setMessage(res.message);
      setTimeout(() => setMessage(null), 3000);
      handleLoadUsers();
    }
  };

  const handleSaveActiveCredentials = () => {
    if (!adminUser.is_master) {
      alert("Apenas administradores MASTER podem alterar as chaves de API Supabase.");
      return;
    }
    const res = updateActiveSupabaseClient(customUrl, customKey, passphrase);
    if (res.success) {
      setActiveSource(res.source);
      setCustomUrl(res.url);
      setCustomKey(res.key);
      setMessage("Credenciais ativas atualizadas com sucesso!");
      setTimeout(() => setMessage(null), 3000);
      handleLoadUsers();
    }
  };

  const handleClearActiveCredentials = () => {
    if (!adminUser.is_master) {
      alert("Apenas administradores MASTER podem alterar as chaves de API Supabase.");
      return;
    }
    const res = updateActiveSupabaseClient('', '', '');
    setActiveSource(res.source);
    setCustomUrl(res.url);
    setCustomKey(res.key);
    setPassphrase('');
    setMessage("Configurações personalizadas limpas. Voltando aos padrões.");
    setTimeout(() => setMessage(null), 3000);
    handleLoadUsers();
  };

  const handleGenerateEncryptedConfig = () => {
    if (!adminUser.is_master) {
      alert("Apenas administradores MASTER podem gerar criptografia.");
      return;
    }
    if (!customUrl || !customKey) {
      alert("Defina uma URL e Chave Anon primeiro.");
      return;
    }
    if (!passphrase) {
      alert("Defina uma Senha do Repositório (Master Passphrase) para a criptografia.");
      return;
    }
    const combined = `${customUrl}||${customKey}`;
    const encryptedPayload = encryptCredentials(combined, passphrase);
    const configJson = {
      encrypted: true,
      passphrase_hint: "Use a senha configurada no painel",
      payload: encryptedPayload
    };
    setGeneratedEncryptedJson(JSON.stringify(configJson, null, 2));
    setMessage("JSON criptografado gerado abaixo.");
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDecryptFromFile = () => {
    if (!adminUser.is_master) {
      alert("Acesso restrito para operação.");
      return;
    }
    if (!passphrase) {
      alert("Insira a Senha do Repositório para descriptografar.");
      return;
    }
    if (secureConfig.encrypted && secureConfig.payload) {
      const decrypted = decryptCredentials(secureConfig.payload, passphrase);
      if (decrypted && decrypted.includes('||')) {
        const [decryptedUrl, decryptedKey] = decrypted.split('||');
        if (decryptedUrl && decryptedKey) {
          setCustomUrl(decryptedUrl);
          setCustomKey(decryptedKey);
          localStorage.setItem('supabase_passphrase', passphrase);
          const res = updateActiveSupabaseClient(decryptedUrl, decryptedKey, passphrase);
          setActiveSource(res.source);
          setMessage("Credenciais descriptografadas do arquivo de repositório com sucesso!");
          setTimeout(() => setMessage(null), 3500);
          handleLoadUsers();
          return;
        }
      }
      alert("Senha de repositório incorreta ou payload corrompido.");
    } else {
      alert("O arquivo /src/supabase_config_enc.json ainda não está criptografado (payload inválido). Por favor, gere o JSON primeiro.");
    }
  };

  const handleCopyJsonToClipboard = () => {
    if (generatedEncryptedJson) {
      navigator.clipboard.writeText(generatedEncryptedJson);
      setIsCopiedJson(true);
      setTimeout(() => setIsCopiedJson(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setSupabaseStatus(null);
    try {
      const res = await testSupabaseConnection();
      setSupabaseStatus(res.message);
    } catch (err: any) {
      setSupabaseStatus(`Falha de conexão: ${err?.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportToSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert("Por favor, configure as chaves do Supabase primeiro.");
      return;
    }
    if (!confirm("Isso exportará todos os dados locais atuais (veículos, motoristas, CTRCs, chamados, clientes) inserindo ou atualizando as tabelas do seu banco de dados Supabase. Continuar?")) {
      return;
    }
    setIsExporting(true);
    setSyncLogs(["Iniciando exportação..."]);
    try {
      const res = await exportStateToSupabase({
        vehicles,
        drivers,
        ctrcs: availableCtrcs,
        tickets,
        clients
      });
      setSyncLogs(res.results);
      if (res.success) {
        setMessage("Carga de semente operacional exportada para o Supabase com sucesso!");
      } else {
        setMessage("Exportação concluída com alguns alertas. Verifique o log.");
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `❌ Falha crítica: ${err?.message || err}`]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFromSupabase = async () => {
    if (!isSupabaseConfigured) {
      alert("Por favor, configure as chaves do Supabase primeiro.");
      return;
    }
    if (!confirm("Isso atualizará todo o seu painel local baixando as informações armazenadas no Supabase. Os dados locais não salvos serão sobrepostos. Deseja prosseguir?")) {
      return;
    }
    setIsImporting(true);
    setSyncLogs(["Buscando registros do Supabase..."]);
    try {
      const res = await importStateFromSupabase();
      if (res.success && res.data) {
        onSyncFromSupabase(res.data);
        setSyncLogs([
          "✓ Conexão estabelecida com sucesso.",
          `✓ ${res.data.vehicles.length} Veículos recuperados.`,
          `✓ ${res.data.drivers.length} Desempenhos de motorista sincronizados.`,
          `✓ ${res.data.ctrcs.length} Documentos operacionais CTRC carregados.`,
          `✓ ${res.data.tickets.length} Ocorrências mapeadas obtidas.`,
          `✓ ${res.data.clients.length} Clientes críticos sincronizados.`
        ]);
        setMessage(res.message);
      } else {
        setSyncLogs(prev => [...prev, `❌ Falha: ${res.message}`]);
        alert(`Erro na sincronização: ${res.message}`);
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `❌ Falha crítica: ${err?.message || err}`]);
    } finally {
      setIsImporting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    const updated: AppUser = {
      ...adminUser,
      name: tempName,
      role: tempRole
    };
    await saveAppUser(updated);
    onUpdateAdminUser(updated);
    setMessage("Perfil de operador atualizado com sucesso!");
    setTimeout(() => setMessage(null), 3000);
    handleLoadUsers();
  };

  const executeReset = (routine: 'OP-01' | 'OP-02' | 'OP-03') => {
    if (confirm(`Tem certeza que deseja executar o Reset de Governança ${routine}? Essa ação restaurará dados iniciais e reiniciará as métricas operacionais.`)) {
      if (routine === 'OP-01') onResetOP01();
      else if (routine === 'OP-02') onResetOP02();
      else onResetOP03();

      setMessage(`Rotina de governança complementar ${routine} foi disparada e executada com sucesso! Os bancos de dados locais foram recarregados.`);
    }
  };

  return (
    <div className="space-y-6 text-[#dae2fd]">
      <div>
        <h2 className="text-3xl font-bold font-sans text-on-surface tracking-tight">Governança Integrada</h2>
        <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
          Configurações de controle institucional, permissões de usuários integradas ao Supabase Database e sincronizadores operacionais de manifesto.
        </p>
      </div>

      {message && (
        <div className="bg-primary-container/15 border border-primary/30 text-primary px-4 py-3 rounded-xl flex items-start gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] shrink-0">verified_user</span>
          <div>
            <p className="text-xs font-semibold">Mensagem do Sistema</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{message}</p>
          </div>
        </div>
      )}

      {/* Profile and resets row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">manage_accounts</span>
              Seu Perfil de Operador
            </h3>
            <p className="text-xs text-on-surface-variant mb-5">
              Defina as credenciais locais e o nível de acesso operacional do usuário autenticado no sistema RotaOperational.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Cargo / Função Administrativa</label>
                <select
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Superintendente de Logística">Superintendente de Logística</option>
                  <option value="Auditor de Operações">Auditor de Operações</option>
                  <option value="Controlador de Frota">Controlador de Frota</option>
                  <option value="Analista de Desempenho">Analista de Desempenho</option>
                  <option value="Operador de Despacho">Operador de Despacho</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Tipo de Privilégio:</span>
                {adminUser.is_master ? (
                  <span className="px-2 py-0.5 bg-error/15 text-error border border-error/20 font-mono text-[9px] uppercase tracking-wider rounded font-bold">
                    ★ USUÁRIO MASTER (TOTAL)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 font-mono text-[9px] uppercase tracking-wider rounded font-bold">
                    OPERADOR PADRÃO
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  Salvar Mudanças
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 border-t border-outline-variant/40 pt-4 text-[11px] text-on-surface-variant leading-relaxed">
            <p className="font-semibold text-on-surface mb-0.5">Nota de Sessão:</p>
            Suas modificações persistem na governança. Se estiver em modo Supabase ativo, sincronizará com sua conta `{adminUser.username}`.
          </div>
        </div>

        {/* Resets card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[18px]">restart_alt</span>
              Rotinas Sistêmicas Complementares (Displacers de Segurança)
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Em caso de desalinhamento de métricas locais, execute um dos resets de governança abaixo para purgar arquivos temporários e reiniciar as coleções simuladas.
            </p>

            <div className="space-y-4">
              {/* Reset OP-01 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    <strong className="text-xs text-on-surface">Mapeamento de Frota (OP-01)</strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Reinicializa veículos, motoristas e ajudantes em memória.</p>
                </div>
                <button
                  onClick={() => executeReset('OP-01')}
                  className="px-3.5 py-1.5 bg-[#93000a]/10 hover:bg-[#93000a]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-01
                </button>
              </div>

              {/* Reset OP-02 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    <strong className="text-xs text-on-surface">Roteirização Geral (OP-02)</strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Restaura fila de CTRCs pendentes e chamados críticos.</p>
                </div>
                <button
                  onClick={() => executeReset('OP-02')}
                  className="px-3.5 py-1.5 bg-[#93000a]/10 hover:bg-[#93000a]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-02
                </button>
              </div>

              {/* Reset OP-03 */}
              <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                    <strong className="text-xs text-on-surface">Controle de Risco (OP-03)</strong>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Reseta dossiê de clientes críticos e auditorias de CTRC.</p>
                </div>
                <button
                  onClick={() => executeReset('OP-03')}
                  className="px-3.5 py-1.5 bg-[#93000a]/10 hover:bg-[#93000a]/20 text-error border border-error/20 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Reset OP-03
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database dependent - Users management. Visible to all but only editable/deletable by Master users */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-5 text-left">
        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[19px]">group</span>
            Gestão Corporativa de Usuários do Sistema RotaOperational
          </h3>
          <p className="text-xs text-on-surface-variant">
            Lista de operadores autorizados no sistema e sincronizados em banco de dados Supabase PostgreSQL. {adminUser.is_master ? "Como usuário Master, você possui controle de escrita e exclusão total." : "Você possui privilégio de Leitura apenas."}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form to create/edit - ONLY edit if Master */}
          <div className="bg-surface p-4 rounded-xl border border-outline-variant/60 space-y-4">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary text-[16px]">person_add</span>
              Cadastrar Novo Operador
            </h4>

            {!adminUser.is_master ? (
              <div className="p-3 bg-error-container/10 border border-error/20 rounded-lg text-xs leading-normal font-semibold text-error flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">lock</span>
                <span>Criação bloqueada! Somente administradores MASTER possuem acesso à criação de novos operadores.</span>
              </div>
            ) : (
              <form onSubmit={handleCreateOrUpdateUser} className="space-y-3.5 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">E-mail ou Usuário (Login)</label>
                  <input
                    type="text"
                    required
                    value={userFormUsername}
                    onChange={(e) => setUserFormUsername(e.target.value)}
                    placeholder="Ex: joao.silva"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={userFormName}
                    onChange={(e) => setUserFormName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Senha de Entrada</label>
                  <input
                    type="text"
                    required
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    placeholder="Padrão: 123"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Perfil/Acesso Funcional</label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="Superintendente de Logística">Superintendente de Logística</option>
                    <option value="Auditor de Operações">Auditor de Operações</option>
                    <option value="Controlador de Frota">Controlador de Frota</option>
                    <option value="Analista de Desempenho">Analista de Desempenho</option>
                    <option value="Operador de Despacho">Operador de Despacho</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="is_master_chk"
                    checked={userFormIsMaster}
                    onChange={(e) => setUserFormIsMaster(e.target.checked)}
                    className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded focus:ring-primary"
                  />
                  <label htmlFor="is_master_chk" className="text-xs text-on-surface cursor-pointer select-none">
                    Dar privilégio de <span className="font-bold text-error">MASTER</span> (total)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  Gravar em Banco de Dados
                </button>
              </form>
            )}
          </div>

          {/* List of active users */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex justify-between items-center bg-surface px-4 py-2.5 rounded-lg border border-outline-variant/40">
              <span className="text-xs font-bold font-mono uppercase text-on-surface-variant">Operadores ({appUsers.length})</span>
              <button
                onClick={handleLoadUsers}
                disabled={isUsersLoading}
                className="text-[10px] bg-surface-container hover:bg-surface-container-high px-2 py-1 rounded text-primary border border-outline-variant font-bold flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-[13px] ${isUsersLoading ? 'animate-spin' : ''}`}>sync_saved_locally</span>
                Sincronizar Lista
              </button>
            </div>

            {isUsersLoading ? (
              <div className="text-center py-10 bg-surface rounded-xl border border-outline-variant/40 space-y-2">
                <span className="material-symbols-outlined text-primary text-[32px] animate-spin">sync</span>
                <p className="text-xs text-on-surface-variant">Carregando usuários do Supabase...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-outline-variant/60 rounded-xl bg-surface-container-low max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-outline-variant text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Usuário / Login</th>
                      <th className="p-3">Nome do Operador</th>
                      <th className="p-3">Perfil / Cargo</th>
                      <th className="p-3">Nível</th>
                      {adminUser.is_master && <th className="p-3 text-right">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {appUsers.map((u, idx) => (
                      <tr key={idx} className="hover:bg-surface/50 text-xs">
                        <td className="p-3 font-mono font-bold text-primary">{u.username}</td>
                        <td className="p-3 text-on-surface font-semibold">{u.name}</td>
                        <td className="p-3 text-on-surface-variant">{u.role}</td>
                        <td className="p-3">
                          {u.is_master ? (
                            <span className="px-2 py-0.5 bg-error/10 text-error font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                              Master
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-[9px] rounded uppercase tracking-wider">
                              Standard
                            </span>
                          )}
                        </td>
                        {adminUser.is_master && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteUserClick(u.username)}
                              disabled={u.username.toLowerCase() === adminUser.username.toLowerCase()}
                              className="p-1 px-1.5 hover:bg-error/15 text-error rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title="Remover operador permanentemente"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {appUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                          Nenhum usuário operacional cadastrado na tabela.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Database Integration Panel */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-6 text-left relative overflow-hidden">
        
        {/* Locking overlay shield on standard user levels */}
        {!adminUser.is_master && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-6 text-center z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20 mb-3.5 shadow-lg animate-bounce duration-1000">
              <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">Configuração de APIs Restrita</h3>
            <p className="text-xs text-on-surface-variant max-w-md mt-1 mb-4 leading-relaxed">
              Sua conta atual <strong className="text-white">({adminUser.name})</strong> não possui o nível de privilégio necessário. 
              Apenas usuários <strong className="text-error uppercase">Master</strong> do RotaOperational podem alterar as conexões do banco de dados na nuvem Supabase e do repositório.
            </p>
            <div className="text-[10px] text-on-surface-variant font-mono bg-surface p-2 rounded-lg border border-outline-variant/65">
              Por favor, faça logout e autentique-se com o usuário <strong className="text-white">"master" (senha 123)</strong> para acessar. 🛡️
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3ecf8e] text-[18px]">database</span>
              Gerenciamento de Chaves de Acesso e Sincronização Supabase
            </h3>
            <p className="text-xs text-on-surface-variant">
              Configure as chaves dinâmicas de acesso ao seu banco de dados Supabase e gerencie backups e credenciais de forma criptografada.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Origem das Chaves:</span>
            {activeSource === 'localStorage' && (
              <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                Salvo no Browser (localStorage)
              </span>
            )}
            {activeSource === 'decrypted' && (
              <span className="px-2.5 py-1 bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full animate-pulse"></span>
                Descriptografado do Repositório
              </span>
            )}
            {activeSource === 'env' && (
              <span className="px-2.5 py-1 bg-tertiary-container/35 text-tertiary border border-tertiary/20 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                Variáveis de Ambiente (.env)
              </span>
            )}
            {activeSource === 'none' && (
              <span className="px-2.5 py-1 bg-error-container/20 text-error border border-error/20 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                Sem Conexão Ativa
              </span>
            )}
          </div>
        </div>

        {/* Inputs Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-surface p-4 rounded-xl border border-outline-variant/60">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">vpn_key</span>
              Credenciais do Banco de Dados
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  SUPABASE URL (Endereço da API)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://seu-projeto.supabase.co"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  SUPABASE ANON KEY (Chave Pública Anon)
                </label>
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Seu token JWT Anon do Supabase"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveActiveCredentials}
                className="px-3 py-2 bg-primary text-on-primary hover:bg-primary-fixed text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">save</span>
                Aplicar e Salvar no Browser
              </button>
              
              {activeSource === 'localStorage' && (
                <button
                  type="button"
                  onClick={handleClearActiveCredentials}
                  className="px-3 py-2 bg-[#93000a]/10 hover:bg-[#93000a]/20 text-error border border-error/20 text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                  Limpar Override Local
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-outline-variant/50 lg:pl-4 pt-4 lg:pt-0">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-[#3ecf8e]">lock</span>
              Proteção Criptografada do Repositório Git
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1 flex justify-between">
                  <span>SENHA DO REPOSITÓRIO (Master Passphrase)</span>
                  <span className="text-[10px] text-primary lowercase tracking-tight">Criptografa / Descriptografa localmente</span>
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    localStorage.setItem('supabase_passphrase', e.target.value);
                  }}
                  placeholder="Insira a sua senha secreta"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:ring-1 focus:ring-[#3ecf8e]/50 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-surface-container/60 border border-[#3ecf8e]/10 rounded-lg text-[10px] text-on-surface-variant leading-relaxed space-y-1">
                <span className="font-bold text-[#3ecf8e] uppercase tracking-wide block">Garantia contra vazamento:</span>
                Não salve suas credenciais em texto claro no repositório público do GitHub. Criptografe suas credenciais reais em um bloco JSON encasulado com sua senha. No commit do repositório, os dados ficarão criptografados! Ao clonar, defina sua senha de repositório e clique em Descriptografar para carregar instantaneamente.
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleGenerateEncryptedConfig}
                className="px-3 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px] text-[#3ecf8e]">fingerprint</span>
                Gerar Configuração Criptografada
              </button>

              {secureConfig.encrypted && (
                <button
                  type="button"
                  onClick={handleDecryptFromFile}
                  className="px-3 py-2 bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/30 text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">enhanced_encryption</span>
                  Descriptografar Arquivo de Repositório (.json)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Generated Encrypted payload box */}
        {generatedEncryptedJson && (
          <div className="bg-surface-container/50 p-4 border border-[#3ecf8e]/20 rounded-xl space-y-2.5 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-bold text-[#3ecf8e]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full"></span>
                Configuração Pronta para committing no GitHub!
              </span>
              <button
                type="button"
                onClick={handleCopyJsonToClipboard}
                className="px-2 py-1 bg-tertiary text-on-tertiary hover:bg-tertiary-fixed rounded text-[9px] font-bold tracking-tight uppercase flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[12px]">
                  {isCopiedJson ? 'done' : 'content_copy'}
                </span>
                {isCopiedJson ? "Copiado!" : "Copiar JSON Criptografado"}
              </button>
            </div>
            
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Substitua o conteúdo do arquivo <code className="bg-surface font-mono font-bold text-on-surface p-0.5 rounded px-1">/src/supabase_config_enc.json</code> no seu repositório Git com o JSON abaixo. Seus dados estarão 100% protegidos contra robôs de monitoramento de credenciais públicas do GitHub!
            </p>

            <textarea
              value={generatedEncryptedJson}
              readOnly
              className="w-full h-32 bg-surface text-[10px] font-mono text-on-surface-variant p-3 border border-outline-variant rounded-lg focus:outline-none select-all"
            />
          </div>
        )}

        {/* Database Sync Controls (Buttons container) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-on-surface flex items-center gap-1 pb-1">
            <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
            Ações de Sincronização do Banco
          </h4>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`px-4 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant text-[11px] font-bold rounded-lg transition-all flex items-center gap-2 ${isTesting ? 'opacity-65 cursor-wait' : ''}`}
            >
              <span className="material-symbols-outlined text-[15px] text-[#3ecf8e]">quiz</span>
              {isTesting ? 'Testando...' : 'Testar Conexão API'}
            </button>

            <button
              onClick={handleExportToSupabase}
              disabled={isExporting || activeSource === 'none'}
              className={`px-4 py-2 bg-[#3ecf8e] text-[#001f11] hover:bg-[#32b479] text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
              {isExporting ? 'Exportando...' : 'Carga Semente (Exportar Local para Nuvem)'}
            </button>

            <button
              onClick={handleImportFromSupabase}
              disabled={isImporting || activeSource === 'none'}
              className={`px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
            >
              <span className="material-symbols-outlined text-[15px]">cloud_download</span>
              {isImporting ? 'Baixando...' : 'Importar Banco de Dados do Supabase'}
            </button>
          </div>
        </div>

        {/* Live response message container */}
        {supabaseStatus && (
          <div className="p-3 bg-surface border border-outline-variant rounded-lg text-xs font-mono space-y-1">
            <p className="font-semibold text-on-surface">Resultado do Diagnóstico:</p>
            <p className="text-on-surface-variant leading-relaxed select-all">{supabaseStatus}</p>
          </div>
        )}

        {/* Sync logs output console */}
        {syncLogs.length > 0 && (
          <div className="bg-surface p-4 rounded-lg border border-outline-variant">
            <h4 className="text-xs font-bold text-on-surface mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
              Console de Sincronização Supabase:
            </h4>
            <div className="space-y-1 font-mono text-[10px] max-h-40 overflow-y-auto">
              {syncLogs.map((log, i) => (
                <div key={i} className={log.startsWith('❌') ? 'text-error font-semibold' : 'text-on-surface-variant'}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schema installation scripts copy card */}
        <div className="bg-surface-container rounded-lg border border-outline-variant/60 overflow-hidden">
          <button
            onClick={() => setShowSql(!showSql)}
            className="w-full px-4 py-3 bg-surface hover:bg-surface-container-high transition-colors flex justify-between items-center"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary text-[17px]">terminal</span>
              Script SQL Setup de Tabelas (PostgreSQL)
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
              {showSql ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showSql && (
            <div className="p-4 border-t border-outline-variant/40 space-y-3">
              <div className="flex justify-between items-center text-xs text-on-surface-variant">
                <span>Cole este script no console de consultas RLS do seu projeto Supabase:</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 bg-primary text-on-primary hover:bg-primary-fixed rounded text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {sqlCopied ? 'done' : 'content_copy'}
                  </span>
                  {sqlCopied ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </div>
              <textarea
                value={SUPABASE_SQL_SCHEMA}
                readOnly
                className="w-full h-48 bg-surface border border-outline-variant/70 text-[10px] font-mono text-tertiary rounded-lg p-3 focus:outline-none select-all"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
