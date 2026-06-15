import { db } from '../db';
import { RouteGateMap } from '../../../types';

export const RouteGateRepository = {
  async getAll(): Promise<RouteGateMap[]> {
    return db.route_gate_map.toArray();
  },

  async getActive(): Promise<RouteGateMap[]> {
    return db.route_gate_map.where('active').equals(1).toArray(); // Dexie handles booleans natively, or active true
  },

  async getByRoute(route: string): Promise<RouteGateMap | undefined> {
    return db.route_gate_map.where('route').equalsIgnoreCase(route).first();
  },

  async put(item: RouteGateMap): Promise<string> {
    await db.route_gate_map.put(item);
    return item.id;
  },

  async putMany(items: RouteGateMap[]): Promise<void> {
    await db.route_gate_map.bulkPut(items);
  },

  async seedDefaultGates(): Promise<void> {
    const existing = await this.getAll();
    if (existing.length > 0) return; // already seeded

    const defaults: RouteGateMap[] = [];
    const nowStr = new Date().toISOString();

    // ROTA 01 to ROTA 20
    for (let i = 1; i <= 20; i++) {
      const idxStr = String(i).padStart(2, '0');
      defaults.push({
        id: `gate_rota_${idxStr}`,
        route: `ROTA ${idxStr}`,
        gate: `PORTÃO ${idxStr}`,
        active: true,
        updatedAt: nowStr,
      });
    }

    // ROTA 99
    defaults.push({
      id: 'gate_rota_99',
      route: 'ROTA 99',
      gate: 'PORTÃO 99',
      active: true,
      updatedAt: nowStr,
    });

    await this.putMany(defaults);
  }
};
