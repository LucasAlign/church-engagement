// Minimal change-notification layer over the in-memory db.
// Components read db through helpers; after a mutation, call refresh()
// to re-render. Replace with real query hooks when wiring up Supabase.
import { createContext, useCallback, useContext, useState } from 'react';

const DbContext = createContext({ version: 0, refresh: () => {} });

export function DbProvider({ children }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);
  return <DbContext.Provider value={{ version, refresh }}>{children}</DbContext.Provider>;
}

export function useDb() {
  return useContext(DbContext);
}
