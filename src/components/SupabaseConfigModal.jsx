import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, testSupabaseConnection } from '../utils/supabase.js';

export function SupabaseConfigModal({ isOpen, onClose, onConnectionChanged }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url || '');
      setKey(cfg.key || '');
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlCode = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS production_weighing_records (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  shift TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  operator_id TEXT,
  machine_type TEXT NOT NULL,
  ai_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  weight NUMERIC,
  unit TEXT DEFAULT 'pcs',
  entry_by TEXT DEFAULT 'Sayali Madam',
  timestamp TEXT,
  method TEXT DEFAULT 'Voice Entry',
  status TEXT DEFAULT 'Verified',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE production_weighing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON production_weighing_records FOR ALL USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setStatus({ type: 'error', message: 'Please enter both Supabase URL and Anon API Key' });
      return;
    }

    setTesting(true);
    setStatus(null);

    const res = await testSupabaseConnection(url.trim(), key.trim());
    setTesting(false);

    if (res.success) {
      saveStoredSupabaseConfig(url, key);
      setStatus({ type: 'success', message: 'Connected & saved! Production records will now auto-sync to Supabase cloud.' });
      if (onConnectionChanged) onConnectionChanged(true);
      setTimeout(() => { onClose(); }, 1800);
    } else {
      setStatus({ type: 'error', message: `Connection failed: ${res.message}. Please verify your SQL table is created.` });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-handle-bar"><div className="modal-handle" /></div>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{
              background: 'var(--brand-emerald-bg)',
              color: 'var(--brand-emerald)',
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={17} />
            </div>
            <div>
              <h2 className="modal-title">Supabase Cloud Sync</h2>
              <p className="modal-subtitle">Connect to PostgreSQL cloud database</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ gap: 12 }}>

          {/* Status Message */}
          {status && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.76rem',
              fontWeight: 600,
              background: status.type === 'success' ? 'var(--brand-emerald-bg)' : 'var(--brand-rose-bg)',
              color: status.type === 'success' ? 'var(--brand-emerald-text)' : 'var(--brand-rose-text)',
              border: `1px solid ${status.type === 'success' ? 'var(--brand-emerald-border)' : 'var(--brand-rose-border)'}`,
            }}>
              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Config Info */}
          <div className="config-info-box">
            📌 <strong>How to setup:</strong> Create a Supabase project at supabase.com, run the SQL below, then paste your Project URL and Anon Key.
          </div>

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="config-input-group">
              <label className="config-label">Supabase Project URL</label>
              <input
                type="url"
                className="config-input"
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="config-input-group">
              <label className="config-label">Anon / Public API Key</label>
              <input
                type="password"
                className="config-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => setKey(e.target.value)}
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.72rem', color: 'var(--brand-primary)',
                  fontWeight: 700, textDecoration: 'none'
                }}
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink size={11} />
              </a>

              <button
                type="submit"
                disabled={testing}
                className="btn-save-operator"
                style={{ padding: '7px 16px', fontSize: '0.78rem', gap: 6 }}
              >
                <ShieldCheck size={14} />
                <span>{testing ? 'Testing…' : 'Save & Connect'}</span>
              </button>
            </div>
          </form>

          {/* SQL Setup Script */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                📋 1-Minute Database Setup SQL:
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.7rem', fontWeight: 700,
                  color: copiedSql ? 'var(--brand-emerald-text)' : 'var(--brand-primary)',
                  background: 'none', border: 'none', cursor: 'pointer'
                }}
              >
                {copiedSql ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre style={{
              fontSize: '0.62rem',
              background: '#0f172a',
              color: '#94a3b8',
              padding: '10px 12px',
              borderRadius: 8,
              overflowX: 'auto',
              fontFamily: 'var(--font-mono)',
              maxHeight: 140,
              lineHeight: 1.5,
              userSelect: 'all',
            }}>
              {sqlCode}
            </pre>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Paste this in <strong>Supabase → SQL Editor → New Query → Run</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
