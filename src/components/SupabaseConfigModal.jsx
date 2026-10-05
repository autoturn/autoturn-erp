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
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
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
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setStatus({ type: 'error', message: `Connection failed: ${res.message}. Please verify your SQL table is created.` });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card supabase-config-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge bg-emerald-50 text-emerald-600">
              <Database size={18} />
            </div>
            <div>
              <h2 className="modal-title">Supabase Cloud Database Storage</h2>
              <p className="modal-subtitle">Connect AUTOTURN ERP directly to your PostgreSQL cloud database</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body modern-modal-body">
          {/* Status Message */}
          {status && (
            <div className={`p-2.5 rounded text-xs font-semibold flex items-center gap-2 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="op-input-group">
              <label className="op-input-label">Project URL</label>
              <input 
                type="url"
                className="op-form-input mono-font"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="op-input-group">
              <label className="op-input-label">Anon / Public API Key</label>
              <input 
                type="password"
                className="op-form-input mono-font"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => setKey(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-600 flex items-center gap-1 hover:underline font-semibold"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink size={11} />
              </a>

              <button 
                type="submit" 
                disabled={testing}
                className="btn-save-record"
                style={{ padding: '6px 14px', fontSize: '0.76rem' }}
              >
                <ShieldCheck size={14} />
                <span>{testing ? 'Testing Connection...' : 'Save & Connect'}</span>
              </button>
            </div>
          </form>

          {/* Step 1: SQL Setup Script */}
          <div className="mt-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800">1-Minute Database Setup Script:</span>
              <button 
                type="button" 
                onClick={handleCopySql}
                className="text-xs text-indigo-600 flex items-center gap-1 font-bold hover:underline"
              >
                {copiedSql ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <pre className="text-2xs bg-slate-900 text-slate-200 p-2.5 rounded overflow-x-auto font-mono max-h-36 leading-tight select-all">
              {sqlCode}
            </pre>
            <p className="text-3xs text-slate-500 mt-1">
              Paste this in <strong>Supabase &gt; SQL Editor &gt; New Query &gt; Run</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
