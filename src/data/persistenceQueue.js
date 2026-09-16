const DEFAULT_STORAGE_KEY = 'engage:persistence-queue:v1';

function loadOperations(storage, storageKey) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter(operation => operation?.collection && operation?.id) : [];
  } catch {
    return [];
  }
}

export function createPersistenceQueue({
  storage = null,
  storageKey = DEFAULT_STORAGE_KEY,
  send,
  autoFlush = true,
  retryDelay = attempt => Math.min(30_000, 1_000 * (2 ** Math.min(attempt, 5))),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (typeof send !== 'function') throw new Error('Persistence queue requires a send function');

  let operations = loadOperations(storage, storageKey);
  let sequence = 0;
  let inFlight = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let status = {
    state: operations.length ? 'pending' : 'idle',
    pending: operations.length,
    error: null,
    durable: Boolean(storage),
    lastSavedAt: null,
  };
  const listeners = new Set();

  const notify = patch => {
    status = { ...status, ...patch, pending: operations.length };
    listeners.forEach(listener => listener({ ...status }));
  };

  const persist = () => {
    if (!storage) return false;
    try {
      if (operations.length === 0) storage.removeItem(storageKey);
      else storage.setItem(storageKey, JSON.stringify(operations));
      return true;
    } catch {
      return false;
    }
  };

  const scheduleRetry = () => {
    if (!autoFlush || retryTimer || operations.length === 0) return;
    retryTimer = setTimer(() => {
      retryTimer = null;
      flush();
    }, retryDelay(retryAttempt));
  };

  const enqueue = operation => {
    const key = `${operation.collection}:${operation.id}`;
    operations = operations.filter(item => `${item.collection}:${item.id}` !== key);
    operations.push({ ...operation, token: `${Date.now()}-${sequence += 1}` });
    const durable = persist();
    notify({
      state: 'pending',
      durable,
      error: durable ? null : 'This browser could not store the pending change locally.',
    });
    if (autoFlush) queueMicrotask(() => flush());
  };

  async function flush() {
    if (inFlight) return inFlight;
    if (operations.length === 0) return { ok: true, pending: 0 };

    inFlight = (async () => {
      notify({ state: 'saving', error: null });
      while (operations.length > 0) {
        const operation = operations[0];
        try {
          await send(operation);
          if (operations[0]?.token === operation.token) operations.shift();
          persist();
          retryAttempt = 0;
          notify({
            state: operations.length ? 'saving' : 'saved',
            error: null,
            lastSavedAt: operations.length ? status.lastSavedAt : new Date().toISOString(),
          });
        } catch (error) {
          retryAttempt += 1;
          notify({ state: 'pending', error: error?.message || 'Database unavailable' });
          scheduleRetry();
          return { ok: false, error, pending: operations.length };
        }
      }
      return { ok: true, pending: 0 };
    })().finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    enqueuePut(collection, record) {
      if (!record?.id) throw new Error('Saved records require an id');
      enqueue({ type: 'put', collection, id: record.id, record });
    },
    enqueueDelete(collection, id) {
      enqueue({ type: 'delete', collection, id });
    },
    flush,
    pendingCount: () => operations.length,
    pendingOperations: () => operations.map(operation => ({ ...operation })),
    getStatus: () => ({ ...status }),
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...status });
      return () => listeners.delete(listener);
    },
    dispose() {
      if (retryTimer) clearTimer(retryTimer);
      retryTimer = null;
      listeners.clear();
    },
  };
}
