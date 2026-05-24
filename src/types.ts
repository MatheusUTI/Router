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


