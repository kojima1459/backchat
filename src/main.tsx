import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import LandingPage from './pages/LandingPage.tsx'

const RUNTIME_ERROR_OVERLAY_ID = 'runtime-error-overlay';

const formatErrorMessage = (value: unknown) => {
  if (value instanceof Error) {
    return value.message || String(value);
  }
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return String(value ?? 'Unknown error');
};

const renderRuntimeErrorOverlay = (message: string) => {
  try {
    if (typeof document === 'undefined' || !document.body) return;

    const truncated = message.slice(0, 200);
    let container = document.getElementById(RUNTIME_ERROR_OVERLAY_ID);
    let messageEl: HTMLElement | null = null;

    if (!container) {
      container = document.createElement('div');
      container.id = RUNTIME_ERROR_OVERLAY_ID;
      container.setAttribute(
        'style',
        'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);' +
        'background:#0f172a;color:#fff;padding:10px 12px;border-radius:9999px;' +
        'font-size:12px;max-width:90%;display:flex;gap:8px;align-items:center;' +
        'box-shadow:0 8px 20px rgba(15,23,42,0.25);z-index:9999;'
      );

      messageEl = document.createElement('div');
      messageEl.id = `${RUNTIME_ERROR_OVERLAY_ID}-message`;
      messageEl.setAttribute(
        'style',
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60vw;'
      );

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Reload';
      button.setAttribute(
        'style',
        'background:#ffffff1f;border:none;color:#fff;padding:4px 10px;' +
        'border-radius:9999px;font-size:12px;cursor:pointer;'
      );
      button.addEventListener('click', () => {
        window.location.reload();
      });

      container.append(messageEl, button);
      document.body.appendChild(container);
    } else {
      messageEl = container.querySelector<HTMLElement>(`#${RUNTIME_ERROR_OVERLAY_ID}-message`);
    }

    if (messageEl) {
      messageEl.textContent = truncated;
    }
  } catch (error) {
    console.warn('Runtime error overlay failed:', error);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event: ErrorEvent) => {
    renderRuntimeErrorOverlay(formatErrorMessage(event.error ?? event.message));
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    renderRuntimeErrorOverlay(formatErrorMessage(event.reason));
  });
}

export const Root = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (pathname.startsWith('/lp')) {
    return <LandingPage />;
  }
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
