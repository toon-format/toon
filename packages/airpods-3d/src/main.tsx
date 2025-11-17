import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload del modelo (si existe)
import { preloadAirPodsModel } from './components/AirPodsModel';

preloadAirPodsModel();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
