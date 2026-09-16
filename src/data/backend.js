// Client for the same-origin Replit/Express persistence API. In demo mode the
// in-memory database remains writable but changes intentionally do not persist.
import db from './db.js';
import { createPersistenceQueue } from './persistenceQueue.js';

const COLLECTIONS = Object.keys(db);
const forceDemo = import.meta.env?.VITE_DEMO_MODE === 'true';
const apiEnabled = !forceDemo && (!!import.meta.env?.PROD || !!import.meta.env?.VITE_API_URL);
const apiBase = String(import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const saveFailureListeners = new Set();

export function isRemote() {
  return apiEnabled;
}

async function request(path, options) {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.code = body.code || String(response.status);
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

const persistenceQueue = createPersistenceQueue({
  storage: typeof window === 'undefined' ? null : window.localStorage,
  autoFlush: apiEnabled,
  async send(operation) {
    const path = `/data/${encodeURIComponent(operation.collection)}/${encodeURIComponent(operation.id)}`;
    if (operation.type === 'delete') {
      await request(path, { method: 'DELETE' });
      return;
    }
    await request(path, {
      method: 'PUT',
      body: JSON.stringify({ data: operation.record }),
    });
  },
});

function applyPendingOperations() {
  for (const operation of persistenceQueue.pendingOperations()) {
    const collection = db[operation.collection];
    if (!Array.isArray(collection)) continue;
    const index = collection.findIndex(record => record.id === operation.id);
    if (operation.type === 'delete') {
      if (index >= 0) collection.splice(index, 1);
    } else if (index >= 0) {
      collection[index] = operation.record;
    } else {
      collection.push(operation.record);
    }
  }
}

export async function initBackend() {
  if (!apiEnabled) return { loaded: 0 };
  const payload = await request('/data');
  let loaded = 0;
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(payload[collection])) continue;
    db[collection].length = 0;
    db[collection].push(...payload[collection]);
    loaded += 1;
  }
  // The server can be behind edits that were safely queued in this browser.
  // Reapply them after hydration so reconnecting never rolls the UI backward.
  applyPendingOperations();
  void persistenceQueue.flush();
  return { loaded };
}

export function subscribeSaveFailures(listener) {
  saveFailureListeners.add(listener);
  return () => saveFailureListeners.delete(listener);
}

export function subscribePersistence(listener) {
  return persistenceQueue.subscribe(listener);
}

export function getPersistenceStatus() {
  return persistenceQueue.getStatus();
}

export function retryPendingSaves() {
  return persistenceQueue.flush();
}

export async function saveRecord(collection, record) {
  if (!apiEnabled) return { ok: true };
  persistenceQueue.enqueuePut(collection, record);
  const result = await persistenceQueue.flush();
  if (!result.ok) {
    const error = result.error;
    const failure = {
      id: `${collection}:${record.id}`,
      collection,
      recordId: record.id,
      code: error.code || null,
      message: error.message || 'Unknown database error',
      retry: () => saveRecord(collection, record),
    };
    console.error(`Saving ${collection}/${record.id} failed:`, failure.message);
    saveFailureListeners.forEach(listener => listener(failure));
  }
  return result;
}

export async function saveRecords(records) {
  if (!apiEnabled) return { ok: true };
  // Queue the whole import before the first request so closing the tab or a
  // mid-import outage cannot discard records that have already changed in UI.
  records.forEach(({ collection, data }) => persistenceQueue.enqueuePut(collection, data));
  const result = await persistenceQueue.flush();
  return result.ok ? result : { ok: true, queued: true, error: result.error };
}

export async function deleteRecord(collection, id) {
  if (!apiEnabled) return { ok: true };
  persistenceQueue.enqueueDelete(collection, id);
  return persistenceQueue.flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void persistenceQueue.flush());
}
