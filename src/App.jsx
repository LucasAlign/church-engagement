import React from 'react';
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
import Import from './pages/Import.jsx';

class PageErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err) { console.error('Page render error:', err); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--red-400)' }}>
            Something went wrong rendering this page
          </div>
          <code style={{ fontSize: 12, display: 'block', marginBottom: 16, color: 'var(--text-secondary)' }}>
            {this.state.error.message}
          </code>
          <button className="btn" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppShell>
      <PageErrorBoundary>
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
          <Route path="/import" element={<Import />} />
        </Routes>
      </PageErrorBoundary>
    </AppShell>
  );
}
