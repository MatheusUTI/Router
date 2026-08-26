import { PreRomaneio, PreRomaneioStatus } from '../../types';

export interface IPreRomaneioRepository {
  getAll(): Promise<PreRomaneio[]>;
  getByDate(date: string): Promise<PreRomaneio[]>;
  getByRoute(route: string): Promise<PreRomaneio[]>;
  getByStatus(status: PreRomaneioStatus): Promise<PreRomaneio[]>;
  put(item: PreRomaneio): Promise<string>;
  putMany(items: PreRomaneio[]): Promise<void>;
  delete(id: string, username?: string, reason?: string): Promise<void>;
  updateStatus(id: string, status: PreRomaneioStatus, extras?: Partial<PreRomaneio>, username?: string): Promise<void>;
  updateAssignment(id: string, data: Partial<PreRomaneio>): Promise<void>;
  cancel(id: string): Promise<void>;
  markEmSeparacao(id: string): Promise<void>;
  markSeparado(id: string): Promise<void>;
  markComDivergencia(id: string): Promise<void>;
  markConvertidoRomaneio(id: string, romaneioId: string): Promise<void>;
}
