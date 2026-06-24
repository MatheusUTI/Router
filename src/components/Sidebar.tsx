import { useState } from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  adminName: string;
  adminRole: string;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isSessionUnlocked?: boolean;
}

export default function Sidebar({
  currentView,
  onViewChange,
  adminName,
  adminRole,
  onLogout,
  isOpen,
  onClose,
  isSessionUnlocked = false,
}: SidebarProps) {
  const [adminGroupExpanded, setAdminGroupExpanded] = useState(true);

  // Operação views
  const operationItems = [
    { view: 'dashboard' as ViewType, label: 'Painel Central', icon: 'dashboard', fillIcon: true },
    { view: 'importacao' as ViewType, label: 'Importação CSV', icon: 'upload_file', fillIcon: true },
    { view: 'roteirizacao' as ViewType, label: 'Roteirização', icon: 'route', fillIcon: false },
    { view: 'finalizacao' as ViewType, label: 'Programação do Dia', icon: 'assignment', fillIcon: false },
    { view: 'cidades_rotas' as ViewType, label: 'Rotas / Cidades', icon: 'map', fillIcon: false },
    { view: 'ctrcs_ssw' as ViewType, label: 'CTRCs / Consulta SSW', icon: 'find_in_page', fillIcon: false },
  ];

  // Administração views grouped by the specified RF05 sub-menus
  const adminCategories = [
    {
      groupLabel: 'Cadastros',
      items: [
        { view: 'frota' as ViewType, label: 'Frota & Motoristas', icon: 'local_shipping', fillIcon: true }
      ]
    },
    {
      groupLabel: 'Regras de Negócio',
      items: [
        { view: 'curva_a' as ViewType, label: 'Curva A', icon: 'analytics', fillIcon: false },
        { view: 'ocorrencias' as ViewType, label: 'Ocorrências', icon: 'warning', fillIcon: false },
        { view: 'clientes' as ViewType, label: 'Clientes Especiais', icon: 'folder_shared', fillIcon: false },
        { view: 'regras_gr' as ViewType, label: 'Regras de GR', icon: 'security', fillIcon: false }
      ]
    },
    {
      groupLabel: 'Integrações',
      items: [
        { view: 'configuracoes' as ViewType, label: 'Sincronia / Cloud', icon: 'settings', fillIcon: false }
      ]
    },
    {
      groupLabel: 'Auditoria / Logs',
      items: [
        { view: 'desempenho' as ViewType, label: 'Desempenho KPI', icon: 'assessment', fillIcon: false },
        { view: 'solucao' as ViewType, label: 'Problemas de Rua', icon: 'report_problem', fillIcon: false }
      ]
    },
    {
      groupLabel: 'Sistema / Banco',
      items: [
        { view: 'base_dados' as ViewType, label: 'Base de Dados', icon: 'database', fillIcon: true }
      ]
    }
  ];

  const renderItem = (item: any, isAdm: boolean = false) => {
    const isActive = currentView === item.view;
    return (
      <li key={item.view}>
        <button
          onClick={() => {
            onViewChange(item.view);
            onClose();
          }}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
            isActive
              ? 'bg-surface-container-highest text-primary font-bold shadow-[inset_2px_0_0_currentColor]'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="material-symbols-outlined select-none text-[18px] shrink-0"
              style={
                item.fillIcon && isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className="text-xs font-sans transition-all duration-300 opacity-100 md:opacity-0 group-hover:md:opacity-100 md:w-0 group-hover:md:w-auto overflow-hidden whitespace-nowrap truncate">
              {item.label}
            </span>
          </div>

          {/* Secure lock badge for Admin items when locked */}
          {isAdm && !isSessionUnlocked && (
            <span className="material-symbols-outlined text-[13px] text-amber-500/70 select-none shrink-0 transition-all duration-300 opacity-100 md:opacity-0 group-hover:md:opacity-100">
              lock
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <>
      {/* Dark overlay backdrop - hidden on desktop */}
      <div
        className={`fixed inset-0 bg-[var(--router-surface-3)]/80 backdrop-blur-sm z-[45] transition-all duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <nav
        className={`fixed left-0 top-0 h-full router-sidebar flex flex-col p-4 md:px-3 md:py-6 hover:md:px-5 overflow-y-auto overflow-x-hidden z-50 transition-all duration-300 ease-out transform group ${
          isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]'
        } md:translate-x-0 md:w-[72px] hover:md:w-[280px]`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-3 mb-6 shrink-0">
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
        <div className="flex-grow flex flex-col gap-5 overflow-y-auto overflow-x-hidden scrollbar-none pb-4">
          
          {/* Section: Operação */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-2 px-3 md:hidden group-hover:md:block">
              Operação
            </p>
            <ul className="flex flex-col gap-1">
              {operationItems.map(item => renderItem(item, false))}
            </ul>
          </div>

          {/* Section: Administração (Collapsible & Secure) */}
          <div className="border-t border-outline-variant/30 pt-4 space-y-1.5">
            <button
              onClick={() => setAdminGroupExpanded(!adminGroupExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-2 px-3 hover:text-amber-400 transition-colors cursor-pointer select-none md:hidden group-hover:md:flex"
            >
              <span className="flex items-center gap-1.5">
                <span>Administração</span>
                {!isSessionUnlocked && (
                  <span className="material-symbols-outlined text-[12px] text-amber-500">lock</span>
                )}
              </span>
              <span className="material-symbols-outlined text-[14px]">
                {adminGroupExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
              </span>
            </button>

            {/* If sidebar is collapsed on desktop, we show admin items. Otherwise, we respect expansion */}
            <div className={`${adminGroupExpanded ? 'block' : 'hidden md:block group-hover:md:hidden'} space-y-3`}>
              {adminCategories.map((group) => (
                <div key={group.groupLabel} className="space-y-1">
                  {/* Sub-menu title */}
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-on-surface-variant/40 px-3 md:hidden group-hover:md:block">
                    {group.groupLabel}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map(item => renderItem(item, true))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        </div>

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
