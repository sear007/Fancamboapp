export function getWorkerBaseUrl() {
  const configuredValue = import.meta.env.VITE_CLOUDFLARE_WORKER_URL?.trim() || '';

  if (!configuredValue) {
    return '';
  }

  return normalizeAbsoluteUrl(configuredValue);
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
