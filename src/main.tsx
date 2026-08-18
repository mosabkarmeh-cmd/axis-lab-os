import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './components/NotificationProvider.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import './index.css';

// Intercept and ignore Vite's benign WebSocket connection failures in sandboxed environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason ? (reason.message || reason.stack || reason.toString()) : '';
    if (reasonStr && (
      reasonStr.includes('WebSocket') || 
      reasonStr.includes('websocket') || 
      reasonStr.includes('ws://') || 
      reasonStr.includes('wss://')
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg && (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('ws://') || 
      msg.includes('wss://')
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// Global Fetch Interceptor to automatically append the JWT Authorization header safely
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem("axislab_token");
      if (token) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has("Authorization")) {
            init.headers.set("Authorization", `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          if (!init.headers.some(([k]) => k.toLowerCase() === "authorization")) {
            init.headers.push(["Authorization", `Bearer ${token}`]);
          }
        } else {
          if (!init.headers["Authorization"] && !init.headers["authorization"]) {
            init.headers["Authorization"] = `Bearer ${token}`;
          }
        }
      }
      return originalFetch(input, init);
    }
  });
} catch (e) {
  console.warn("Could not intercept fetch globally, falling back to other auth methods:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
