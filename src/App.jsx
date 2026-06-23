import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChurchProfile from './pages/ChurchProfile.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/churches/:id" element={<ChurchProfile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  );
}
