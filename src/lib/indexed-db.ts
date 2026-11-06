const DATABASE_NAME = 'bob_world_db';
const DATABASE_VERSION = 1;
const STORE_NAME = 'app_state';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local app storage.'));
      request.onblocked = () => reject(new Error('App storage upgrade is blocked by another open tab.'));
    });
  }
  return databasePromise;
}

export async function readAllAppState(): Promise<Record<string, unknown>> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const entries: Record<string, unknown> = {};
      for (const record of (request.result || []) as Array<{ key?: unknown; value?: unknown }>) {
        if (typeof record.key === 'string') entries[record.key] = record.value ?? null;
      }
      resolve(entries);
    };
    request.onerror = () => reject(request.error || new Error('Could not export local app state.'));
  });
}

export async function readAppState<T = string>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error || new Error('Could not read app state.'));
  });
}

export async function writeAppState(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ key, value, updatedAt: new Date().toISOString() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not save app state.'));
    transaction.onabort = () => reject(transaction.error || new Error('App state save was aborted.'));
  });
}

export async function removeAppState(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not remove app state.'));
  });
}

/** One-time, non-destructive migration: existing localStorage values win unless absent. */
export async function migrateLegacyStorage(keys: string[]): Promise<void> {
  for (const key of keys) {
    const legacyValue = window.localStorage.getItem(key);
    const indexedValue = await readAppState<string>(key);
    if (legacyValue !== null && indexedValue === null) {
      await writeAppState(key, legacyValue);
    } else if (legacyValue === null && typeof indexedValue === 'string') {
      window.localStorage.setItem(key, indexedValue);
    }
  }
}

/** Persist the current app snapshot atomically so a failed quota/write does not leave a mixed revision. */
export async function persistStorageKeys(keys: string[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const updatedAt = new Date().toISOString();
    try {
      for (const key of keys) {
        const value = window.localStorage.getItem(key);
        if (value === null) store.delete(key);
        else store.put({ key, value, updatedAt });
      }
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Could not save the app state snapshot.'));
    transaction.onabort = () => reject(transaction.error || new Error('The app state snapshot was aborted.'));
  });
}

export const BOB_WORLD_STATE_KEYS = [
  'bobworld_account_details',
  'bobworld_balance',
  'bobworld_transactions',
  'bobworld_payees',
  'bobworld_live_agent_messages',
  'bobworld_passbook_total_in',
  'bobworld_passbook_total_out',
  'bobworld_passbook_closing_balance',
  'bobworld_statement_logo',
  'bobworld_statement_bank_logo',
  'bobworld_transfer_tpin_verifier',
  'bobworld_image_loginBannerDataUri',
  'bobworld_image_loginBannerDataUri_1',
  'bobworld_image_loginBannerDataUri_2',
  'bobworld_image_loginBannerDataUri_3',
  'bobworld_image_loginBannerDataUri_4',
  'bobworld_image_loginBannerDataUri_5',
  'bobworld_image_fdBannerDataUri',
  'bobworld_image_rdBannerDataUri',
  'bobworld_image_debitCardIllustrationDataUri',
  'bobworld_image_linkBankIllustrationDataUri',
  'bobworld_image_promoWomanPaymentDataUri',
];
