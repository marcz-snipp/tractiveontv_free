import * as SecureStore from 'expo-secure-store';

const KEY_CREDENTIALS = 'tot.credentials.v1';
const KEY_SESSION = 'tot.session.v1';

const opts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

export interface StoredCredentials {
  email: string;
  password: string;
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  const raw = await SecureStore.getItemAsync(KEY_CREDENTIALS, opts);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredCredentials;
    if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCredentials(creds: StoredCredentials): Promise<void> {
  await SecureStore.setItemAsync(KEY_CREDENTIALS, JSON.stringify(creds), opts);
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_CREDENTIALS, opts);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_SESSION, opts);
}
