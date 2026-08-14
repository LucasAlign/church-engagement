// Client for the same-origin Replit/Express persistence API. In demo mode the
// in-memory database remains writable but changes intentionally do not persist.
import db from './db.js';

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
  return { loaded };
}

export function subscribeSaveFailures(listener) {
  saveFailureListeners.add(listener);
  return () => saveFailureListeners.delete(listener);
}

export async function saveRecord(collection, record) {
  if (!apiEnabled) return { ok: true };
  try {
    await request(`/data/${encodeURIComponent(collection)}/${encodeURIComponent(record.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ data: record }),
    });
    return { ok: true };
  } catch (error) {
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
    return { ok: false, error };
  }
}
