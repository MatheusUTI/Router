import { UserPreference, UserPreferencesPayload } from '../../types';

export interface IUserPreferenceRepository {
  getAll(): Promise<UserPreference[]>;
  getById(id: string): Promise<UserPreference | undefined>;
  put(preference: UserPreference): Promise<string>;
  putMany(preferences: UserPreference[]): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  clearAll(): Promise<void>;
  getLocalPreference(username: string, view: string): Promise<UserPreference | undefined>;
  saveLocalPreference(username: string, view: string, preferencesPayload: UserPreferencesPayload): Promise<UserPreference>;
  mergeLocalPreference(username: string, view: string, partialPreferences: any): Promise<UserPreference>;
  pullUserPreferencesFromCloud(username: string): Promise<UserPreference[]>;
  pushUserPreferenceToCloud(preference: UserPreference): Promise<boolean>;
  syncUserPreferences(username: string): Promise<void>;
}
