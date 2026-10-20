import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installViewportSizing } from './lib/viewport'

const disposeViewportSizing = installViewportSizing();
if (import.meta.hot) import.meta.hot.dispose(disposeViewportSizing);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Never cache Vite development modules. Production service workers update on launch.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.error('Offline setup failed:', error));
  });
}
