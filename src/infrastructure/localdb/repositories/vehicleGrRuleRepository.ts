import { db } from '../db';
import { VehicleGrRule } from '../../../types';

export const defaultGrRules: VehicleGrRule[] = [
  {
    id: 'PROPRIO',
    vehicleType: 'PROPRIO',
    maxValueWithoutGr: 500000,
    requiresTrackingAboveValue: true,
    requiresAuthorizationAboveLimit: true,
    blocksRoutingAboveLimit: true,
  },
  {
    id: 'AGREGADO',
    vehicleType: 'AGREGADO',
    maxValueWithoutGr: 300000,
    requiresTrackingAboveValue: true,
    requiresAuthorizationAboveLimit: true,
    blocksRoutingAboveLimit: true,
  },
  {
    id: 'APOIO',
    vehicleType: 'APOIO',
    maxValueWithoutGr: 300000,
    requiresTrackingAboveValue: true,
    requiresAuthorizationAboveLimit: true,
    blocksRoutingAboveLimit: true,
  },
  {
    id: 'TERCEIRO',
    vehicleType: 'TERCEIRO',
    maxValueWithoutGr: 300000,
    requiresTrackingAboveValue: true,
    requiresAuthorizationAboveLimit: true,
    blocksRoutingAboveLimit: true,
  }
];

export const VehicleGrRuleRepository = {
  async getAll(): Promise<VehicleGrRule[]> {
    const rules = await db.vehicle_gr_rules.toArray();
    if (rules.length === 0) {
      await this.initializeDefaultRules();
      return db.vehicle_gr_rules.toArray();
    }
    return rules;
  },

  async getById(id: string): Promise<VehicleGrRule | undefined> {
    const rule = await db.vehicle_gr_rules.get(id);
    if (!rule) {
      // Return default if not found in db yet
      return defaultGrRules.find(r => r.id === id);
    }
    return rule;
  },

  async put(rule: VehicleGrRule): Promise<string> {
    await db.vehicle_gr_rules.put(rule);
    return rule.id;
  },

  async initializeDefaultRules(): Promise<void> {
    for (const rule of defaultGrRules) {
      await db.vehicle_gr_rules.put(rule);
    }
  },

  async clearAll(): Promise<void> {
    await db.vehicle_gr_rules.clear();
  }
};
