import { Ctrc } from '../../types';

export interface ICtrcRepository {
  getAll(): Promise<Ctrc[]>;
  getByUnid(unid: string): Promise<Ctrc[]>;
  getById(id: string): Promise<Ctrc | undefined>;
  getByIds(ids: string[]): Promise<Ctrc[]>;
  put(ctrc: Ctrc, skipSync?: boolean): Promise<string>;
  putMany(ctrcs: Ctrc[], skipSync?: boolean): Promise<void>;
  delete(id: string, skipSync?: boolean): Promise<void>;
  deleteMany(ids: string[], skipSync?: boolean): Promise<void>;
  clearAll(): Promise<void>;
}
