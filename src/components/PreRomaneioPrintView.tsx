import React from 'react';
import { Ctrc, CurvaAClient } from '../types';
import { isClienteCurvaA } from './roteirizacao/helpers/isClienteCurvaA';

export interface PreRomaneioPrintViewProps {
  preRomaneios: any[]; // List of PreRomaneio
  curvaAClients: CurvaAClient[];
  resolvedCtrcsMap: Record<string, Ctrc>;
}

export function PreRomaneioPrintView({ preRomaneios, curvaAClients, resolvedCtrcsMap }: PreRomaneioPrintViewProps) {
  
  const formatPlanningDate = (dateStr: string) => {
    if (!dateStr) return 'SEM DATA';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatRouteText = (routeStr: string) => {
    if (!routeStr) return '';
    const match = routeStr.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10).toString();
    }
    return routeStr.toUpperCase().replace('ROTA', '').trim();
  };

  return (
    <div className="hidden print:block print-area w-full text-black bg-white text-left font-sans p-0 m-0">
      {preRomaneios.map((pr, pIdx) => {
        const isLast = pIdx === preRomaneios.length - 1;

        const ctrcsList = (pr.ctrcIds || [])
          .map((id: string) => resolvedCtrcsMap[id])
          .filter(Boolean);

        const sortedCtrcs = [...ctrcsList].sort((a, b) => {
          // 1. Cidade
          const cityA = (a.cidade_ent || a.cidade || '').toUpperCase().trim();
          const cityB = (b.cidade_ent || b.cidade || '').toUpperCase().trim();
          if (cityA !== cityB) return cityA.localeCompare(cityB, 'pt-BR');

          // 2. Bairro
          const bA = (a.bairro || '').toUpperCase().trim();
          const bB = (b.bairro || '').toUpperCase().trim();
          if (bA !== bB) return bA.localeCompare(bB, 'pt-BR');

          // 3. Destinatário
          const destA = (a.destinatario || '').toUpperCase().trim();
          const destB = (b.destinatario || '').toUpperCase().trim();
          if (destA !== destB) return destA.localeCompare(destB, 'pt-BR');

          // 4. CTRC ID
          const idA = (a.id || '').toUpperCase().trim();
          const idB = (b.id || '').toUpperCase().trim();
          return idA.localeCompare(idB, 'pt-BR');
        });

        return (
          <div key={pr.id} className={`w-full min-h-screen ${isLast ? '' : 'page-break'} pb-6 leading-tight bg-white text-black`}>
            
            {/* CABEÇALHO */}
            <h1 className="text-xl font-bold text-center uppercase mb-2 text-black">
              PRÉ-ROMANEIO ROTA {formatRouteText(pr.route).padStart(2, '0')} - {formatPlanningDate(pr.planningDate)}
            </h1>

            {/* FAIXA AZUL IDENTIFICAÇÃO (in print, we can use a light blue background, it prints as light gray or blue if color enabled) */}
            <div className="border-2 border-black bg-blue-50 p-2 mb-3 font-sans text-black">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-base font-bold uppercase">ROTA: {formatRouteText(pr.route)}</div>
                  <div className="text-sm font-bold uppercase mt-1">
                    Placa: {pr.vehiclePlate ? pr.vehiclePlate.toUpperCase() : 'NÃO INFORMADA'}
                  </div>
                  <div className="text-sm font-bold uppercase">
                    Motorista: {pr.driverName ? pr.driverName.toUpperCase() : 'NÃO ATRIBUÍDO'}
                  </div>
                  <div className="text-sm font-bold uppercase">
                    Ajud.: {pr.helperName ? pr.helperName.toUpperCase() : 'NÃO ATRIBUÍDO'}
                  </div>
                </div>
                
                <div className="text-right space-y-1 text-sm font-bold flex flex-col justify-start">
                  <div>Total CTRC: <span className="font-black text-black">{pr.ctrcIds.length}</span></div>
                  <div>Peso: <span className="font-black text-black">{pr.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</span></div>
                  <div>Qt vol.: <span className="font-black text-black">{String(pr.totalVolumes).padStart(4, '0')}</span></div>
                </div>
              </div>
              <div className="mt-2 text-xs font-black text-red-600 uppercase tracking-wider text-center border-t border-black/20 pt-1">
                * EM DESTAQUE OS CLIENTES CURVA A *
              </div>
            </div>

            {/* TABELA PRINCIPAL */}
            <table className="w-full text-[11px] text-left border-collapse table-fixed bg-white">
              <thead>
                <tr className="border-b-2 border-t-2 border-black uppercase font-bold text-black bg-gray-100">
                  <th className="px-1 py-1 w-[20%]">CTRC</th>
                  <th className="px-1 py-1 w-[12%]">NF</th>
                  <th className="px-1 py-1 w-[40%]">REMETENTE / DESTINATÁRIO</th>
                  <th className="px-1 py-1 w-[28%]">CIDADE / BAIRRO</th>
                </tr>
              </thead>
              {sortedCtrcs.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500 italic border-b border-black">
                      Nenhum documento eletrônico vinculado a este pré-romaneio.
                    </td>
                  </tr>
                </tbody>
              ) : (
                sortedCtrcs.map((ctrc, index) => {
                    const isCurvaA = isClienteCurvaA(ctrc, curvaAClients).isCurvaA;
                    const weight = (ctrc.peso_r || ctrc.weight || 0);
                    const vols = ctrc.volume || 0;
                    
                    const weightFormatted = weight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
                    const volsFormatted = String(vols).padStart(4, '0');
                    const prevEntStr = ctrc.prev_ent ? formatPlanningDate(ctrc.prev_ent) : '—';

                    const rowClass = isCurvaA ? 'text-red-700' : 'text-black';
                    const borderClass = isCurvaA ? 'border-red-500' : 'border-gray-300';
                    const mainTextClass = isCurvaA ? 'font-black text-red-700' : 'text-black';

                    return (
                      <tbody key={ctrc.id || index} style={{ pageBreakInside: 'avoid' }}>
                        {/* Linha 1 */}
                        <tr className={`${rowClass} ${isCurvaA ? 'bg-red-50/20' : ''}`}>
                          <td className="px-1 pt-2 align-top font-bold">
                            <div className="flex items-start gap-1">
                              <div className="w-3.5 h-3.5 border border-black inline-block mt-0.5 shrink-0 bg-white"></div>
                              <span className={mainTextClass}>{ctrc.id}</span>
                            </div>
                          </td>
                          <td className="px-1 pt-2 align-top">
                            {ctrc.nf || '—'}
                          </td>
                          <td className={`px-1 pt-2 align-top uppercase truncate ${mainTextClass}`}>
                            {isCurvaA ? `★ [CURVA A] ${ctrc.remetente || ''}` : ctrc.remetente || '—'}
                          </td>
                          <td className="px-1 pt-2 align-top uppercase truncate font-bold">
                            {(ctrc.cidade_ent || ctrc.cidade || '').toUpperCase()}
                          </td>
                        </tr>

                        {/* Linha 2 */}
                        <tr className={`${rowClass} ${isCurvaA ? 'bg-red-50/20' : ''}`}>
                          <td className="px-1 pb-0" colSpan={2}></td>
                          <td className={`px-1 pb-0 uppercase truncate ${mainTextClass}`}>
                            {ctrc.destinatario || '—'}
                          </td>
                          <td className="px-1 pb-0 uppercase truncate">
                            {ctrc.bairro || ''}
                          </td>
                        </tr>

                        {/* Linha Complementar */}
                        <tr className={`${rowClass} border-b ${borderClass} ${isCurvaA ? 'bg-red-50/20' : ''}`}>
                          <td className="px-1 pb-2" colSpan={2}></td>
                          <td className="px-1 pb-2 font-mono text-[10px] text-gray-700" colSpan={2}>
                            <div className="flex gap-4">
                              <span>Prev. Ent.: <strong className="text-black">{prevEntStr}</strong></span>
                              <span>QT VOL.: <strong className="text-black">{volsFormatted}</strong></span>
                              <span>Peso: <strong className="text-black">{weightFormatted}</strong></span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    );
                  })
              )}
            </table>

            {/* RODAPÉ CONFERÊNCIA */}
            <div className="border-2 border-black rounded p-3 mt-6 bg-white text-black font-sans break-inside-avoid">
              <h3 className="text-xs font-bold uppercase mb-4">
                CONFERÊNCIA INTERNA DE EXPEDIÇÃO:
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-xs">
                <div className="flex items-end gap-2">
                  <span className="font-bold shrink-0">Separador:</span>
                  <div className="border-b border-black flex-grow"></div>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="font-bold shrink-0">Conferente:</span>
                  <div className="border-b border-black flex-grow"></div>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="font-bold shrink-0">Horário início:</span>
                  <div className="border-b border-black w-24"></div>
                </div>
                
                <div className="flex items-end gap-2">
                  <span className="font-bold shrink-0">Horário fim:</span>
                  <div className="border-b border-black w-24"></div>
                </div>
              </div>
              
              <div className="mt-6">
                <span className="text-xs font-bold block mb-2">Observações / Divergências:</span>
                <div className="border-b border-black h-6 w-full mb-2"></div>
                <div className="border-b border-black h-6 w-full"></div>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
