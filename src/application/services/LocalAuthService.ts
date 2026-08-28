import { db } from '../../infrastructure/localdb/db';
import { AppUser, LocalAuthRecord } from '../../types';

// Web Crypto API helpers for password hashing
const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';

// Generates a cryptographically secure salt
function generateSalt(): string {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Derives a PBKDF2 hash from the password and salt
async function deriveKey(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const saltBuffer = enc.encode(salt);
  const hashBuffer = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: HASH_ALGO
    },
    keyMaterial,
    256 // length in bits
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class LocalAuthService {
  /**
   * Provisions or updates local authorization for a user who has just authenticated successfully online.
   */
  static async provisionOfflineAuth(username: string, passwordPlain: string, userProfile: AppUser): Promise<void> {
    const salt = generateSalt();
    const verifier = await deriveKey(passwordPlain, salt, ITERATIONS);
    
    // Offline authorization valid for 7 days
    const validatedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(validatedAt.getDate() + 7);

    const record: LocalAuthRecord = {
      username: username.toLowerCase(),
      userProfile,
      salt,
      verifier,
      iterations: ITERATIONS,
      validatedAt: validatedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await db.local_auth.put(record);
    console.log(`[LocalAuth] Provisioned offline authorization for ${username}`);
  }

  /**
   * Attempts offline authorization using a locally stored password verifier.
   */
  static async attemptOfflineAuth(username: string, passwordPlain: string): Promise<AppUser | null> {
    const record = await db.local_auth.get(username.toLowerCase());
    if (!record) {
      console.warn(`[LocalAuth] No offline authorization found for ${username}`);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(record.expiresAt);
    
    if (now > expiresAt) {
      console.warn(`[LocalAuth] Offline authorization expired for ${username}`);
      return null;
    }

    const hashToVerify = await deriveKey(passwordPlain, record.salt, record.iterations);
    
    if (hashToVerify === record.verifier) {
      console.log(`[LocalAuth] Offline authorization successful for ${username}`);
      return record.userProfile;
    }

    console.warn(`[LocalAuth] Offline authorization failed (invalid credentials) for ${username}`);
    return null;
  }

  /**
   * Clears local authorization (e.g. on logout or revocation).
   */
  static async clearOfflineAuth(username: string): Promise<void> {
    await db.local_auth.delete(username.toLowerCase());
  }
}
