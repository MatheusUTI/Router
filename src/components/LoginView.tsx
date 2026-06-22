import { useState, FormEvent, useEffect } from 'react';
import { AppUser } from '../types';
import { getAppUsers, isSupabaseConfigured, supabase, getSavedCredentials } from '../supabase';
import { DEFAULT_OPERATIONAL_UNIT, getOperationalUnits } from '../constants/operationalUnits';

interface LoginViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // Login Form States
  const [username, setUsername] = useState('anderson');
  const [password, setPassword] = useState('123');
  const [loginUnid, setLoginUnid] = useState(() => {
    return localStorage.getItem('master_last_unid') || DEFAULT_OPERATIONAL_UNIT;
  });
  
  const [availableUnits, setAvailableUnits] = useState(() => getOperationalUnits());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbOnline, setIsDbOnline] = useState(false);

  useEffect(() => {
    setIsDbOnline(isSupabaseConfigured && !!supabase);
  }, []);

  useEffect(() => {
    const handler = () => {
      setAvailableUnits(getOperationalUnits());
    };
    window.addEventListener('operational_units_changed', handler);
    return () => window.removeEventListener('operational_units_changed', handler);
  }, []);

  const activeUnits = availableUnits.filter(u => u.active);

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

    const uNormal = cleanUser.toLowerCase();
    const uNoDomain = uNormal.endsWith("@rotaoperational.com") ? uNormal.replace("@rotaoperational.com", "") : uNormal;

    const tryLocalFallback = async (): Promise<boolean> => {
      try {
        const localUsers = await getAppUsers();
        const userMatch = localUsers.find(u => {
          const dbUserLower = u.username.toLowerCase();
          return (dbUserLower === uNormal || dbUserLower === uNoDomain) && u.password === cleanPass;
        });

        if (userMatch) {
          setSuccessMsg("Autenticação efetuada com sucesso!");
          const isMaster = !!userMatch.is_master;
          if (isMaster) {
            localStorage.setItem('master_last_unid', loginUnid);
          }
          const finalUnid = isMaster ? loginUnid : (userMatch.unid || DEFAULT_OPERATIONAL_UNIT);
          setTimeout(() => {
            onLoginSuccess({
              ...userMatch,
              unid: finalUnid
            });
          }, 800);
          return true;
        }
      } catch (localErr) {
        console.error("Erro no login local de fallback:", localErr);
      }
      return false;
    };

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
        const isMaster = !!data.user.is_master;
        if (isMaster) {
          localStorage.setItem('master_last_unid', loginUnid);
        }
        const finalUnid = isMaster ? loginUnid : (data.user.unid || DEFAULT_OPERATIONAL_UNIT);
        setTimeout(() => {
          onLoginSuccess({
            ...data.user,
            unid: finalUnid
          });
        }, 800);
      } else {
        // Quando /api/auth/login responder erro, antes de mostrar o erro final:
        const locallyAuthenticated = await tryLocalFallback();
        if (!locallyAuthenticated) {
          setErrorMsg("Credenciais inválidas ou usuário não sincronizado.");
        }
      }
    } catch (err: any) {
      console.warn("API de login offline, testando login local fallback:", err);
      const locallyAuthenticated = await tryLocalFallback();
      if (!locallyAuthenticated) {
        setErrorMsg("Credenciais inválidas ou usuário não sincronizado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = async () => {
    setIsLoading(true);
    try {
      const usersList = await getAppUsers();
      const andersonUser = usersList.find(u => u.username === 'anderson') || usersList.find(u => u.is_master) || usersList[0] || {
        username: 'anderson',
        name: 'Anderson Matheus',
        role: 'Supervisor Operacional',
        is_master: true
      };
      onLoginSuccess({
        ...andersonUser,
        unid: andersonUser.unid || loginUnid
      });
    } catch {
      onLoginSuccess({
        username: 'anderson',
        name: 'Anderson Matheus',
        role: 'Supervisor Operacional',
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
      <div className="w-full max-w-sm bg-surface-container rounded-2xl border border-outline-variant p-8 flex flex-col justify-between relative z-10 shadow-2xl">
        
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
          <p className="text-[12px] uppercase font-semibold text-primary tracking-widest mt-2">
            Acesso Operacional
          </p>
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

        {/* Credentials Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                person
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Informe seu usuário"
                disabled={isLoading}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1.5">
              Senha
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
              Unidade operacional
            </label>
            <div className="relative mb-1.5">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                domain
              </span>
              <select
                value={loginUnid}
                onChange={(e) => setLoginUnid(e.target.value)}
                disabled={isLoading}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              >
                {activeUnits.map(unit => (
                  <option key={unit.code} value={unit.code}>{unit.name}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-on-surface-variant/75 leading-normal mb-1">
              Usuários master podem selecionar a unidade. Operadores utilizam a unidade cadastrada.
            </p>
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
                  Autenticando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  Entrar
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo separator & quick demo access */}
        {((import.meta as any).env?.DEV) && (
          <div className="mt-5 pt-4 border-t border-outline-variant/30 text-center">
            <button
              onClick={handleQuickDemoAccess}
              disabled={isLoading}
              className="w-full py-2 bg-surface hover:bg-surface-bright text-on-surface border border-outline-variant text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
              Acesso local de teste
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
