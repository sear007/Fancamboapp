import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';

import {
  clearTikTokStoredData,
  getTikTokConfig,
  readTikTokSession,
  startTikTokAuth,
  type TikTokSession,
  TIKTOK_SESSION_STORAGE_KEY,
} from '../lib/tiktokAuth';

type TikTokAuthContextValue = {
  isConfigured: boolean;
  isConnected: boolean;
  missingValues: string[];
  session: TikTokSession | null;
  start: () => void;
  logout: () => void;
};

const TikTokAuthContext = createContext<TikTokAuthContextValue | null>(null);

export function TikTokAuthProvider({children}: {children: React.ReactNode}) {
  const config = getTikTokConfig();
  const [session, setSession] = useState<TikTokSession | null>(() => readActiveSession());

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (!event.key || event.key === TIKTOK_SESSION_STORAGE_KEY) {
        setSession(readActiveSession());
      }
    };

    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  const value = useMemo<TikTokAuthContextValue>(
    () => ({
      isConfigured: config.isConfigured,
      isConnected: Boolean(session),
      missingValues: config.missingValues,
      session,
      start: () => startTikTokAuth(),
      logout: () => {
        clearTikTokStoredData();
        window.history.replaceState(null, '', import.meta.env.BASE_URL || '/');
        setSession(null);
      },
    }),
    [config.isConfigured, config.missingValues, session],
  );

  return <TikTokAuthContext.Provider value={value}>{children}</TikTokAuthContext.Provider>;
}

export function useTikTokAuth() {
  const context = useContext(TikTokAuthContext);

  if (!context) {
    throw new Error('useTikTokAuth must be used inside TikTokAuthProvider.');
  }

  return context;
}

function readActiveSession() {
  const session = readTikTokSession();

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    clearTikTokStoredData();
    return null;
  }

  return session;
}
