// Minimal change-notification layer over the in-memory db.
// Components read db through helpers; after a mutation, call refresh()
// to re-render. When Supabase is configured (see backend.js) the db is
// hydrated from it at startup and mutations are written through.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initBackend, isRemote } from './backend.js';

// backend: 'demo' (no Supabase config, changes not saved),
// 'loading', 'remote', or 'error'.
const DbContext = createContext({ version: 0, refresh: () => {}, backend: 'demo', backendError: null });

export function DbProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [backend, setBackend] = useState(isRemote() ? 'loading' : 'demo');
  const [backendError, setBackendError] = useState(null);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    if (!isRemote()) return;
    initBackend()
      .then(() => setBackend('remote'))
      .catch(err => {
        console.error(err);
        setBackendError(err.message);
        setBackend('error');
      });
  }, []);
  if (backend === 'loading') {
    return <div className="backend-splash">Loading data…</div>;
  }
  return (
    <DbContext.Provider value={{ version, refresh, backend, backendError }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  return useContext(DbContext);
}
