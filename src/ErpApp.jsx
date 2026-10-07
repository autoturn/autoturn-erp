import React, { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, loadFromStorage } from './utils/storage.js';
import { fetchRecordsFromSupabase, getStoredSupabaseConfig } from './utils/supabase.js';
import { ErpLoginPage } from './components/ErpLoginPage.jsx';
import { ProductionErpPortal } from './components/ProductionErpPortal.jsx';

const SESSION_KEY = 'autoturn_production_user';
const REFRESH_MS = 20000;

/**
 * Production ERP — a separate application (route: /erp).
 * It is LINKED to the Weighing Desk (route: /) only through shared data:
 *   1. Same-device: reads the desk's records from localStorage (live, via storage events)
 *   2. Any device : pulls the desk's records from Supabase every 20 seconds
 */
export default function ErpApp() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [records, setRecords] = useState(() => loadFromStorage(STORAGE_KEYS.RECORDS, []) || []);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const cfg = getStoredSupabaseConfig();
  const isCloudConnected = Boolean(cfg.url && cfg.key);

  const refresh = useCallback(async () => {
    const local = loadFromStorage(STORAGE_KEYS.RECORDS, []) || [];
    setSyncing(true);
    const cloud = await fetchRecordsFromSupabase();
    setSyncing(false);
    if (cloud) {
      const map = new Map();
      cloud.forEach(r => map.set(r.id, r));
      local.forEach(r => { if (!map.has(r.id)) map.set(r.id, r); });
      setRecords(Array.from(map.values()));
      setLastSync(new Date());
    } else {
      setRecords(local);
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.RECORDS) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [user, refresh]);

  const handleLogin = (u) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const goToDesk = () => { window.location.href = '/'; };

  if (!user) {
    return <ErpLoginPage onLoginSuccess={handleLogin} onGoToWeighing={goToDesk} />;
  }

  return (
    <ProductionErpPortal
      records={records}
      currentUser={user}
      onLogout={handleLogout}
      onGoToWeighing={goToDesk}
      isCloudConnected={isCloudConnected}
      onRefresh={refresh}
      syncing={syncing}
      lastSync={lastSync}
    />
  );
}
