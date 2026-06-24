import { AppUser } from '../types';

/**
 * Checks if the user is authorized to edit real-time operational vehicle and driver data.
 * Both operators and master users have this permission.
 */
export function canEditOperationalVehicleData(profile: AppUser | null | undefined): boolean {
  return !!profile;
}

/**
 * Checks if the user is authorized to edit general protected business rules (e.g., Curva A, Special Clients).
 * Only master users have this permission.
 */
export function canEditProtectedBusinessRules(profile: AppUser | null | undefined): boolean {
  return !!profile?.is_master;
}

/**
 * Checks if the user is authorized to edit risk management (GR) parameters.
 * Only master users have this permission.
 */
export function canEditGrRules(profile: AppUser | null | undefined): boolean {
  return !!profile?.is_master;
}
