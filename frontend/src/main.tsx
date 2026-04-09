import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './CSS/index.css'
import App from './App.tsx'

const originalFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
  const headers = new Headers(init.headers || (typeof input !== 'string' && !(input instanceof URL) ? input.headers : undefined));

  if (url.startsWith('http://localhost:5000/api/')) {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return originalFetch(input, { ...init, headers });
}) as typeof window.fetch;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
