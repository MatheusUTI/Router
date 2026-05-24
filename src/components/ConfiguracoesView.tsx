import { useState, FormEvent } from 'react';
import { Vehicle, DriverScore, Ctrc, Ticket, CriticClient } from '../types';
import { 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  exportStateToSupabase, 
  importStateFromSupabase,
  SUPABASE_SQL_SCHEMA 
} from '../supabase';

interface ConfiguracoesViewProps {
  onResetOP01: () => void;
  onResetOP02: () => void;
  onResetOP03: () => void;
  adminName: string;
  onUpdateAdmin: (name: string, role: string) => void;
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
  adminName,
  onUpdateAdmin,
  vehicles,
  drivers,
  availableCtrcs,
  tickets,
  clients,
  onSyncFromSupabase,
}: ConfiguracoesViewProps) {
  const [tempName, setTempName] = useState(adminName);
  const [tempRole, setTempRole] = useState('Superintendente de Logística');
  const [message, setMessage] = useState<string | null>(null);

  // Supabase Integration States
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

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
      alert("Por favor, configure as chaves do Supabase primeiro no arquivo .env");
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
      alert("Por favor, configure as chaves do Supabase primeiro no arquivo .env");
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

  const handleProfileSave = (e: FormEvent) => {
    e.preventDefault();
    onUpdateAdmin(tempName, tempRole);
    setMessage("Perfil de operador atualizado com sucesso no painel de governança!");
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Governança Integrada</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Configurações de controle institucional, reinicialização de rotinas complementares OP de rastreabilidade de manifesto.
        </p>
      </div>

      {message && (
        <div className="bg-primary-container/10 border border-primary/20 text-primary p-4 rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">verified_user</span>
          <div>
            <p className="text-xs font-semibold">Alerta de Governança</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings card */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">manage_accounts</span>
              Perfil do Operador Integrado
            </h3>
            <p className="text-xs text-on-surface-variant mb-5">
              Defina as credenciais e o nível de acesso operacional do usuário autenticado no sistema RotaOperational.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Nome de Operador</label>
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
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] shadow-sm"
                >
                  Confirmar Alterações
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 border-t border-outline-variant/40 pt-4 text-[11px] text-on-surface-variant leading-relaxed">
            <p className="font-semibold text-on-surface mb-0.5">Nota de Segurança:</p>
            As sessões de operação local do RotaOperational duram até que os dados sejam apagados da memória volátil ou resetados na aba à direita.
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
                  <p className="text-[11px] text-on-surface-variant">Reinicializa veículos, motoristas e ajudantes.</p>
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
                  <p className="text-[11px] text-on-surface-variant">Restaura fila de CTRCs pendentes e chamados.</p>
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
                  <p className="text-[11px] text-on-surface-variant">Reseta dossiê de clientes críticos e auditorias.</p>
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

      {/* Supabase Database Integration Panel */}
      <div className="bg-surface-container rounded-xl border border-outline-variant p-5 space-y-6 text-left">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3ecf8e] text-[18px]">database</span>
              Integração de Banco de Dados Supabase (PostgreSQL)
            </h3>
            <p className="text-xs text-on-surface-variant">
              Central de sincronização, sincronize a frota, CTRCs, chamados e dossiês de auditoria diretamente com um banco de dados real na nuvem do Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Status da Chave:</span>
            {isSupabaseConfigured ? (
              <span className="px-2.5 py-1 bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#3ecf8e] rounded-full animate-pulse"></span>
                    Ativo (.env)
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-error-container/20 text-error border border-error/20 font-bold rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    Não Configurado
              </span>
            )}
          </div>
        </div>

        {/* Dynamic configuration helper if keys are missing from environment */}
        {!isSupabaseConfigured && (
          <div className="bg-surface p-4 rounded-xl border border-warning/10 text-xs text-on-surface-variant space-y-3">
            <div className="flex items-center gap-2 text-warning font-semibold">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Como ativar a sincronização Supabase com o RotaOperational:</span>
            </div>
            <p className="leading-relaxed">
              O Supabase permite salvar seus CTRCs, veículos e motoristas de forma definitiva. Para ativá-lo:
            </p>
            <ol className="list-decimal pl-5 space-y-2 leading-relaxed">
              <li>
                Crie um projeto no site oficial do <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Supabase</a>.
              </li>
              <li>
                No painel do projeto, vá em <strong>Project Settings &gt; API</strong> e adicione as chaves abaixo no arquivo <code className="bg-surface-container px-1 py-0.5 rounded font-mono font-bold text-on-surface">.env</code> na raiz do seu projeto:
                <pre className="bg-surface-container text-[11px] p-2.5 rounded-lg border border-outline-variant font-mono mt-1 text-primary select-all">
{`VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-api-anon"`}
                </pre>
              </li>
              <li>
                Em seguida, abra o <strong>SQL Editor</strong> do painel do Supabase, clique em <strong>New Query</strong>, cole o script de tabelas fornecido abaixo, e clique em <strong>Run</strong>.
              </li>
            </ol>
          </div>
        )}

        {/* Operational buttons */}
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
            disabled={isExporting || !isSupabaseConfigured}
            className={`px-4 py-2 bg-[#3ecf8e] text-[#001f11] hover:bg-[#32b479] text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
          >
            <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
            {isExporting ? 'Exportando...' : 'Carga Semente (Exportar Local para Nuvem)'}
          </button>

          <button
            onClick={handleImportFromSupabase}
            disabled={isImporting || !isSupabaseConfigured}
            className={`px-4 py-2 bg-primary text-on-primary hover:bg-primary-fixed text-[11px] font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none`}
          >
            <span className="material-symbols-outlined text-[15px]">cloud_download</span>
            {isImporting ? 'Baixando...' : 'Importar Banco de Dados do Supabase'}
          </button>
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
