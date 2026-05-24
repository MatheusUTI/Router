import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  adminName: string;
  adminRole: string;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  adminName,
  adminRole,
  onLogout,
  isOpen,
  onClose,
}: SidebarProps) {
  const navItems = [
    { view: 'dashboard' as ViewType, label: 'Dashboard', icon: 'dashboard', fillIcon: true },
    { view: 'importacao' as ViewType, label: 'Importação', icon: 'upload_file', fillIcon: true },
    { view: 'frota' as ViewType, label: 'Frota', icon: 'local_shipping', fillIcon: true },
    { view: 'roteirizacao' as ViewType, label: 'Roteirização', icon: 'route', fillIcon: false },
    { view: 'finalizacao' as ViewType, label: 'Finalização Corrente', icon: 'receipt_long', fillIcon: false },
    { view: 'desempenho' as ViewType, label: 'Desempenho', icon: 'assessment', fillIcon: false },
    { view: 'solucao' as ViewType, label: 'Problemas de Entrega', icon: 'report_problem', fillIcon: false },
    { view: 'clientes' as ViewType, label: 'Clientes Críticos', icon: 'gpp_bad', fillIcon: false },
    { view: 'configuracoes' as ViewType, label: 'Configurações', icon: 'settings', fillIcon: false },
  ];

  return (
    <>
      {/* Dark overlay backdrop - hidden on desktop */}
      <div
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[45] transition-all duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <nav
        className={`fixed left-0 top-0 h-full bg-surface-container-low border-r border-outline-variant flex flex-col p-4 md:px-3 md:py-6 hover:md:px-5 overflow-y-auto overflow-x-hidden z-50 transition-all duration-300 ease-out transform group ${
          isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]'
        } md:translate-x-0 md:w-[72px] hover:md:w-[280px]`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-3 mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(77,142,255,0.2)]">
              <span 
                className="material-symbols-outlined text-on-primary-container animate-pulse-slow" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                explore
              </span>
            </div>
            <div className="text-left select-none transition-all duration-300 opacity-100 md:opacity-0 group-hover:md:opacity-100 md:w-0 group-hover:md:w-auto overflow-hidden whitespace-nowrap">
              <h1 className="text-base font-bold text-primary tracking-tight leading-none">
                RotaOperational
              </h1>
              <p className="text-[10px] font-mono mt-1 text-on-surface-variant uppercase tracking-wider">
                Logistics Control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-white transition-all cursor-pointer flex items-center justify-center md:hidden shrink-0"
            title="Fechar menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <ul className="flex flex-col gap-1 flex-grow">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => {
                    onViewChange(item.view);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'bg-surface-container-highest text-primary font-bold shadow-[inset_2px_0_0_currentColor]'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span
                    className="material-symbols-outlined select-none text-[20px] shrink-0"
                    style={
                      item.fillIcon && isActive
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs font-sans transition-all duration-300 opacity-100 md:opacity-0 group-hover:md:opacity-100 md:w-0 group-hover:md:w-auto overflow-hidden whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* System Administrator / User Footer Profile */}
        <div className="mt-auto pt-4 border-t border-outline-variant/40 shrink-0">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-surface-container transition-colors duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8.5 h-8.5 rounded-full bg-surface-bright flex items-center justify-center overflow-hidden border border-outline-variant shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant select-none text-[20px]">
                  person
                </span>
              </div>
              <div className="text-left min-w-0 leading-normal transition-all duration-300 opacity-100 md:opacity-0 group-hover:md:opacity-100 md:w-0 group-hover:md:w-auto overflow-hidden whitespace-nowrap">
                <p className="text-xs font-semibold text-on-surface truncate">{adminName}</p>
                <p className="text-[9px] font-mono text-on-surface-variant truncate">{adminRole}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              title="Encerrar Sessão"
              className="p-1 rounded-md hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-all duration-300 cursor-pointer shrink-0 opacity-100 md:opacity-0 group-hover:md:opacity-100 md:w-0 group-hover:md:w-8 overflow-hidden"
            >
              <span className="material-symbols-outlined text-[16px] select-none">logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
