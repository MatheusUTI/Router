import { db } from '../db';
import { CurvaAClientLocal } from '../../../types';

export const CurvaAClientRepository = {
  async getAll(): Promise<CurvaAClientLocal[]> {
    return db.curva_a_clients.toArray();
  },

  async getById(id: string): Promise<CurvaAClientLocal | undefined> {
    return db.curva_a_clients.get(id);
  },

  async put(client: CurvaAClientLocal): Promise<string> {
    await db.curva_a_clients.put(client);
    return client.id;
  },

  async putMany(clients: CurvaAClientLocal[]): Promise<void> {
    await db.curva_a_clients.bulkPut(clients);
  },

  async delete(id: string): Promise<void> {
    await db.curva_a_clients.delete(id);
  },

  async clear(): Promise<void> {
    await db.curva_a_clients.clear();
  },

  async clearAll(): Promise<void> {
    await db.curva_a_clients.clear();
  }
};
