import { useState, FormEvent } from 'react';
import { Ctrc, Expense, Vehicle } from '../types';

interface FinalizacaoViewProps {
  linkedCtrcs: Ctrc[];
  onUpdateCtrcStatus: (id: string, status: 'Pendente' | 'Entregue' | 'Recusado') => void;
  expenses: Expense[];
  onAddExpense: (exp: Expense) => void;
  onRemoveExpense: (id: string) => void;
  onCloseRomaneio: () => void;
  activeVehicle?: Vehicle;
}

export default function FinalizacaoView({
  linkedCtrcs,
  onUpdateCtrcStatus,
  expenses,
  onAddExpense,
  onRemoveExpense,
  onCloseRomaneio,
  activeVehicle,
}: FinalizacaoViewProps) {
  const [descInput, setDescInput] = useState('');
  const [valInput, setValInput] = useState<number>(0);
  const [successFinish, setSuccessFinish] = useState<string | null>(null);

  // Print checklist states
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [helperName, setHelperName] = useState<string>('NAWYTER');
  const [manifestId, setManifestId] = useState<string>('8492');
  const [manifestDate, setManifestDate] = useState<string>('23/05/26');
  const [observations, setObservations] = useState<string>('');

  const handleAddCost = (e: FormEvent) => {
    e.preventDefault();
    if (!descInput.trim() || valInput <= 0) {
      alert("Por favor, informe uma descrição válida e valor maior que zero.");
      return;
    }

    onAddExpense({
      id: `exp-${Date.now()}`,
      description: descInput,
      value: valInput,
    });

    setDescInput('');
    setValInput(0);
  };

  // Profit calculations based on loaded cargo
  const grossRevenue = 12500; // Fixed structural value based on payload
  const operatingCosts = expenses.reduce((acc, exp) => acc + exp.value, 0);
  const netProfit = grossRevenue - operatingCosts;
  const marginPct = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  const handleFinishedAll = () => {
    if (linkedCtrcs.some((c) => c.status === 'Pendente')) {
      alert("Existem CTRCs pendentes de atualização de Entrega/Recusa. Altere o status delas na lista antes de enviar para arquivo.");
      return;
    }
    
    onCloseRomaneio();
    setSuccessFinish("Faturamento auditado e encerrado! Romaneio gravado no arquivo histórico com margem liquida de " + marginPct + "%.");
  };

  const totalCtrcs = linkedCtrcs.length;
  const totalVolumes = linkedCtrcs.reduce((acc, c) => acc + c.volume, 0);

  // RENDER PRINT CHECKLIST SEPARATION POPUP
  if (showPrintPreview) {
    return (
      <div className="fixed inset-0 bg-slate-950/95 z-[999] overflow-y-auto p-4 md:p-8 flex flex-col items-center select-none print:p-0 print:bg-white text-gray-900">
        
        {/* Document Action utility bar (Hides on standard paper printout) */}
        <div className="w-full max-w-[210mm] bg-[#161d30] border border-outline-variant p-4 rounded-t-2xl flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden shadow-2xl">
          <div className="text-left space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[20px]">print</span>
              Visualização de Checklist de Separação de Carga
            </h3>
            <p className="text-[11px] text-[#9cb4e4] max-w-md">
              Mude os campos pontilhados diretamente na folha para editar ajudantes, observações e data antes de submeter ao conferente físico.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 bg-primary hover:bg-[#4d8eff] text-white text-xs font-bold rounded-lg transition-transform active:scale-[0.98] flex items-center gap-1.5 shadow"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Imprimir Documento
            </button>
            <button
              onClick={() => setShowPrintPreview(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#dae2fd] border border-slate-700 text-xs font-bold rounded-lg transition-all"
            >
              Voltar ao Fluxo
            </button>
          </div>
        </div>

        {/* PRINT PAPER BLOCK CONTAINER (A4 size dimensions standard matching 210mm width) */}
        <div className="w-full max-w-[210mm] bg-white text-gray-900 p-6 md:p-[15mm] shadow-2xl rounded-b-2xl md:rounded-none min-h-[297mm] text-sm text-left flex flex-col justify-between print:shadow-none print:p-0 print:w-full print:min-h-0 print:bg-white">
          <div>
            {/* Header Section */}
            <header className="mb-8 select-none">
              <div className="flex justify-between items-end border-b-2 border-gray-300 pb-4">
                <div>
                  <div className="text-blue-600 font-bold text-xl mb-2 italic tracking-tighter">
                    <span className="text-2xl font-bold">O</span>perational<span className="text-blue-400">Rota</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Checklist de Separação:</h1>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-gray-800">Manifesto #</span>
                      <input
                        type="text"
                        value={manifestId}
                        onChange={(e) => setManifestId(e.target.value)}
                        className="border-b border-dashed border-gray-400 focus:border-gray-800 hover:border-gray-700 focus:outline-none text-xl font-bold text-gray-800 p-0 w-16 bg-transparent text-center font-mono print:hidden"
                        placeholder="8492"
                      />
                      <span className="hidden print:inline text-xl font-bold text-gray-800 font-mono">{manifestId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-gray-600 text-xs font-medium space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    <span>Data:</span>
                    <input
                      type="text"
                      value={manifestDate}
                      onChange={(e) => setManifestDate(e.target.value)}
                      className="border-b border-dashed border-gray-400 focus:outline-none text-xs text-gray-600 p-0 w-20 bg-transparent text-right print:hidden"
                    />
                    <span className="hidden print:inline">{manifestDate}</span>
                  </div>
                  <p className="mr-0.5">Página: 1/1</p>
                </div>
              </div>

              {/* Personnel Info Layout */}
              <div className="flex mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="w-1/2">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Motorista</span>
                  <span className="font-semibold text-gray-800 text-sm md:text-base">
                    {activeVehicle?.driverName || "HIAN THAYRON SOARES DE OLIVEIRA"}
                  </span>
                </div>
                <div className="w-1/4">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Veículo (Placa)</span>
                  <span className="font-mono font-semibold text-gray-800 text-sm md:text-base uppercase">
                    {activeVehicle?.id || "RUE3B11"}
                  </span>
                </div>
                <div className="w-1/4">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">Ajudante</span>
                  <input
                    type="text"
                    value={helperName}
                    onChange={(e) => setHelperName(e.target.value)}
                    className="border-b border-dashed border-gray-400 focus:border-gray-800 focus:outline-none font-semibold text-gray-800 text-sm md:text-base p-0 w-full bg-transparent print:hidden"
                    placeholder="Nome do ajudante"
                  />
                  <span className="hidden print:inline font-semibold text-gray-800 text-sm md:text-base">{helperName}</span>
                </div>
              </div>
            </header>

            {/* Table Header Row */}
            <div className="border-b-2 border-gray-300 flex font-semibold text-gray-700 pb-2 mb-4 text-[10px] uppercase tracking-wider">
              <div className="w-[8%] text-center">Check</div>
              <div className="w-[15%]">CTRC</div>
              <div className="w-[35%]">Destinatário</div>
              <div className="w-[25%]">Bairro / Cidade</div>
              <div className="w-[17%] text-right">Volume (Qtd)</div>
            </div>

            {/* Table Data list of romaneio cargoes */}
            <main className="text-xs space-y-0 text-left">
              {linkedCtrcs.map((ctrc, index) => (
                <div
                  key={ctrc.id || index}
                  className="flex items-center border-b border-gray-200 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-[8%] flex justify-center">
                    <div className="w-5 h-5 border-2 border-gray-400 rounded-sm bg-white flex items-center justify-center shrink-0 cursor-pointer" />
                  </div>
                  <div className="w-[15%] font-mono text-gray-600 font-semibold">{ctrc.id}</div>
                  <div className="w-[35%] pr-2">
                    <div className="font-bold text-gray-900 leading-tight truncate">{ctrc.destinatario}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Endereço de Destinatário Integrado</div>
                  </div>
                  <div className="w-[25%] text-gray-700">
                    <div className="font-semibold truncate">{ctrc.cidade.split(',')[0]}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{ctrc.cidade.split(',')[1] || 'MG'}</div>
                  </div>
                  <div className="w-[17%] text-right font-bold text-base text-gray-800 font-mono">
                    {ctrc.volume} vol.
                  </div>
                </div>
              ))}

              {linkedCtrcs.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  Nenhum conhecimento de transporte (CTRC) foi carregado neste Manifesto.
                </div>
              )}
            </main>

            {/* Footer Totals Banner */}
            <div className="mt-6 flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100 mb-8">
              <div className="text-blue-800 font-semibold text-xs md:text-sm">
                Total de Entregas: {totalCtrcs}
              </div>
              <div className="text-blue-800 font-semibold text-sm md:text-base font-mono">
                Total de Volumes: {totalVolumes}
              </div>
            </div>
          </div>

          <div>
            {/* Observations field */}
            <div className="mt-4">
              <h3 className="text-xs text-gray-500 uppercase font-semibold mb-2">Observações</h3>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="border border-gray-300 rounded-lg h-24 w-full p-3 text-xs italic text-gray-700 bg-gray-50/20 focus:outline-none focus:border-blue-500 resize-none print:hidden shadow-inner"
                placeholder="Anote aqui ocorrências, divergências em CTRCs ou volumes..."
              />
              <div className="hidden print:block border border-gray-300 rounded-lg p-3 text-xs text-gray-700 italic min-h-[4rem] text-left">
                {observations ? observations : "Anote aqui ocorrências, divergências em CTRCs ou volumes..."}
              </div>
            </div>

            {/* Signatures zone */}
            <div className="flex justify-between mt-12 pt-6 border-t border-gray-200">
              <div className="w-full sm:w-[45%] text-center ml-auto">
                <div className="border-b border-gray-400 mb-2 h-8"></div>
                <span className="text-xs font-semibold text-gray-700">Conferente</span>
              </div>
            </div>

            {/* Print friendly blessing note */}
            <div className="mt-12 text-center text-gray-500 italic font-semibold text-sm md:text-base">
              Boa viagem e boa entrega! 🚚
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-3xl font-bold text-on-surface tracking-tight">Finalização de Romaneio</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Fechamento financeiro, atualização de manifestos de descarga e rateio final de despesas de viagem de frota.
        </p>
      </div>

      {successFinish && (
        <div className="bg-tertiary-container/10 border border-tertiary/20 text-tertiary p-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">verified</span>
          <div>
            <p className="text-xs font-semibold">Manifesto Concluído</p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">{successFinish}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Deliveries Update Checklist (spans 7) */}
        <div className="lg:col-span-7 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              Checklist de Descarga de CTRCs {linkedCtrcs.length > 0 && `(${linkedCtrcs.length})`}
            </h3>
            
            <div className="flex items-center gap-2">
              {linkedCtrcs.length > 0 && (
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Imprimir Checklist de Separação de Carga"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimir Separação
                </button>
              )}
              <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded border border-outline-variant/40">
                Operação de Doca
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {linkedCtrcs.map((ctrc) => {
              const statusColors =
                ctrc.status === 'Entregue'
                  ? 'bg-tertiary/25 text-tertiary border-tertiary/20'
                  : ctrc.status === 'Recusado'
                  ? 'bg-error/25 text-[#ffb4ab] border-error/20'
                  : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/40';

              return (
                <div
                  key={ctrc.id}
                  className="bg-surface p-4 rounded-xl border border-outline-variant/60 hover:border-outline transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold font-mono text-primary">{ctrc.id}</p>
                    <p className="text-xs font-bold text-on-surface truncate">{ctrc.destinatario}</p>
                    <p className="text-[11px] text-on-surface-variant font-mono">{ctrc.cidade}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status updater dropdown buttons */}
                    <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/40 gap-1">
                      <button
                        onClick={() => onUpdateCtrcStatus(ctrc.id, 'Entregue')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                          ctrc.status === 'Entregue'
                            ? 'bg-tertiary text-on-tertiary shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Entregue
                      </button>
                      <button
                        onClick={() => onUpdateCtrcStatus(ctrc.id, 'Recusado')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                          ctrc.status === 'Recusado'
                            ? 'bg-[#93000a] text-on-error shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Recusado
                      </button>
                      <button
                        onClick={() => onUpdateCtrcStatus(ctrc.id, 'Pendente')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                          ctrc.status === 'Pendente'
                            ? 'bg-surface-container-highest text-on-surface'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Pendente
                      </button>
                    </div>

                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold min-w-[70px] text-center ${statusColors}`}>
                      {ctrc.status}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {linkedCtrcs.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant bg-surface rounded-xl border border-dashed border-outline-variant">
                <span className="material-symbols-outlined text-[42px] mb-3 text-on-surface-variant/40">
                  receipt_long
                </span>
                <p className="text-xs font-semibold">Nenhum romaneio em processo de finalização.</p>
                <p className="text-[10px] text-on-surface-variant/70 mt-1 max-w-sm mx-auto">
                  Vá até o painel de **Roteirização** e vincule CTRCs a um veículo para obter o balanço operacional do romaneio.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Expenses and Balance calculations (spans 5) */}
        <div className="lg:col-span-5 bg-surface-container rounded-xl border border-outline-variant p-5 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/40 pb-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
              Centro de Despesas de Viagem (Custos)
            </h3>

            {/* List of current expenses */}
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-surface p-3 rounded-lg border border-outline-variant/50 flex justify-between items-center"
                >
                  <div>
                    <p className="text-xs font-semibold text-on-surface">{exp.description}</p>
                    <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">Identificador Integrado</p>
                  </div>
                  <div className="flex items-center gap-2.5 font-mono text-xs">
                    <span className="font-bold text-[#ffb4ab]">R$ {exp.value.toFixed(2)}</span>
                    <button
                      onClick={() => onRemoveExpense(exp.id)}
                      className="text-on-surface-variant hover:text-error hover:bg-surface-bright p-1 rounded"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-xs italic text-on-surface-variant text-center py-4 bg-surface rounded-lg border border-outline-variant/30">
                  Nenhuma despesa extra declarada até o momento.
                </p>
              )}
            </div>

            {/* Add extra expenses form inline */}
            <form onSubmit={handleAddCost} className="bg-surface p-3 rounded-xl border border-outline-variant space-y-3">
              <p className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase font-mono">
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                Registrar Despesa Reembolsável
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Ex: Borracharia BR-116"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="bg-surface px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary placeholder-on-surface-variant/70"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 85.50"
                  value={valInput || ''}
                  onChange={(e) => setValInput(parseFloat(e.target.value) || 0)}
                  className="bg-surface px-2.5 py-1.5 rounded-lg border border-outline-variant font-mono text-xs text-on-surface focus:outline-none focus:border-primary placeholder-on-surface-variant/70"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-primary hover:bg-primary-fixed text-on-primary font-sans text-xs font-bold rounded-lg transition-transform active:scale-[0.98] shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  + Registrar Custo
                </button>
              </div>
            </form>

            <div className="h-px bg-outline-variant/30"></div>

            {/* Balanced summary calculation results */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Faturamento Bruto Previsto:</span>
                <span className="font-mono text-on-surface font-semibold">
                  R$ {grossRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Custos Operacionais Extra:</span>
                <span className="font-mono text-error font-semibold">
                  - R$ {operatingCosts.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-outline-variant/40 pt-2.5 font-bold">
                <span className="text-on-surface text-sm">Margem Líquida Estimada:</span>
                <span className="font-mono text-tertiary text-sm">
                  R$ {netProfit.toFixed(2)} ({marginPct}%)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/40 mt-5">
            <button
              onClick={handleFinishedAll}
              disabled={linkedCtrcs.length === 0}
              className={`w-full py-2.5 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all ${
                linkedCtrcs.length === 0
                  ? 'bg-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-fixed text-on-primary shadow-md active:scale-[0.99]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              Encerrar e Fechar Faturamento de Rota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
