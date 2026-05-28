import { db } from '../db';
import { RoutePlanningItem } from '../../../types';

export const RoutePlanningRepository = {
  async getAll(): Promise<RoutePlanningItem[]> {
    return db.route_planning_items.toArray();
  },

  async getByDate(date: string): Promise<RoutePlanningItem[]> {
    return db.route_planning_items
      .where('planningDate')
      .equals(date)
      .toArray();
  },

  async getByCtrcId(ctrcId: string): Promise<RoutePlanningItem[]> {
    return db.route_planning_items
      .where('ctrcId')
      .equals(ctrcId)
      .toArray();
  },

  async put(item: RoutePlanningItem): Promise<string> {
    await db.route_planning_items.put(item);
    return item.id;
  },

  async putMany(items: RoutePlanningItem[]): Promise<void> {
    await db.route_planning_items.bulkPut(items);
  },

  async delete(id: string): Promise<void> {
    await db.route_planning_items.delete(id);
  },

  async clear(): Promise<void> {
    await db.route_planning_items.clear();
  },

  async upsertForCtrc(
    ctrcId: string,
    planningDate: string,
    patch: Partial<RoutePlanningItem>
  ): Promise<RoutePlanningItem> {
    const id = `${planningDate}_${ctrcId}`;
    const existing = await db.route_planning_items.get(id);
    const now = new Date().toISOString();

    const item: RoutePlanningItem = {
      id,
      ctrcId,
      planningDate,
      suggestedRoute: patch.suggestedRoute !== undefined ? patch.suggestedRoute : (existing?.suggestedRoute || ''),
      operationalRoute: patch.operationalRoute !== undefined ? patch.operationalRoute : existing?.operationalRoute,
      manualPriority: patch.manualPriority !== undefined ? patch.manualPriority : existing?.manualPriority,
      planningStatus: patch.planningStatus !== undefined ? patch.planningStatus : (existing?.planningStatus || 'A_PLANEJAR'),
      operationalNote: patch.operationalNote !== undefined ? patch.operationalNote : existing?.operationalNote,
      lockedByUser: patch.lockedByUser !== undefined ? patch.lockedByUser : existing?.lockedByUser,
      updatedBy: patch.updatedBy || existing?.updatedBy,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await db.route_planning_items.put(item);
    return item;
  }
};
