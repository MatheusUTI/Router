import { useState } from 'react';
import { DriverScore } from '../types';

interface DesempenhoViewProps {
  drivers: DriverScore[];
  searchValue: string;
}

export default function DesempenhoView({ drivers, searchValue }: DesempenhoViewProps) {
  const [selectedDriver, setSelectedDriver] = useState<DriverScore>(drivers[0] || {} as DriverScore);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      d.bestRoute.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Relatório de Desempenho</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Monitoramento de produtividade, taxa de sucesso de entregas na primeira tentativa e score de condução defensiva.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Drivers list */}
        <div className="lg:col-span-7 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">family_history</span>
              Ficha Operacional de Condutores
            </h3>
            <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">Ciclo Corrente</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredDrivers.map((d) => {
              const isSelected = selectedDriver?.id === d.id;
              const statusColors =
                d.status === 'Excelente'
                  ? 'bg-tertiary/20 text-tertiary border-tertiary/10'
                  : d.status === 'Bom'
                  ? 'bg-primary/20 text-primary-fixed-dim border-primary/10'
                  : d.status === 'Regular'
                  ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30'
                  : 'bg-error/20 text-error border-error/10';

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDriver(d)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-surface-container-highest border-primary shadow-[inset_3px_0_0_#adc6ff]'
                      : 'bg-surface border-outline-variant/50 hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={d.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full border border-outline-variant object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-bold text-on-surface text-sm">{d.name}</p>
                      <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">{d.vehicle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                    <div className="text-right leading-tight">
                      <p className="text-xs text-on-surface-variant">Melhor Setor</p>
                      <p className="text-xs font-semibold text-on-surface mt-0.5">{d.bestRoute}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 min-w-[70px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColors}`}>
                        {d.status}
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">{d.score} pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant">
                Nenhum motorista correspondente à pesquisa.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Driver Details & Telemetry charts */}
        <div className="lg:col-span-5 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-5 justify-between relative overflow-hidden">
          {selectedDriver?.id ? (
            <>
              {/* Header Profile Info inside */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedDriver.avatar}
                    alt=""
                    className="w-14 h-14 rounded-full border-2 border-primary object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-on-surface leading-tight">{selectedDriver.name}</h3>
                    <p className="text-xs font-mono text-on-surface-variant mt-1">ID Cadastro: {selectedDriver.id}</p>
                  </div>
                </div>

                <div className="h-px bg-outline-variant/40"></div>

                {/* Score Dial & Detailed Indicators */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-on-surface mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[16px]">speed</span>
                        Score de Segurança Viária
                      </span>
                      <span className="text-primary font-mono">{selectedDriver.score}/100</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${selectedDriver.score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-surface p-3.5 rounded-lg border border-outline-variant/60">
                      <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                        Tempo Médio de Descarga
                      </p>
                      <p className="text-lg font-bold text-on-surface mt-1.5">
                        {selectedDriver.avgTime}{' '}
                        <span className="text-xs text-on-surface-variant font-normal">min/doca</span>
                      </p>
                    </div>

                    <div className="bg-surface p-3.5 rounded-lg border border-outline-variant/60">
                      <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                        Taxa de Sucesso (Janela)
                      </p>
                      <p className="text-lg font-bold text-tertiary mt-1.5">
                        {selectedDriver.successRate}%
                      </p>
                    </div>

                    <div className="bg-surface p-3.5 rounded-lg border border-outline-variant/60 col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                          Taxa de Reentradas
                        </p>
                        <p className="text-sm font-bold text-on-surface mt-1">
                          {selectedDriver.errorRate}%
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                        {selectedDriver.errorRate < 2 ? 'sentiment_satisfied' : 'sentiment_dissatisfied'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-outline-variant/40"></div>

                {/* Driver Awards / Training notes */}
                <div className="bg-surface p-3 rounded-lg border border-outline-variant/50">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-[16px]">military_tech</span>
                    Anotações de Governança
                  </p>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    {selectedDriver.score >= 90
                      ? 'Habilitado para transporte de alto valor (Curva A especial). Recompensa trimestral de condução eficiente em vigor.'
                      : selectedDriver.score >= 70
                      ? 'Nenhuma inadimplência de velocidade registrada nos últimos 30 dias. Ciclo de direção econômica agendado.'
                      : 'Alerta de produtividade emitido. Excesso de tempo de ociosidade em docas do Varejista Regional. Recomendável treinamento OP-02.'}
                  </p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => alert(`Avaliação de conduta de ${selectedDriver.name} enviada ao RH/Logística para arquivamento.`)}
                  className="w-full py-2.5 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.99] shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">assignment_ind</span>
                  Visualizar Registro de Telemetria Completo
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col justify-center items-center py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[42px] mb-3 text-on-surface-variant/40">
                badge
              </span>
              <p className="text-xs font-semibold">Nenhum motorista selecionado</p>
              <p className="text-[10px] mt-1 text-on-surface-variant/70">
                Clique em um registro operacional da tabela ao lado para ver a telemetria detalhada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
