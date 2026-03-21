export const TIKTOK_AUTH_FLOW_STORAGE_KEY = 'fancambo.tiktok.auth_flow';
export const TIKTOK_SESSION_STORAGE_KEY = 'fancambo.tiktok.session';
export const TIKTOK_SCOPES = ['user.info.basic', 'video.upload'] as const;
export const TIKTOK_SCOPE_PARAM = TIKTOK_SCOPES.join(',');
export const TIKTOK_DASHBOARD_HASH = '#/dashboard/upload';

export type TikTokProfile = {
  avatarUrl: string | null;
  displayName: string | null;
  openId: string;
};

export type TikTokSession = {
  accessToken: string;
  authCode: string;
  connectedAt: number;
  expiresAt: number;
  openId: string;
  profile: TikTokProfile | null;
  refreshExpiresAt: number | null;
  refreshToken: string | null;
  scope: string[];
  tokenType: string | null;
};

type TikTokAuthFlow = {
  clientKey: string;
  clientSecret: string;
  homeUrl: string;
  redirectUri: string;
  scope: string;
  startedAt: number;
  state: string;
};

export function getTikTokConfig() {
  const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY?.trim() || '';
  const clientSecret = import.meta.env.VITE_TIKTOK_CLIENT_SECRET?.trim() || '';

  return {
    clientKey,
    clientSecret,
    isConfigured: Boolean(clientKey && clientSecret),
    missingValues: [
      !clientKey ? 'VITE_TIKTOK_CLIENT_KEY' : null,
      !clientSecret ? 'VITE_TIKTOK_CLIENT_SECRET' : null,
    ].filter(Boolean) as string[],
  };
}

export function createTikTokAuthFlow(): TikTokAuthFlow {
  const config = getTikTokConfig();

  if (!config.isConfigured) {
    throw new Error(`Missing TikTok configuration: ${config.missingValues.join(', ')}`);
  }

  return {
    clientKey: config.clientKey,
    clientSecret: config.clientSecret,
    homeUrl: getHomeUrl(),
    redirectUri: getTikTokCallbackUrl(),
    scope: TIKTOK_SCOPE_PARAM,
    startedAt: Date.now(),
    state: createRandomState(),
  };
}

export function startTikTokAuth() {
  const flow = createTikTokAuthFlow();
  persistAuthFlow(flow);

  const params = new URLSearchParams({
    client_key: flow.clientKey,
    redirect_uri: flow.redirectUri,
    response_type: 'code',
    scope: flow.scope,
    state: flow.state,
  });

  window.location.assign(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
}

export function getHomeUrl() {
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
}

export function getDashboardUrl() {
  const url = new URL(getHomeUrl());
  url.hash = TIKTOK_DASHBOARD_HASH;
  return url.toString();
}

export function getTikTokCallbackUrl() {
  return new URL('auth/callback.html', getHomeUrl()).toString();
}

export function persistTikTokSession(session: TikTokSession) {
  localStorage.setItem(TIKTOK_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readTikTokSession() {
  return readJson<TikTokSession>(TIKTOK_SESSION_STORAGE_KEY);
}

export function clearTikTokSession() {
  localStorage.removeItem(TIKTOK_SESSION_STORAGE_KEY);
}

export function clearTikTokStoredData() {
  clearTikTokSession();
  clearAuthFlow();
}

export function persistAuthFlow(flow: TikTokAuthFlow) {
  localStorage.setItem(TIKTOK_AUTH_FLOW_STORAGE_KEY, JSON.stringify(flow));
}

export function readAuthFlow() {
  return readJson<TikTokAuthFlow>(TIKTOK_AUTH_FLOW_STORAGE_KEY);
}

export function clearAuthFlow() {
  localStorage.removeItem(TIKTOK_AUTH_FLOW_STORAGE_KEY);
}

function readJson<T>(storageKey: string) {
  const rawValue = localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function createRandomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
