import { RoutePlanningItem } from '../../types';

export interface IRoutePlanningRepository {
  getAll(): Promise<RoutePlanningItem[]>;
  getByDate(date: string): Promise<RoutePlanningItem[]>;
  getByCtrcId(ctrcId: string): Promise<RoutePlanningItem[]>;
  put(item: RoutePlanningItem): Promise<string>;
  putMany(items: RoutePlanningItem[]): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  upsertForCtrc(ctrcId: string, planningDate: string, patch: Partial<RoutePlanningItem>): Promise<RoutePlanningItem>;
}
