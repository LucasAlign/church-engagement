import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout.jsx';
import Dashboard from './pages/Dashboard.jsx';

const ChurchProfile = lazy(() => import('./pages/ChurchProfile.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="backend-splash">Loading view…</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/churches/:id" element={<ChurchProfile />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
