// Minimal change-notification layer over the in-memory db.
// Components read db through helpers; after a mutation, call refresh()
// to re-render. When Supabase is configured (see backend.js) the db is
// hydrated from it at startup and mutations are written through.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getPersistenceStatus,
  initBackend,
  isRemote,
  retryPendingSaves,
  subscribePersistence,
} from './backend.js';
import { migrateEngagementStatuses } from './helpers.js';

// backend: 'demo' (explicit local demo mode, changes not saved),
// 'loading', 'remote', or 'error'.
const DbContext = createContext({
  version: 0,
  refresh: () => {},
  backend: 'demo',
  backendError: null,
  persistence: getPersistenceStatus(),
  retryPendingSaves,
});

export function DbProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [backend, setBackend] = useState(isRemote() ? 'loading' : 'demo');
  const [backendError, setBackendError] = useState(null);
  const [persistence, setPersistence] = useState(getPersistenceStatus);
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  const connectBackend = useCallback(async () => {
    setBackend('loading');
    setBackendError(null);
    try {
      await initBackend();
      migrateEngagementStatuses();
      setBackend('remote');
    } catch (error) {
      console.error('Backend initialization error:', error);
      setBackendError(error?.message || 'Database unavailable');
      setBackend('error');
    }
  }, []);

  useEffect(() => {
    // Normalize any legacy engagement statuses already in the in-memory db
    // (demo mode); remote data is normalized again after it hydrates below.
    migrateEngagementStatuses();
    if (!isRemote()) return;
    let active = true;
    initBackend()
      .then(() => {
        if (!active) return;
        migrateEngagementStatuses();
        setBackend('remote');
      })
      .catch(error => {
        if (!active) return;
        console.error('Backend initialization error:', error);
        setBackendError(error?.message || 'Database unavailable');
        setBackend('error');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => subscribePersistence(setPersistence), []);

  if (backend === 'loading') {
    return <div className="backend-splash" role="status">Loading saved data…</div>;
  }
  if (backend === 'error') {
    return (
      <div className="backend-splash backend-splash-error" role="alert">
        <strong>Your data could not be loaded.</strong>
        <span>Editing is disabled so no changes can be lost. {backendError}</span>
        <button className="btn" type="button" onClick={connectBackend}>Retry connection</button>
      </div>
    );
  }
  return (
    <DbContext.Provider value={{
      version,
      refresh,
      backend,
      backendError,
      persistence,
      retryPendingSaves,
    }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
