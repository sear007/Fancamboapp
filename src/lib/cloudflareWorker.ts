const DEFAULT_CLOUDFLARE_WORKER_URL = 'https://fancambo-worker.koungbuntha.workers.dev';
const DEFAULT_WORKER_ALLOWED_ORIGINS = new Set(['https://sear007.github.io']);

export function getWorkerBaseUrl() {
  const configuredValue = import.meta.env.VITE_CLOUDFLARE_WORKER_URL?.trim() || '';

  if (configuredValue) {
    return normalizeAbsoluteUrl(configuredValue);
  }

  if (shouldUseDefaultWorkerUrl()) {
    return DEFAULT_CLOUDFLARE_WORKER_URL;
  }

  return '';
}

export function getWorkerApiUrl(path: string) {
  const baseUrl = getWorkerBaseUrl();

  if (!baseUrl) {
    throw new Error('Missing VITE_CLOUDFLARE_WORKER_URL.');
  }

  const normalizedPath = path.replace(/^\/+/, '');
  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

export function normalizeAbsoluteUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const url = new URL(trimmedValue);
  return url.toString().replace(/\/+$/, '');
}

function shouldUseDefaultWorkerUrl() {
  if (typeof window === 'undefined') {
    return false;
  }

  return DEFAULT_WORKER_ALLOWED_ORIGINS.has(window.location.origin);
}
