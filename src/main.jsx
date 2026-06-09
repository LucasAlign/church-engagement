import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { DbProvider } from './data/store.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <DbProvider>
        <App />
      </DbProvider>
    </HashRouter>
  </React.StrictMode>,
);
