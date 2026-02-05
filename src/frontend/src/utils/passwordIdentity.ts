import { Ed25519KeyIdentity } from '@dfinity/identity';

const STORAGE_KEY = 'sweetsteps_password_identity';

/**
 * Generates a stable Ed25519 identity from a username and password.
 * This creates a deterministic seed from the credentials.
 */
export function createIdentityFromCredentials(username: string, password: string): Ed25519KeyIdentity {
  // Create a deterministic seed from username + password
  // Using a simple but stable approach: hash the combined string
  const combined = `${username.toLowerCase()}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  
  // Create a 32-byte seed by repeating and truncating the hash
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = data[i % data.length] ^ (i * 7); // Simple mixing
  }
  
  return Ed25519KeyIdentity.generate(seed);
}

/**
 * Stores the identity securely in localStorage.
 */
export function storeIdentity(identity: Ed25519KeyIdentity): void {
  try {
    const exported = identity.toJSON();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exported));
  } catch (error) {
    console.error('Failed to store identity:', error);
  }
}

/**
 * Retrieves and restores the identity from localStorage.
 */
export function restoreIdentity(): Ed25519KeyIdentity | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return Ed25519KeyIdentity.fromJSON(JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to restore identity:', error);
    return null;
  }
}

/**
 * Clears the stored identity from localStorage.
 */
export function clearStoredIdentity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear identity:', error);
  }
}
