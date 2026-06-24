export type ViewType =
  | 'login'
  | 'dashboard'
  | 'importacao'
  | 'frota'
  | 'roteirizacao'
  | 'finalizacao'
  | 'desempenho'
  | 'solucao'
  | 'clientes'
  | 'ocorrencias'
  | 'curva_a'
  | 'cidades_rotas'
  | 'configuracoes'
  | 'base_dados'
  | 'ctrcs_ssw'
  | 'regras_gr'
  | 'auditoria';

export interface Vehicle {
  id: string; // Placa
  driverName: string;
  capacity: string;
  type: string;
  status: 'Em Rota' | 'Disponível' | 'Manutenção';
}

export interface DriverScore {
  id: string;
  name: string;
  score: number;
  bestRoute: string;
  status: 'Excelente' | 'Bom' | 'Regular' | 'Atenção';
  vehicle: string;
  avgTime: number; // minutes
  errorRate: number; // percent
  successRate: number; // percent
  avatar: string;
}

export interface Ctrc {
  id: string;
  destinatario: string;
  cidade: string;
  weight: number; // kg
  volume: number; // m3 (or volumes count)
  type: 'CURVA A' | 'NORMAL';
  status: 'Pendente' | 'Entregue' | 'Recusado' | 'Disponível' | 'Em Rota' | 'Transferência' | 'Agendamento' | 'Separando' | 'Finalizado' | 'Cancelado';
  cidade_ent?: string;
  setor?: string;
  prev_ent?: string;
  remetente?: string;
  ocorrencia?: string;
  data_ocorr?: string;
  nf?: string;
  valor?: number;
  frete?: number;
  unid?: string;
  pagador?: string;
  cod?: string;
  descricao_ocorr?: string;
  data_ocorrencia?: string;
  peso_r?: number;
  obs?: string;
  disponibilidade?: string;
  localizacao?: string;
  bairro?: string;
  isActiveForRouting?: boolean;
  pracaDestino?: string;
  pracaHub?: string;
  importBatchId?: string;
  planningDate?: string;
}

export interface Expense {
  id: string;
  description: string;
  value: number;
}

export interface Ticket {
  id: string; // #TRK-xxxx
  title: string;
  destinatario: string;
  address: string;
  ageMinutes: number;
  priority?: string;
  status: 'Pendente' | 'Re-agendado' | 'Devolvido' | 'Troca Motorista';
  icon: string;
}

export interface Occurence {
  id: string;
  title: string;
  time: string;
  description: string;
  type: 'error' | 'neutral' | 'success';
}

export interface CriticClient {
  id: string;
  prefix: string; // CD, SM, VR
  name: string;
  score: number;
  rejections30d: number;
  avgQueueTime: string;
  address: string;
  recurrentIssues: { title: string; description: string; icon: string }[];
  auditUser: string;
  auditAvatar: string;
  auditTime: string;
  auditDetail: string;
}

export interface AppUser {
  username: string;
  password?: string;
  name: string;
  role: string;
  is_master: boolean;
  unid?: string;
  created_at?: string;
}

export interface DeliveryOccurrence {
  codigo: string;
  descricao: string;
  responsabilidade: string;
  tipo: string;
  setor_ocorr: string;
  retorno_rota: 'Sim' | 'Não';
  tratativa_solucao: string;
}

export interface CurvaAClient {
  cnpj_remetente: string;
  curva_a: string;
  cliente_remetente: string;
}

export interface CidadeRota {
  id?: number;
  cidade: string; // e.g. "ALFENAS"
  alias: string;  // e.g. "ALFENAS-MG, ALFENA, RTA-ALFENAS"
  setor: string;  // e.g. "SUL-1"
  rota: string;   // e.g. "ROTA 06"
  prazo_padrao: number; // e.g. 2 for D+2
  prioridade_operacional: 'CRÍTICA' | 'ALTA' | 'NORMAL' | 'BAIXA';
  segunda?: boolean;
  terca?: boolean;
  quarta?: boolean;
  quinta?: boolean;
  sexta?: boolean;
  cod?: string;
}

