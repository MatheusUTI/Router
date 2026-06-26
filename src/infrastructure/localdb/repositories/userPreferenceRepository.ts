import { db } from '../db';
import { UserPreference, UserPreferencesPayload } from '../../../types';
import { supabase } from '../../../supabase';
import { systemLogService } from '../../../services/systemLogService';

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
  },

  // Evolution for Local Preferences
  async getLocalPreference(username: string, view: string): Promise<UserPreference | undefined> {
    const id = `${username}_${view}`;
    return db.user_preferences.get(id);
  },

  async saveLocalPreference(username: string, view: string, preferencesPayload: UserPreferencesPayload): Promise<UserPreference> {
    const id = `${username}_${view}`;
    const pref: UserPreference = {
      id,
      username,
      view,
      preferences: preferencesPayload,
      updated_at: new Date().toISOString(),
      sync_status: 'local'
    };
    await db.user_preferences.put(pref);
    return pref;
  },

  async mergeLocalPreference(username: string, view: string, partialPreferences: any): Promise<UserPreference> {
    const id = `${username}_${view}`;
    const existing = await db.user_preferences.get(id);
    const mergedInner = {
      ...(existing?.preferences || {}),
      ...partialPreferences
    };
    const updatedPref: UserPreference = {
      id,
      username,
      view,
      preferences: mergedInner,
      updated_at: new Date().toISOString(),
      sync_status: 'pending' // mark as pending sync when modified
    };
    await db.user_preferences.put(updatedPref);
    return updatedPref;
  },

  // Evolution for Cloud Preferences (Safe, try/catch, non-blocking)
  async pullUserPreferencesFromCloud(username: string): Promise<UserPreference[]> {
    if (!supabase) {
      console.warn('[UserPreferenceRepository] Supabase not initialized.');
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('username', username);

      if (error) {
        console.error('[UserPreferenceRepository] Error pulling from cloud:', error);
        return [];
      }

      if (data && data.length > 0) {
        const pulledPrefs: UserPreference[] = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id || undefined,
          username: item.username,
          view: item.view,
          preferences: item.preferences_json || {},
          updated_at: item.updated_at || new Date().toISOString(),
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        }));

        // Put them into local DB as cache
        await db.user_preferences.bulkPut(pulledPrefs);
        return pulledPrefs;
      }
    } catch (err) {
      console.error('[UserPreferenceRepository] Error executing pullUserPreferencesFromCloud:', err);
    }
    return [];
  },

  async pushUserPreferenceToCloud(preference: UserPreference): Promise<boolean> {
    if (!supabase) {
      systemLogService.logWarn('Sync', 'Não foi possível fazer push das preferências: Supabase não configurado');
      return false;
    }
    try {
      // Temporarily mark as pending in local cache before attempting
      await db.user_preferences.update(preference.id, { sync_status: 'pending' });

      const payload = {
        id: preference.id,
        user_id: preference.userId || null,
        username: preference.username,
        view: preference.view,
        preferences_json: preference.preferences,
        updated_at: preference.updated_at,
        created_at: preference.updated_at
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(payload);

      if (error) {
        systemLogService.logError('Sync', 'Erro ao fazer push das preferências de usuário', error);
        console.error('[UserPreferenceRepository] Error pushing to cloud:', error);
        await db.user_preferences.update(preference.id, { sync_status: 'failed' });
        return false;
      }

      // Mark as synced locally
      await db.user_preferences.update(preference.id, {
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      });
      systemLogService.logSuccess('Sync', `Preferências do usuário ${preference.username} sincronizadas com sucesso.`);
      return true;
    } catch (err) {
      systemLogService.logError('Sync', 'Exceção ao fazer push das preferências de usuário', err);
      console.error('[UserPreferenceRepository] Error in pushUserPreferenceToCloud:', err);
      try {
        await db.user_preferences.update(preference.id, { sync_status: 'failed' });
      } catch (updateErr) {
        // Safe fallback in case DB is locked/closed during transition
      }
      return false;
    }
  },

  // Full Synchronizer
  async syncUserPreferences(username: string): Promise<void> {
    if (!supabase) {
      return;
    }
    try {
      // 1. Pull latest from cloud
      const cloudPrefs = await this.pullUserPreferencesFromCloud(username);
      
      // 2. Find any pending/local changes in IndexedDB to push
      const localPrefs = await db.user_preferences
        .where('username')
        .equals(username)
        .toArray();

      const pendingPrefs = localPrefs.filter(
        (p) => p.sync_status === 'pending' || p.sync_status === 'local' || p.sync_status === 'failed'
      );

      for (const pref of pendingPrefs) {
        const cloudMatch = cloudPrefs.find((cp) => cp.id === pref.id);
        
        // Push local if it is newer or doesn't exist in cloud
        if (!cloudMatch || new Date(pref.updated_at) > new Date(cloudMatch.updated_at)) {
          await this.pushUserPreferenceToCloud(pref);
        } else if (cloudMatch && new Date(cloudMatch.updated_at) > new Date(pref.updated_at)) {
          // Cloud is newer, overwrite local cache
          await db.user_preferences.put(cloudMatch);
        }
      }
    } catch (err) {
      console.error('[UserPreferenceRepository] Sync error:', err);
    }
  }
};
