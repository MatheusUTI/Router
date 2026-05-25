import { db } from '../db';
import { UserPreference } from '../../../types';

export const UserPreferenceRepository = {
  async getAll(): Promise<UserPreference[]> {
    return db.user_preferences.toArray();
  },

  async getById(id: string): Promise<UserPreference | undefined> {
    return db.user_preferences.get(id);
  },

  async put(preference: UserPreference): Promise<string> {
    await db.user_preferences.put(preference);
    return preference.id;
  },

  async putMany(preferences: UserPreference[]): Promise<void> {
    await db.user_preferences.bulkPut(preferences);
  },

  async delete(id: string): Promise<void> {
    await db.user_preferences.delete(id);
  },

  async clear(): Promise<void> {
    await db.user_preferences.clear();
  },

  async clearAll(): Promise<void> {
    await db.user_preferences.clear();
  }
};