export interface Helper {
  id: string;
  name: string;
  status: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface CurvaAClientLocal {
  id: string; // generated client identification string
  cnpj_remetente: string;
  cliente_remetente: string;
  curva_a: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type DensityMode = 'compact' | 'default' | 'comfortable' | 'planilha_operacional';

export interface MesaViewPreferences {
  preset: 'default' | 'compact' | 'planilha_operacional';
  rowLines: 2 | 3;
  showValue: boolean;
  showFreight: boolean;
  showObs: boolean;
  showAvailability: boolean;
  showLocation: boolean;
  showRemetente: boolean;
  visibleColumns: string[];
  primarySortField?: string;
}

export type OccurrenceSectorFilter = string[];

export type RoteirizacaoSortField =
  | 'id'
  | 'nf'
  | 'prev_ent'
  | 'remetente'
  | 'destinatario'
  | 'cidade'
  | 'peso'
  | 'volumes'
  | 'valor'
  | 'frete'
  | 'priority'
  | 'ocorrencia'
  | 'status'
  | 'localizacao'
  | 'rota';

export type SortDirection = 'asc' | 'desc';

export interface RoteirizacaoPreferences {
  densityMode: DensityMode;
  mesaScale?: '85%' | '90%' | '100%' | '110%' | '120%';
  groupingMode?: string;
  selectedUnit?: string;
  selectedSector?: string;
  selectedLocationFilter?: string;
  activeTacticalFilter?: string;
  showFinancialValues?: boolean;
  compactHeader?: boolean;
  selectedOccurrenceSectors?: string[];
  sortField?: RoteirizacaoSortField;
  sortDirection?: SortDirection;
  showOtherUnits?: boolean;
  mesaViewPreferences?: MesaViewPreferences;
}

export interface UserPreferencesPayload {
  roteirizacao?: RoteirizacaoPreferences;
  [key: string]: any;
}

export interface UserPreference {
  id: string; // Typically username-based ID
  userId?: string;
  username: string;
  view: string;
  preferences: UserPreferencesPayload;
  updated_at: string;
  synced_at?: string;
  sync_status?: 'local' | 'synced' | 'pending' | 'failed';
}

export interface SyncMetadata {
  entity: string;
  last_pull_at: string;
  last_push_at: string;
  last_success_at: string;
}

export type PlanningPriority =
  | 'NORMAL'
  | 'PRIORIDADE'
  | 'URGENTE'
  | 'SEGURAR'
  | 'NAO_SAI_HOJE'
  | 'AGENDADO';

export type PlanningStatus =
  | 'A_PLANEJAR'
  | 'PLANEJADO'
  | 'URGENTE'
  | 'PRIORIDADE'
  | 'SEGURAR'
  | 'NAO_SAI_HOJE'
  | 'AGENDADO'
  | 'CONSOLIDADO';

export interface RoutePlanningItem {
  id: string;
  ctrcId: string;
  planningDate: string;
  suggestedRoute: string;
  operationalRoute?: string;
  manualPriority?: PlanningPriority;
  planningStatus: PlanningStatus;
  operationalNote?: string;
  lockedByUser?: boolean;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface RoteirizacaoItem extends Ctrc {
  normCidade: string;
  normSetor: string;
  normRota: string;
  normPrazo?: number;
  normPriority?: string;
  slaStatus: {
    label: string;
    bgClass: string;
    textClass: string;
    daysDiff: number;
    isToday: boolean;
    isDelayed: boolean;
  };
  pesoStatus: {
    textClass: string;
    badgeClass: string;
    category: 'LEVE' | 'MÉDIO' | 'PESADO' | 'CRÍTICO';
    label: string;
  };
  occurrenceCode?: string;
  occurrenceDescription?: string;
  occurrenceCriticality: 'CRÍTICA' | 'MÉDIA' | 'SUAVE' | 'NENHUMA';
  availabilityStatus: 'disponivel' | 'em rota' | 'retido' | 'transferência' | 'aguardando' | 'problema';
  availabilityLabel: string;
  locationLabel: string;
  isCurvaA: boolean;
  curvaAClass?: string;
  isRemetenteCurvaA?: boolean;
  isDestinatarioCurvaA?: boolean;
  isFob: boolean;
  isCriticClient?: boolean;
  criticClientName?: string;
  criticClientPrefix?: string;
  criticClientScore?: number;
  criticClientReason?: string;
  visualFlags: {
    isCurvaA: boolean;
    isRemetenteCurvaA?: boolean;
    isDestinatarioCurvaA?: boolean;
    isFob: boolean;
    isDelayed: boolean;
    statusClass: string;
    rowClass: string;
  };
  suggestedRoute?: string;
  operationalRoute?: string;
  effectiveRoute?: string;
  manualPriority?: PlanningPriority;
  planningStatus?: PlanningStatus;
  operationalNote?: string;
  isManualRoute?: boolean;
  routingEligibility?: RoutingEligibility;
  routingBlockReason?: string;
  routingEligibilitySource?: string;
  occurrenceSector?: string;
  pracaHub?: string;
  pracaDestino?: string;
  ufDestino?: string;
  frequencia?: string;
  matchedSource?: 'CTRC' | 'EXCECAO' | 'SSW' | 'NENHUM';
}

export type RoutingEligibility =
  | 'ROTEIRIZAVEL'
  | 'REVISAR'
  | 'NAO_ROTEIRIZAVEL';

export interface CtrcOccurrenceHistoryItem {
  id: string;
  ctrcId: string;
  importDate: string;
  occurrenceCode?: string;
  occurrenceDescription?: string;
  occurrenceSector?: string;
  solutionType?: string;
  locationLabel?: string;
  status?: string;
  unid?: string;
  cidade?: string;
  rota?: string;
  prevEnt?: string;
  sourceFile?: string;
  hash?: string;
  createdAt: string;
}

export type PreRomaneioStatus =
  | 'RASCUNHO'
  | 'EM_SEPARACAO'
  | 'SEPARADO'
  | 'COM_DIVERGENCIA'
  | 'CANCELADO'
  | 'CONVERTIDO_ROMANEIO';

export interface RouteGateMap {
  id: string;
  route: string;      // Ex: ROTA 06
  gate: string;       // Ex: PORTÃO 06
  active: boolean;
  updatedAt: string;
}

export interface PreRomaneio {
  id: string;
  planningDate: string;
  route: string;
  gate: string;
  status: PreRomaneioStatus;
  ctrcIds: string[];
  totalWeight: number;
  totalVolumes: number;
  totalValue: number;
  totalFrete: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  convertedRomaneioId?: string;
  notes?: string;
  vehiclePlate?: string;
  driverName?: string;
  helperName?: string;
  observations?: string;
  importBatchId?: string;
}

export interface OperationalCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  dayMonth: string; // DD/MM
  year?: number; // e.g. 2026
  city: string; // 'GERAL' or city name
  uf?: string; // 'MG'
  description: string;
  eventType: string; // e.g. 'FERIADO', 'ANIVERSARIO', 'SUSPENSAO', etc.
  recurrenceType: 'FIXED_YEARLY' | 'YEAR_SPECIFIC';
  active: boolean;
  source: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalNotice {
  id: string;
  date: string; // YYYY-MM-DD
  city: string; // 'GERAL' or city name
  route?: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  daysUntil: number;
  sourceEventId: string;
}

export interface OperationalUnit {
  code: string;
  name: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationalUnitBI {
  id?: string;
  unidade: string;
  uf: string;
  tipo: 'Unidade' | 'Parceiro' | string;
  responsavelOperacional?: string | null;
  responsavelComercial?: string | null;
  responsavel?: string | null;
  controleParceiros?: boolean;
  parceiroUrbano?: boolean;
  ativo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoteirizacaoDiagnostics {
  totalIndexedDb?: number;
  totalAppAvailable?: number;
  totalAppLinked?: number;
  totalBeforeEnrichment: number;
  totalAfterEnrichment: number;
  totalAfterUnitFilter: number;
  totalAfterRouteFilter: number;
  totalAfterOccurrenceFilter: number;
  totalAfterSearchFilter: number;
  totalAfterLogisticFilter: number;
  totalAfterStatusFilter: number;
  totalFinalVisible: number;
  byStatus: Record<string, number>;
  byUnit: Record<string, number>;
  byOccurrenceSector: Record<string, number>;
  byRoutingEligibility: Record<string, number>;
  byLogisticCompatibility: Record<string, number>;
  warnings: string[];
  contaminationCount?: number;
  contaminationExamples?: { id: string; destinatario: string; cidade: string; }[];
  totalCtrcs?: number;
}

export interface CidadeAtendidaSSW {
  id?: string;
  unidadeOrigem: string;
  ufOrigem: string;
  cidadeOrigem: string;
  codigoIbgeOrigem?: string;
  ufDestino: string;
  cidadeDestino: string;
  pracaDestinoOriginal?: string;
  pracaDestinoNormalizada?: string;
  pracaHub?: string;
  pracaDestino?: string; // preserve for compatibility
  codigoIbgeDestino?: string;
  distanciaKm?: number;
  tarifa?: number;
  prazo?: number;
  frequencia?: string;
  quantPedagios?: number;
  cif?: boolean;
  fob?: boolean;
  restrito?: boolean;
  tda?: boolean;
  pracaComercial?: string;
  ativo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleRegistry {
  placa: string;
  tipo: 'PROPRIO' | 'PRÓPRIO' | 'AGREGADO' | 'APOIO' | 'TERCEIRO';
  rastreado: boolean;
  limiteGrSugerido: number;
  motoristaPadrao?: string;
  ajudantePadrao?: string;
  statusOperacional: 'ATIVO' | 'MANUTENCAO' | 'MANUTENÇÃO' | 'INATIVO';
  observacoes?: string;
  updated_at?: string;
  created_at?: string;
}

export interface VehicleGrRule {
  id: string; // classification type: e.g. 'PROPRIO', 'AGREGADO', 'APOIO', 'TERCEIRO'
  vehicleType: string; // e.g., 'PROPRIO', 'AGREGADO', 'APOIO', 'TERCEIRO'
  maxValueWithoutGr: number;
  requiresTrackingAboveValue: boolean;
  requiresAuthorizationAboveLimit: boolean;
  blocksRoutingAboveLimit: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  profile: 'OPERADOR' | 'MASTER';
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
}





