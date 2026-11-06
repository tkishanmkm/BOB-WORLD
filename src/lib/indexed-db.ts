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
let storageMirrorInstalled = false;

function installStorageMirror(): void {
  if (storageMirrorInstalled || typeof window === 'undefined') return;
  const prototype = Storage.prototype;
  const originalSetItem = prototype.setItem;
  const originalRemoveItem = prototype.removeItem;
  const originalClear = prototype.clear;
  prototype.setItem = function (key: string, value: string): void {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && key.startsWith('bobworld_')) {
      void writeAppState(key, value).catch(error => console.error('IndexedDB state write failed:', key, error));
    }
  };
  prototype.removeItem = function (key: string): void {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && key.startsWith('bobworld_')) {
      void removeAppState(key).catch(error => console.error('IndexedDB state removal failed:', key, error));
    }
  };
  prototype.clear = function (): void {
    const keys: string[] = [];
    if (this === window.localStorage) {
      for (let index = 0; index < this.length; index += 1) {
        const key = this.key(index);
        if (key && key.startsWith('bobworld_')) keys.push(key);
      }
    }
    originalClear.call(this);
    if (this === window.localStorage) {
      for (const key of keys) {
        void removeAppState(key).catch(error => console.error('IndexedDB clear failed:', key, error));
      }
    }
  };
  storageMirrorInstalled = true;
}

/** IndexedDB is authoritative after migration; existing localStorage is imported once. */
export async function migrateLegacyStorage(keys: string[]): Promise<void> {
  const localKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith('bobworld_')));
  const indexed = await readAllAppState();
  const allKeys = new Set([...keys, ...localKeys, ...Object.keys(indexed).filter(key => key.startsWith('bobworld_'))]);
  for (const key of allKeys) {
    const indexedValue = indexed[key];
    const legacyValue = window.localStorage.getItem(key);
    if (typeof indexedValue === 'string') window.localStorage.setItem(key, indexedValue);
    else if (legacyValue !== null) await writeAppState(key, legacyValue);
  }
  installStorageMirror();
}

/** Persist all application-namespaced keys atomically, not only the caller's partial list. */
export async function persistStorageKeys(keys: string[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const updatedAt = new Date().toISOString();
    const localKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
      .filter((key): key is string => Boolean(key && key.startsWith('bobworld_')));
    try {
      for (const key of new Set([...keys, ...localKeys])) {
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
  'bobworld_otp_notification_avatar',
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