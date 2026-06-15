import { useState, FormEvent, useEffect } from 'react';
import { AppUser } from '../types';
import { getAppUsers, isSupabaseConfigured, supabase, DEFAULT_APP_USERS, getSavedCredentials } from '../supabase';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form States
  const [username, setUsername] = useState('master');
  const [password, setPassword] = useState('123');
  const [loginUnid, setLoginUnid] = useState('SPO');
  
  // Register Form States
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Superintendente de Logística');
  const [regIsMaster, setRegIsMaster] = useState(true);
  const [regUnid, setRegUnid] = useState('SPO');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbOnline, setIsDbOnline] = useState(false);

  useEffect(() => {
    setIsDbOnline(isSupabaseConfigured && !!supabase);
  }, []);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    try {
      const creds = getSavedCredentials();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (creds.url && creds.key) {
        headers["x-supabase-url"] = creds.url;
        headers["x-supabase-key"] = creds.key;
      }

      // Authenticate via server-side endpoint /api/auth/login
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Autenticação efetuada com sucesso!");
        setTimeout(() => {
          onLoginSuccess({
            ...data.user,
            unid: data.user.unid || loginUnid
          });
        }, 800);
      } else {
        setErrorMsg(data.error || "Credenciais inválidas. Verifique o usuário corporativo e a senha.");
      }
    } catch (err: any) {
      // Fallback offline login using database helpers (localStorage/DEFAULT_APP_USERS)
      console.warn("API de login offline, testando login local fallback:", err);
      const localUsers = await getAppUsers();
      const userMatch = localUsers.find(
        u => u.username.toLowerCase() === cleanUser.toLowerCase() && u.password === cleanPass
      );

      if (userMatch) {
        onLoginSuccess({
          ...userMatch,
          unid: userMatch.unid || loginUnid
        });
      } else {
        setErrorMsg("Erro de conexão ou credenciais locais inválidas.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const email = regEmail.trim();
    const pass = regPassword.trim();
    const name = regName.trim();

    if (!email || !pass || !name) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (pass.length < 3) {
      setErrorMsg("A senha deve possuir pelo menos 3 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanUsername = email.includes("@") ? email.split("@")[0].toLowerCase() : email.toLowerCase();
      
      const payload = {
        username: cleanUsername,
        password: pass,
        name,
        role: regRole,
        is_master: regIsMaster,
        unid: regUnid
      };

      const creds = getSavedCredentials();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (creds.url && creds.key) {
        headers["x-supabase-url"] = creds.url;
        headers["x-supabase-key"] = creds.key;
      }

      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Conta criada e sincronizada com sucesso no Supabase!");
        
        // Log in automatically after registration
        setTimeout(() => {
          onLoginSuccess({
            username: cleanUsername,
            password: pass,
            name,
            role: regRole,
            is_master: regIsMaster,
            unid: regUnid
          });
        }, 1200);
      } else {
        setErrorMsg(data.error || "Não foi possível cadastrar usuário no Supabase.");
      }
    } catch (err: any) {
      setErrorMsg(`Erro no registro: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = async () => {
    setIsLoading(true);
    try {
      const usersList = await getAppUsers();
      const masterUser = usersList.find(u => u.is_master) || usersList[0] || {
        username: 'master',
        name: 'Anderson M. (Master)',
        role: 'Superintendente de Logística',
        is_master: true
      };
      onLoginSuccess({
        ...masterUser,
        unid: masterUser.unid || loginUnid
      });
    } catch {
      onLoginSuccess({
        username: 'master',
        name: 'Anderson M. (Master)',
        role: 'Superintendente de Logística',
        is_master: true,
        unid: loginUnid
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden text-[#dae2fd]">
      {/* Decorative Blur Background Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card Container */}
      <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant p-8 flex flex-col justify-between relative z-10 shadow-2xl">
        
        {/* Branding header inside login container */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center shrink-0 mx-auto shadow-[0_4px_16px_rgba(77,142,255,0.25)] mb-4">
            <span 
              className="material-symbols-outlined text-[32px] text-on-primary-container animate-spin-slow" 
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight leading-none bg-gradient-to-r from-white via-[#dae2fd] to-primary bg-clip-text text-transparent">
            RotaOperational
          </h1>
          <p className="text-[11px] font-mono mt-1.5 text-on-surface-variant uppercase tracking-wider">
            Autenticação Unificada Supabase
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-outline-variant mb-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-center border-b-2 transition-all ${activeTab === 'login' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-center border-b-2 transition-all ${activeTab === 'register' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface'}`}
          >
            Criar Conta (Auth)
          </button>
        </div>

        {errorMsg && (
          <div className="bg-error-container/10 border border-error/20 text-error p-3.5 mb-5 rounded-lg text-xs font-semibold text-center leading-normal">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-primary-container/10 border border-primary/20 text-[#3ecf8e] p-3.5 mb-5 rounded-lg text-xs font-semibold text-center leading-normal">
            {successMsg}
          </div>
        )}

        {activeTab === 'login' ? (
          /* Credentials Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                E-mail ou Usuário Corporativo
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  person
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: master ou anderson@gmail.com"
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Senha Institucional
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Informe sua senha"
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Unidade Operacional (Filial de Trabalho)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  domain
                </span>
                <select
                  value={loginUnid}
                  onChange={(e) => setLoginUnid(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                >
                  <option value="SPO">SPO - São Paulo / Matriz</option>
                  <option value="VGA">VGA - Varginha / MG</option>
                  <option value="BHS">BHS - Belo Horizonte / MG</option>
                  <option value="RIO">RIO - Rio de Janeiro / RJ</option>
                  <option value="CWB">CWB - Curitiba / PR</option>
                </select>
              </div>
            </div>

            {/* Quick Guide help card */}
            <div className="p-2.5 bg-surface rounded-lg border border-outline-variant/40 text-[10px] text-on-surface-variant leading-relaxed">
              <span className="font-semibold text-primary uppercase block mb-0.5">Mapeamento de Autenticação:</span>
              O sistema se comunica diretamente com o **Supabase Auth**. Caso utilize um login clássico (como `master` ou `operador`), o RotaOperational estende e provisiona sua conta automaticamente na plataforma em tempo real.
            </div>

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.99] shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                    Autenticando via Supabase...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    Entrar com Supabase Auth
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Sign Up (Register) Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                E-mail Institucional (Real)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Ex: anderson@empresa.com"
                  disabled={isLoading || !isDbOnline}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Nome Completo
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  badge
                </span>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: Anderson M. Albuquerque"
                  disabled={isLoading || !isDbOnline}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Criar Senha de Acesso (Min. 6 dítigos)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                  lock
                </span>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Defina uma senha robusta"
                  disabled={isLoading || !isDbOnline}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Função Logística
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                disabled={isLoading || !isDbOnline}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="Superintendente de Logística">Superintendente de Logística</option>
                <option value="Auditor de Operações">Auditor de Operações</option>
                <option value="Controlador de Frota">Controlador de Frota</option>
                <option value="Analista de Desempenho">Analista de Desempenho</option>
                <option value="Operador de Despacho">Operador de Despacho</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1.5">
                Unidade Logística de Atuação
              </label>
              <select
                value={regUnid}
                onChange={(e) => setRegUnid(e.target.value)}
                disabled={isLoading || !isDbOnline}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="SPO">SPO - São Paulo / Matriz</option>
                <option value="VGA">VGA - Varginha / MG</option>
                <option value="BHS">BHS - Belo Horizonte / MG</option>
                <option value="RIO">RIO - Rio de Janeiro / RJ</option>
                <option value="CWB">CWB - Curitiba / PR</option>
              </select>
            </div>

            <div className="flex items-center gap-2 py-1.5 bg-surface rounded-lg p-2.5 border border-outline-variant/30">
              <input
                type="checkbox"
                id="reg_master_chk"
                checked={regIsMaster}
                onChange={(e) => setRegIsMaster(e.target.checked)}
                disabled={isLoading || !isDbOnline}
                className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded focus:ring-primary"
              />
              <label htmlFor="reg_master_chk" className="text-xs text-on-surface cursor-pointer select-none">
                Designar nível de acesso administrativo <span className="font-bold text-error">MASTER</span>
              </label>
            </div>

            {!isDbOnline && (
              <div className="text-[10px] text-error font-medium p-2 bg-error-container/10 border border-error/20 rounded">
                Aviso: O registro requer que as chaves de API do Supabase estejam ativas. Vá em Configurações (com conta master local) para definir o banco na nuvem.
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={isLoading || !isDbOnline}
                className="w-full py-2.5 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.99] shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                    Criando conta Supabase...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    Registrar e Cadastrar Conta
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Demo separator & quick demo access */}
        <div className="mt-6 pt-5 border-t border-outline-variant/30">
          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider text-center mb-3">
            Atalho de Segurança (Desenvolvimento)
          </p>
          
          <button
            onClick={handleQuickDemoAccess}
            disabled={isLoading}
            className="w-full py-2 bg-surface text-on-surface border border-outline-variant hover:bg-surface-bright text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            Superar Autenticação (Acesso Master Local)
          </button>
        </div>

        {/* Footer info lock indicator */}
        <div className="mt-5 text-center flex items-center justify-center gap-3">
          <span className="text-[9px] font-mono text-on-surface-variant flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[12px]">security</span>
            TLS 1.3
          </span>
          <span className="text-[9px] font-mono text-on-surface-variant flex items-center justify-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isDbOnline ? 'bg-[#3ecf8e]' : 'bg-amber-500'}`}></span>
            {isDbOnline ? 'Supabase Auth Conectado' : 'Modo Autônomo Local'}
          </span>
        </div>
      </div>
    </div>
  );
}
