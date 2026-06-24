import { ViewType } from '../types';

interface HeaderProps {
  currentView: ViewType;
  searchValue: string;
  onSearchChange: (value: string) => void;
  notificationCount: number;
  onClearNotifications?: () => void;
  onToggleSidebar: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Header({
  currentView,
  searchValue,
  onSearchChange,
  notificationCount,
  onClearNotifications,
  onToggleSidebar,
  theme = 'dark',
  onToggleTheme = () => {},
}: HeaderProps) {
  const getViewTitleAndPlaceholder = (view: ViewType) => {
    switch (view) {
      case 'dashboard':
        return { title: 'Mission Control', placeholder: 'Buscar setores, métricas...' };
      case 'importacao':
        return { title: 'Módulo de Importação CSV', placeholder: 'Buscar manifesto mapeado...' };
      case 'frota':
        return { title: 'Gestão de Frota', placeholder: 'Buscar veículos, motoristas...' };
      case 'roteirizacao':
        return { title: 'Roteirização Inteligente', placeholder: 'Buscar CTRCs disponíveis...' };
      case 'finalizacao':
        return { title: 'Programação do Dia', placeholder: 'Buscar CTRC vinculado...' };
      case 'desempenho':
        return { title: 'Relatório de Desempenho', placeholder: 'Buscar motorista...' };
      case 'solucao':
        return { title: 'Fila de Solução de Problemas', placeholder: 'Buscar ticket...' };
      case 'clientes':
        return { title: 'Dossiê de Clientes Críticos', placeholder: 'Buscar cliente crítico...' };
      case 'configuracoes':
        return { title: 'Configurações de Governança', placeholder: 'Buscar rotina de manutenção...' };
      default:
        return { title: 'Monitoramento Operacional', placeholder: 'Procurar dados...' };
    }
  };

  const { title, placeholder } = getViewTitleAndPlaceholder(currentView);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[72px] h-16 router-header flex justify-between items-center px-4 md:px-8 z-40 backdrop-blur-md bg-opacity-95 transition-all duration-300">
      {/* Title & Burger Menu block */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleSidebar}
          className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition-all cursor-pointer flex items-center justify-center shrink-0 md:hidden"
          title="Abrir Menu Lateral"
        >
          <span className="material-symbols-outlined text-[24px] select-none">menu</span>
        </button>

        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-lg bg-primary-container hidden sm:flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-on-primary-container text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold font-sans text-primary tracking-tight truncate hidden xs:inline">
            RotaOperational
          </span>
        </div>

        <div className="h-4 w-px bg-outline-variant/60 mx-1 hidden sm:block"></div>

        <h2 className="text-xs sm:text-sm font-bold text-on-surface tracking-tight truncate max-w-[120px] sm:max-w-xs">
          {title}
        </h2>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] select-none">
            search
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm text-on-surface placeholder-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
            >
              <span className="material-symbols-outlined text-[16px] select-none">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Trailing Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="relative text-on-surface-variant hover:text-primary transition-colors duration-200 p-2 rounded-full hover:bg-surface-container cursor-pointer"
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          <span className="material-symbols-outlined select-none text-[22px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Support Help */}
        <button
          className="relative text-on-surface-variant hover:text-primary transition-colors duration-200 p-2 rounded-full hover:bg-surface-container"
          title="Central de Ajuda"
          onClick={() => {
            alert("Suporte Técnico RotaOperational: Ramal 2045. Documentação do sistema disponível em sua intranet.");
          }}
        >
          <span className="material-symbols-outlined select-none text-[22px]">help</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onClearNotifications}
          className="relative text-on-surface-variant hover:text-primary transition-colors duration-200 p-2 rounded-full hover:bg-surface-container"
          title={`${notificationCount} novas ocorrências na fila`}
        >
          <span className="material-symbols-outlined select-none text-[22px]">notifications</span>
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-on-error font-sans text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-outline-variant mx-1"></div>

        {/* Account indicator */}
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[32px] text-primary select-none cursor-default">
            account_circle
          </span>
        </div>
      </div>
    </header>
  );
}
