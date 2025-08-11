// src/lib/api.js
const DEFAULT_TIMEOUT_MS = 12000;

export function getApiBase() {
  const fromEnv = import.meta.env?.VITE_API_URL;
  return (fromEnv && fromEnv.trim()) || 'http://localhost:3001';
}

export async function apiFetch(path, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  const base = getApiBase();
  const url = `${base.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      const err = new Error(`Request failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return { url, data };
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
