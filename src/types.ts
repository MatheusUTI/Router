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
  | 'configuracoes';

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
  status: 'Pendente' | 'Entregue' | 'Recusado' | 'Disponível' | 'Em Rota' | 'Transferência' | 'Agendamento';
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

export interface UserPreference {
  id: string; // Typically username-based ID
  username: string;
  view: string;
  preferences: any;
  updated_at: string;
}

export interface SyncMetadata {
  entity: string;
  last_pull_at: string;
  last_push_at: string;
  last_success_at: string;
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
  isFob: boolean;
  visualFlags: {
    isCurvaA: boolean;
    isFob: boolean;
    isDelayed: boolean;
    statusClass: string;
    rowClass: string;
  };
}



