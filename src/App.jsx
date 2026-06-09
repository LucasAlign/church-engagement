import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Churches from './pages/Churches.jsx';
import ChurchProfile from './pages/ChurchProfile.jsx';
import Interactions from './pages/Interactions.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Giving from './pages/Giving.jsx';
import ImpactReports from './pages/ImpactReports.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/churches" element={<Churches />} />
        <Route path="/churches/:id" element={<ChurchProfile />} />
        <Route path="/interactions" element={<Interactions />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/giving" element={<Giving />} />
        <Route path="/reports" element={<ImpactReports />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  );
}
