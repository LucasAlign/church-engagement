import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initBackend, isRemote, subscribeSaveFailures } from './backend.js';
import { migrateEngagementStatuses } from './helpers.js';

const BACKEND_TIMEOUT_MS = 15000;
const DbContext = createContext({
  version: 0,
  refresh: () => {},
  backend: 'demo',
  backendError: null,
  saveFailure: null,
  retrySave: async () => {},
  dismissSaveFailure: () => {},
});

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timed out')), ms)),
  ]);
}

export function DbProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [backend, setBackend] = useState(isRemote() ? 'loading' : 'demo');
  const [backendError, setBackendError] = useState(null);
  const [saveFailure, setSaveFailure] = useState(null);
  const refresh = useCallback(() => setVersion(value => value + 1), []);

  useEffect(() => {
    migrateEngagementStatuses();
    if (!isRemote()) return undefined;
    let active = true;
    withTimeout(initBackend(), BACKEND_TIMEOUT_MS)
      .then(() => {
        if (!active) return;
        migrateEngagementStatuses();
        setBackend('remote');
      })
      .catch(error => {
        if (!active) return;
        console.error('Backend initialization error:', error);
        setBackendError(error instanceof Error ? error.message : String(error));
        setBackend('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeSaveFailures(setSaveFailure), []);

  const retrySave = useCallback(async () => {
    if (!saveFailure) return;
    const result = await saveFailure.retry();
    if (result.ok) setSaveFailure(null);
  }, [saveFailure]);
  const dismissSaveFailure = useCallback(() => setSaveFailure(null), []);

  if (backend === 'loading') return <div className="backend-splash">Loading data…</div>;
  if (backend === 'error') {
    return (
      <div className="backend-splash" role="alert">
        <div>
          <strong>Could not load the database.</strong>
          <div>{backendError}</div>
          <button className="btn primary" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <DbContext.Provider value={{
      version, refresh, backend, backendError, saveFailure, retrySave, dismissSaveFailure,
    }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
