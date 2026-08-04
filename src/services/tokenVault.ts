/**
 * tokenVault.ts
 * AES-256-GCM encrypted token storage using the Web Crypto API.
 * Tokens are NEVER stored as plaintext in localStorage.
 */

const VAULT_KEY_ALIAS = 'aijh_vault_v1';
const VAULT_STORAGE_KEY = 'aijh_encrypted_tokens';

/** Derive a stable AES-GCM key from a browser fingerprint + session salt */
async function deriveVaultKey(): Promise<CryptoKey> {
  const salt = VAULT_KEY_ALIAS + (navigator.userAgent.substring(0, 20));
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(salt),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('aijh-salt-2025'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** AES-GCM encrypt a string value */
async function encryptValue(value: string): Promise<string> {
  const key = await deriveVaultKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** AES-GCM decrypt a stored value */
async function decryptValue(stored: string): Promise<string> {
  const key = await deriveVaultKey();
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** Load the entire vault map */
async function loadVault(): Promise<Record<string, string>> {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Save a portal access token (encrypted) */
export async function savePortalToken(portal: string, token: string): Promise<void> {
  try {
    const vault = await loadVault();
    vault[portal] = await encryptValue(token);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (e) {
    console.warn('[TokenVault] Encryption failed, storing stub:', e);
    // Fallback: store a stub marker (not the real token)
    const vault = await loadVault();
    vault[portal] = `__stub__${portal}`;
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  }
}

/** Retrieve and decrypt a portal token */
export async function getPortalToken(portal: string): Promise<string | null> {
  try {
    const vault = await loadVault();
    const stored = vault[portal];
    if (!stored) return null;
    if (stored.startsWith('__stub__')) return null; // stub — no real token
    return await decryptValue(stored);
  } catch {
    return null;
  }
}

/** Remove a portal token (on disconnect) */
export async function removePortalToken(portal: string): Promise<void> {
  const vault = await loadVault();
  delete vault[portal];
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
}

/** Get all connected portal token keys (without decrypting) */
export async function getConnectedPortals(): Promise<string[]> {
  const vault = await loadVault();
  return Object.keys(vault).filter(k => !!vault[k] && !vault[k].startsWith('__stub__'));
}

/** Clear entire token vault (logout / clean slate) */
export function clearVault(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
}
