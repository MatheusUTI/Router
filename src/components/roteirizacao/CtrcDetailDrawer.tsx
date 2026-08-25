import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Copy,
  Check,
  Truck,
  FileText,
  Clock,
  MapPin,
  Building,
  User,
  Phone,
  Package,
  DollarSign,
  Layers,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  Ssw101CtrcDetailDTO,
  Ssw101MatchItemDTO,
  Ssw101SearchResultDTO
} from '../../integrations/ssw/contracts/dtos';
import { Ssw101ClientService } from '../../services/ssw101ClientService';

interface CtrcDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ctrcId?: string;
  initialNf?: string;
  initialData?: Partial<Ssw101CtrcDetailDTO>;
}

export const CtrcDetailDrawer: React.FC<CtrcDetailDrawerProps> = ({
  isOpen,
  onClose,
  ctrcId,
  initialNf,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'nfs' | 'canhoto'>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Ssw101CtrcDetailDTO | null>(null);
  const [multipleResults, setMultipleResults] = useState<Ssw101MatchItemDTO[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<'CTRC' | 'NF'>('CTRC');

  // Carrega os dados do CTRC quando o drawer abre ou o CTRC muda
  useEffect(() => {
    if (isOpen) {
      if (ctrcId) {
        setSearchQuery(ctrcId);
        setSearchType('CTRC');
        fetchCtrcData(ctrcId, false);
      } else if (initialNf) {
        setSearchQuery(initialNf);
        setSearchType('NF');
        fetchNfData(initialNf, false);
      } else if (initialData && initialData.ctrc) {
        setDetail(initialData as Ssw101CtrcDetailDTO);
      }
    } else {
      setDetail(null);
      setMultipleResults(null);
      setError(null);
    }
  }, [isOpen, ctrcId, initialNf]);

  const fetchCtrcData = async (id: string, forceFresh: boolean = false) => {
    setLoading(true);
    setError(null);
    setMultipleResults(null);

    try {
      const res = await Ssw101ClientService.queryCtrc(id, forceFresh);
      if (res.success && res.found && res.detail) {
        setDetail(res.detail);
      } else if (res.multipleResults && res.items) {
        setMultipleResults(res.items);
      } else {
        setError(res.rawMessage || `Nenhum documento encontrado no SSW para o CTRC '${id}'.`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao consultar SSW 101.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNfData = async (nf: string, forceFresh: boolean = false) => {
    setLoading(true);
    setError(null);
    setMultipleResults(null);

    try {
      const res = await Ssw101ClientService.queryNf(nf, undefined, forceFresh);
      if (res.success && res.found && res.detail) {
        setDetail(res.detail);
      } else if (res.multipleResults && res.items) {
        setMultipleResults(res.items);
      } else {
        setError(res.rawMessage || `Nenhuma nota fiscal encontrada no SSW para '${nf}'.`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação ao consultar SSW 101.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchType === 'CTRC') {
      fetchCtrcData(searchQuery.trim(), true);
    } else {
      fetchNfData(searchQuery.trim(), true);
    }
  };

  const handleSelectMultipleItem = (item: Ssw101MatchItemDTO) => {
    fetchCtrcData(item.ctrc || item.numero, false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header Principal */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  {detail?.ctrc || ctrcId || 'Consulta SSW 101'}
                </h2>
                {detail?.fromCache && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                    <Database className="w-3 h-3" /> Cache
                  </span>
                )}
                {detail && !detail.fromCache && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Ao Vivo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Detalhamento analítico de frete, tracking e notas fiscais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detail && (
              <button
                onClick={() => fetchCtrcData(detail.ctrc || detail.numero, true)}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Forçar consulta atualizada no SSW"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                Atualizar ao Vivo
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Busca Manual Integrada */}
        <div className="p-3 bg-white border-b border-slate-100">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'CTRC' | 'NF')}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="CTRC">CTRC</option>
              <option value="NF">Nota Fiscal</option>
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={searchType === 'CTRC' ? 'Ex: BCA-123456 ou 123456' : 'Ex: 987654'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
            >
              Consultar
            </button>
          </form>
        </div>

        {/* Tabs de Navegação */}
        {detail && !multipleResults && (
          <div className="flex border-b border-slate-200 px-4 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Rastreamento ({detail.historico?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('nfs')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'nfs'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Notas Fiscais ({detail.notasFiscais?.length || 0})
            </button>
            {detail.comprovanteEntrega && (
              <button
                onClick={() => setActiveTab('canhoto')}
                className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'canhoto'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Comprovante
              </button>
            )}
          </div>
        )}

        {/* Conteúdo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-full animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Consultando SSW 101 em tempo real...
              </p>
              <p className="text-xs text-slate-400">
                Autenticando sessão e processando retorno analítico
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Consulta não concluída
              </div>
              <p className="text-xs text-red-700">{error}</p>
              <button
                onClick={() => searchQuery && handleManualSearch({ preventDefault: () => {} } as any)}
                className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Tentar novamente
              </button>
            </div>
          )}

          {/* Múltiplos Resultados Encontrados (Lista para Seleção) */}
          {multipleResults && !loading && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                <span>Múltiplos CTRCs encontrados para esta consulta ({multipleResults.length}). Clique para detalhar:</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {multipleResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectMultipleItem(item)}
                    className="p-3 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-sm">
                          {item.ctrc}
                        </span>
                        <span className="text-xs text-slate-500">{item.dataEmissao}</span>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="font-medium">Rem:</span> {item.remetente} → <span className="font-medium">Dest:</span> {item.destinatario}
                      </div>
                      <div className="text-xs text-slate-500">
                        Praça: <span className="font-medium text-slate-700">{item.cidadeDestino}</span>
                        {item.valorMercadoria ? ` | Valor: R$ ${item.valorMercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detalhe do CTRC Selecionado */}
          {detail && !loading && !multipleResults && (
            <>
              {/* ABA 1: VISÃO GERAL */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Situação do Documento</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {detail.situacaoAtual || detail.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-medium">Emissão</div>
                      <div className="text-xs font-semibold text-slate-800 mt-0.5">
                        {detail.dataEmissao}
                      </div>
                    </div>
                  </div>

                  {/* Chave de Acesso CT-e se existir */}
                  {detail.chaveCte && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-semibold text-slate-600">Chave CT-e:</span>
                        <span className="font-mono text-slate-700 truncate">{detail.chaveCte}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(detail.chaveCte!, 'chave')}
                        className="text-slate-500 hover:text-blue-600 p-1 flex items-center gap-1 font-medium text-xs"
                      >
                        {copied === 'chave' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Métricas e Valores em Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-slate-400" /> Volumes
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {detail.volumes} <span className="text-xs font-normal text-slate-500">{detail.especie || 'vol'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" /> Peso Real
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {detail.pesoBruto.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">kg</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Valor Mercadoria
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        R$ {detail.valorMercadoria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Valor Frete
                      </div>
                      <div className="text-sm font-bold text-emerald-700 mt-1">
                        R$ {detail.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Origem e Destino (Trajeto) */}
                  <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" /> Trajeto do Frete
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Origem:</span>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">
                          {detail.unidadeEmissora || 'SPO'}
                        </div>
                      </div>
                      <div className="flex-1 mx-4 flex items-center justify-center">
                        <div className="w-full border-t border-dashed border-slate-300 relative">
                          <Truck className="w-4 h-4 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Destino:</span>
                        <div className="font-bold text-slate-800 text-sm mt-0.5">
                          {detail.cidadeDestino ? `${detail.cidadeDestino} - ${detail.ufDestino || ''}` : (detail.unidadeDestino || 'VGA')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Partes Envolvidas: Remetente e Destinatário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Remetente */}
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-500" /> Remetente
                        </span>
                        {detail.remetente.cnpj && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {detail.remetente.cnpj}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900">
                        {detail.remetente.razaoSocial || 'Não informado'}
                      </div>
                      {detail.remetente.endereco && (
                        <div className="text-xs text-slate-600">
                          {detail.remetente.endereco}
                          {detail.remetente.cidade ? `, ${detail.remetente.cidade}/${detail.remetente.uf || ''}` : ''}
                        </div>
                      )}
                    </div>

                    {/* Destinatário */}
                    <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" /> Destinatário
                        </span>
                        {detail.destinatario.cnpj && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {detail.destinatario.cnpj}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900">
                        {detail.destinatario.razaoSocial || 'Não informado'}
                      </div>
                      {detail.destinatario.endereco && (
                        <div className="text-xs text-slate-600">
                          {detail.destinatario.endereco}
                          {detail.destinatario.bairro ? ` - ${detail.destinatario.bairro}` : ''}
                          {detail.destinatario.cidade ? `, ${detail.destinatario.cidade}/${detail.destinatario.uf || ''}` : ''}
                        </div>
                      )}
                      {detail.destinatario.fone && (
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {detail.destinatario.fone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: RASTREAMENTO & TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {detail.historico && detail.historico.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {detail.historico.map((event, idx) => (
                        <div key={idx} className="relative space-y-1 group">
                          {/* Ponto na linha do tempo */}
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-slate-100 text-slate-700 rounded-sm">
                                OC {event.codigo}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {event.descricao}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {event.dataHora}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-3">
                            <span className="font-semibold text-slate-700">Unidade: {event.unidade}</span>
                            {event.manifesto && (
                              <span className="text-blue-600 font-medium">Manif: {event.manifesto}</span>
                            )}
                            {event.motorista && (
                              <span className="text-slate-500">Mot: {event.motorista}</span>
                            )}
                          </div>

                          {event.observacao && (
                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 mt-1">
                              {event.observacao}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhum histórico de ocorrência registrado no SSW para este documento.
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: NOTAS FISCAIS */}
              {activeTab === 'nfs' && (
                <div className="space-y-3">
                  {detail.notasFiscais && detail.notasFiscais.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">NF</th>
                            <th className="p-2.5">Série</th>
                            <th className="p-2.5">Volumes</th>
                            <th className="p-2.5">Peso (kg)</th>
                            <th className="p-2.5">Valor (R$)</th>
                            <th className="p-2.5 text-right">Chave NF-e</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.notasFiscais.map((nf, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-bold text-slate-800">{nf.numero}</td>
                              <td className="p-2.5 text-slate-600">{nf.serie || '1'}</td>
                              <td className="p-2.5 text-slate-600">{nf.volumes || '-'}</td>
                              <td className="p-2.5 text-slate-600">
                                {nf.peso ? nf.peso.toLocaleString('pt-BR') : '-'}
                              </td>
                              <td className="p-2.5 font-medium text-slate-800">
                                {nf.valor ? `R$ ${nf.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="p-2.5 text-right">
                                {nf.chaveNfe ? (
                                  <button
                                    onClick={() => handleCopy(nf.chaveNfe!, `nf-${idx}`)}
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:underline"
                                    title={nf.chaveNfe}
                                  >
                                    {nf.chaveNfe.substring(0, 8)}...
                                    {copied === `nf-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Nenhuma nota fiscal vinculada encontrada.
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: COMPROVANTE / CANHOTO */}
              {activeTab === 'canhoto' && detail.comprovanteEntrega && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Entrega Concluída e Comprovada
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Recebedor:</span>
                        <div className="font-semibold text-slate-800">
                          {detail.comprovanteEntrega.recebedor || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Documento:</span>
                        <div className="font-semibold text-slate-800">
                          {detail.comprovanteEntrega.documento || 'Não informado'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Data da Entrega:</span>
                        <div className="font-semibold text-slate-800">
                          {detail.comprovanteEntrega.dataEntrega || 'Não informado'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {detail.comprovanteEntrega.urlCanhoto && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden p-3 bg-slate-50 text-center space-y-2">
                      <div className="text-xs font-semibold text-slate-700">Visualização do Canhoto</div>
                      <img
                        src={detail.comprovanteEntrega.urlCanhoto}
                        alt="Comprovante de Entrega"
                        className="max-h-80 mx-auto rounded-lg shadow-xs border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer com Informações de Origem e Fechar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            {detail?.fetchedAt && (
              <span>Consulta realizada em: {new Date(detail.fetchedAt).toLocaleTimeString('pt-BR')}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
