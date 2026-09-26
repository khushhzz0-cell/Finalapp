import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { lockViewportZoom } from './utils/lockViewportZoom.ts';

// Lock viewport strictly to 1.0x (disables double-tap zoom, pinch-zoom, input auto-zoom)
lockViewportZoom();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
