import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './CSS/index.css'
import App from './App.tsx'

const API_BASE = '/api'

const originalFetch = window.fetch.bind(window);
const pendingGetRequests = new Map<string, Promise<Response>>();

const cloneResponse = async (responsePromise: Promise<Response>) => {
  const response = await responsePromise;
  return response.clone();
};

window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
  const headers = new Headers(init.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));

  if (url.startsWith(`${API_BASE}/`)) {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const method = (init.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase();
  const isApiGet = method === 'GET' && url.startsWith(`${API_BASE}/`);

  if (isApiGet) {
    const cacheKey = `${headers.get('Authorization') || ''}:${url}`;
    const pendingRequest = pendingGetRequests.get(cacheKey);

    if (pendingRequest) {
      return cloneResponse(pendingRequest);
    }

    const request = originalFetch(input, { ...init, headers });
    pendingGetRequests.set(cacheKey, request);
    request.then(
      () => pendingGetRequests.delete(cacheKey),
      () => pendingGetRequests.delete(cacheKey)
    );

    return cloneResponse(request);
  }

  return originalFetch(input, { ...init, headers });
}) as typeof window.fetch;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
