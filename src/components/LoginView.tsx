import { useState, FormEvent } from 'react';

interface LoginViewProps {
  onLoginSuccess: (name: string, role: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('admin@rotaoperational.com');
  const [password, setPassword] = useState('••••••••');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Por favor, informe credenciais válidas.");
      return;
    }

    // Accept anything during interactive demo
    onLoginSuccess('Anderson M.', 'Superintendente de Logística');
  };

  const handleQuickDemoAccess = () => {
    onLoginSuccess('Anderson M.', 'Superintendente de Logística');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blur Background Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card Container */}
      <div className="w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant p-8 flex flex-col justify-between relative z-10 shadow-2xl">
        
        {/* Branding header inside login container */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center shrink-0 mx-auto shadow-[0_4px_16px_rgba(77,142,255,0.25)] mb-4">
            <span 
              className="material-symbols-outlined text-[32px] text-on-primary-container" 
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight leading-none">
            RotaOperational
          </h1>
          <p className="text-[11px] font-mono mt-1.5 text-on-surface-variant uppercase tracking-wider">
            Logistics Control Dashboard
          </p>
        </div>

        {errorMsg && (
          <div className="bg-error-container/10 border border-error/20 text-error p-3.5 mb-5 rounded-lg text-xs font-semibold text-center leading-normal">
            {errorMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">
              CPF ou E-mail Operador
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant select-none">
                person
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: operador@rota.com"
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">
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
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              />
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.99] shadow-md shadow-primary/10"
            >
              Autenticar e Entrar
            </button>
          </div>
        </form>

        {/* Demo separator & quick demo access */}
        <div className="mt-8 pt-6 border-t border-outline-variant/50">
          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider text-center mb-3">
            Ambiente de Demonstração
          </p>
          
          <button
            onClick={handleQuickDemoAccess}
            className="w-full py-2 bg-surface text-on-surface border border-outline-variant hover:bg-surface-bright text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">lab_profile</span>
            Entrar no Modo Demo (Sem Senha)
          </button>
        </div>

        {/* Footer info lock indicator */}
        <div className="mt-6 text-center">
          <span className="text-[9px] font-mono text-on-surface-variant flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[12px]">security</span>
            Acesso Criptografado TLS 1.3
          </span>
        </div>
      </div>
    </div>
  );
}
