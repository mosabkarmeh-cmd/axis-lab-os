import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './components/NotificationProvider.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason ? (reason.message || reason.stack || reason.toString()) : '';
    if (reasonStr && (reasonStr.includes('WebSocket') || reasonStr.includes('websocket') || reasonStr.includes('ws://') || reasonStr.includes('wss://'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg && (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('ws://') || msg.includes('wss://'))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// Authentication is handled by the server-side HttpOnly session cookie.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
