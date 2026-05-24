import { useState } from 'react';

interface DashboardProps {
  onNavigateToView: (view: 'importacao' | 'frota' | 'roteirizacao') => void;
  searchValue: string;
}

export default function DashboardView({ onNavigateToView, searchValue }: DashboardProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Multipliers based on period
  const mult = period === 'today' ? 1 : period === 'week' ? 5.8 : 24.5;

  const kpis = {
    volume: { peso: (45.2 * mult).toFixed(1), volume: Math.round(120 * mult) },
    entregas: { realizadas: Math.round(85 * mult), remanescentes: Math.round(15 * mult) },
    faturamento: Math.round(125400 * mult),
    ocupacao: period === 'today' ? 82 : period === 'week' ? 87 : 78,
    custo: period === 'today' ? 6.8 : period === 'week' ? 7.1 : 6.5,
  };

  const sectors = [
    {
      name: 'Setor Sul',
      curva: 'Curva A',
      curvaColor: 'bg-primary/20 text-primary-fixed-dim border-primary/30',
      weight: '12.4t',
      weightPct: 75,
      ctrc: 42,
      ctrcPct: 60,
    },
    {
      name: 'Rota 01',
      curva: 'Curva B',
      curvaColor: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
      weight: '8.1t',
      weightPct: 45,
      ctrc: 28,
      ctrcPct: 40,
    },
    {
      name: 'Zila Leste',
      curva: 'Curva C',
      curvaColor: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
      weight: '3.2t',
      weightPct: 20,
      ctrc: 15,
      ctrcPct: 25,
    },
  ];

  const filteredSectors = sectors.filter(
    (s) =>
      s.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.curva.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header controls */}
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">Mission Control</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Métricas operacionais em tempo real e dominância de setores de entrega.
          </p>
        </div>
        
        {/* Toggle Period and Export button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 inline-flex">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                period === 'today'
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                period === 'week'
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                period === 'month'
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mês
            </button>
          </div>

          <button 
            onClick={() => alert(`Relatório operacional (${period.toUpperCase()}) exportado com sucesso em XLSX!`)}
            className="px-4 py-2 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* KPI 1: Volume/Peso Total */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col justify-between group relative overflow-hidden transition-all hover:border-outline duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider">
              Volume/Peso Total
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              open_in_full
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              {kpis.volume.peso} <span className="text-xs text-on-surface-variant font-normal">ton</span>
            </div>
            <div className="text-sm font-semibold text-on-surface mt-1 border-t border-outline-variant pt-1.5">
              {kpis.volume.volume} <span className="text-xs text-on-surface-variant font-normal">m³</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-highest">
            <div className="h-full bg-primary" style={{ width: '65%' }}></div>
          </div>
        </div>

        {/* KPI 2: Entregas */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col justify-between group overflow-hidden transition-all hover:border-outline duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider">
              Entregas
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              open_in_full
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-tertiary">{kpis.entregas.realizadas}</span>
              <span className="text-xs text-on-surface-variant">realizadas</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-sm font-semibold text-on-surface">{kpis.entregas.remanescentes}</span>
              <span className="text-xs text-on-surface-variant">remanescentes</span>
            </div>
          </div>
          <div className="w-full flex h-1.5 rounded-full overflow-hidden mt-4 bg-surface-container-highest">
            <div className="bg-tertiary" style={{ width: '85%' }}></div>
            <div className="bg-surface-bright" style={{ width: '15%' }}></div>
          </div>
        </div>

        {/* KPI 3: Faturamento Provisório */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col justify-between group overflow-hidden transition-all hover:border-outline duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider">
              Faturamento Prev.
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              open_in_full
            </span>
          </div>
          <div>
            <span className="text-xs text-on-surface-variant font-semibold mr-1">R$</span>
            <span className="text-2xl font-bold text-on-surface">
              {kpis.faturamento.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-on-surface-variant font-normal">,00</span>
          </div>
          <div className="flex items-center gap-1 mt-3 text-tertiary text-xs font-mono bg-tertiary-container/10 w-fit px-2 py-0.5 rounded-sm">
            <span className="material-symbols-outlined text-[13px]">trending_up</span>
            +4.2% vs last
          </div>
        </div>

        {/* KPI 4: Ocupação da Frota */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col justify-between group items-center relative overflow-hidden transition-all hover:border-outline duration-300">
          <span className="material-symbols-outlined absolute top-4 right-4 text-on-surface-variant text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            open_in_full
          </span>
          <span className="text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider w-full text-left">
            Ocupação da Frota
          </span>
          <div className="relative w-20 h-20 flex items-center justify-center mt-2">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-highest stroke-current"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3.2"
              ></path>
              <path
                className="text-primary-fixed-dim stroke-current"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeDasharray={`${kpis.ocupacao}, 100`}
                strokeWidth="3.2"
              ></path>
            </svg>
            <span className="absolute font-sans font-bold text-lg text-on-surface">
              {kpis.ocupacao}<span className="text-xs text-on-surface-variant">%</span>
            </span>
          </div>
        </div>

        {/* KPI 5: Custo vs Receita */}
        <div className="bg-surface-container rounded-xl border border-outline-variant p-4 flex flex-col justify-between group overflow-hidden transition-all hover:border-outline duration-300">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider">
              Custo vs Receita
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              open_in_full
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <span className="text-xs text-on-surface-variant">Realizado</span>
              <span className="text-lg font-bold text-tertiary-fixed-dim">{kpis.custo}%</span>
            </div>
            <div className="flex justify-between items-end border-t border-outline-variant pt-2">
              <span className="text-xs text-on-surface-variant">Meta teto</span>
              <span className="text-xs font-semibold text-on-surface">7.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Sectors (Bottom segment) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left main grid of sectors inside (spans 8) */}
        <div className="lg:col-span-8 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
              <h3 className="text-base font-bold text-on-surface">Bento Grid de Setores</h3>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-on-surface cursor-pointer select-none">
              more_horiz
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredSectors.map((sector) => (
              <div
                key={sector.name}
                className="bg-surface p-4 rounded-lg border border-outline-variant hover:border-outline transition-colors duration-200 cursor-default"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-on-surface">{sector.name}</span>
                  <span className={`px-2 py-0.5 rounded-sm border text-[9px] font-mono font-medium ${sector.curvaColor}`}>
                    {sector.curva}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-on-surface-variant mb-1.5">
                      <span>Pending Weight</span>
                      <span className="text-on-surface font-semibold">{sector.weight}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${sector.weightPct}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-on-surface-variant mb-1.5">
                      <span>CTRC Count</span>
                      <span className="text-on-surface font-semibold">{sector.ctrc}</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: `${sector.ctrcPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredSectors.length === 0 && (
              <div className="col-span-3 text-center py-8 text-on-surface-variant">
                Nenhum setor encontrado correspondente à pesquisa.
              </div>
            )}
          </div>

          {/* Prompt action to proceed */}
          <div className="mt-2 bg-surface p-3.5 rounded-lg border border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <p className="text-xs font-semibold text-on-surface">Importação de Manifestos Disponível</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Faça upload de novos arquivos CSV para atualizar a listagem e os pesos setoriais automaticamente.
              </p>
            </div>
            <button
              onClick={() => onNavigateToView('importacao')}
              className="text-xs font-bold text-primary hover:text-primary-container inline-flex items-center gap-1 shrink-0"
            >
              Mapear CSV
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right card: Curva A Dominance (spans 4) */}
        <div className="lg:col-span-4 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-tertiary tracking-normal select-none">stars</span>
              <h3 className="text-xs tracking-wider uppercase font-mono font-bold text-on-surface-variant">
                Curva A Dominance
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
              Sectores de alta performance que contribuem com mais de 70% da receita total deste ciclo.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant text-primary font-mono text-xs font-bold shrink-0">
                  S
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-on-surface mb-1">
                    <span>Setor Sul</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant text-secondary font-mono text-xs font-bold shrink-0">
                  N
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-on-surface mb-1">
                    <span>Setor Norte</span>
                    <span className="font-bold font-mono">28%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: '28%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 relative z-10">
            <button 
              onClick={() => onNavigateToView('roteirizacao')}
              className="w-full py-2 bg-surface text-xs font-bold text-on-surface border border-outline-variant rounded-lg hover:bg-surface-bright transition-colors flex items-center justify-center gap-2"
            >
              Iniciar Roteirização
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
