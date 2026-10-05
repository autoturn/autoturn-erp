import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Cloud, 
  Globe, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Download, 
  RefreshCw 
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

export function CloudSyncModal({ isOpen, onClose, recordsCount }) {
  const [supabaseUrl, setSupabaseUrl] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SUPABASE_CONFIG, {}).url || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(() => 
    loadFromStorage(STORAGE_KEYS.SUPABASE_CONFIG, {}).key || ''
  );
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Local Mode Active');

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    saveToStorage(STORAGE_KEYS.SUPABASE_CONFIG, { url: supabaseUrl, key: supabaseKey });
    setSyncStatus('Configuration Saved! Ready to connect.');
    setTimeout(() => setSyncStatus('Ready for Supabase Push'), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card cloud-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Cloud size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="modal-title">Cloud Architecture & Deployment</h2>
              <p className="modal-subtitle">Supabase database sync & Netlify production deployment</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Phase Roadmap Status */}
          <div className="roadmap-grid">
            <div className="roadmap-step step-complete">
              <div className="step-num">Step 1</div>
              <div className="step-title">Local ERP Active</div>
              <div className="step-desc">All entries saved in browser storage ({recordsCount} records)</div>
              <span className="step-badge-green">● Running Now</span>
            </div>

            <div className="roadmap-step step-ready">
              <div className="step-num">Step 2</div>
              <div className="step-title">Supabase Database</div>
              <div className="step-desc">PostgreSQL tables & real-time sync for shopfloor</div>
              <span className="step-badge-blue">Ready to Connect</span>
            </div>

            <div className="roadmap-step step-ready">
              <div className="step-num">Step 3</div>
              <div className="step-title">Netlify Live URL</div>
              <div className="step-desc">Production hosting with HTTPS & PWA capabilities</div>
              <span className="step-badge-blue">Configuration Ready</span>
            </div>
          </div>

          {/* Supabase Schema Copy Section */}
          <div className="schema-card">
            <div className="schema-header">
              <div>
                <h4 className="schema-title">1. Supabase PostgreSQL Schema</h4>
                <p className="schema-subtitle">Copy and run this in your Supabase SQL Editor to create the ERP tables</p>
              </div>
              <button 
                type="button" 
                className="btn-copy-sql"
                onClick={handleCopySql}
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <pre className="sql-code-block mono-font">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>

          {/* Supabase Credentials Form */}
          <form onSubmit={handleSaveConfig} className="supabase-config-form">
            <h4 className="config-form-title">2. Connect Supabase Project (Optional for cloud sync)</h4>
            <div className="config-grid">
              <div>
                <label className="field-label">Supabase Project URL:</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Supabase Anon Public API Key:</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                />
              </div>
            </div>

            <div className="config-submit-row">
              <span className="sync-status-indicator">{syncStatus}</span>
              <button type="submit" className="btn-primary">
                Save Credentials
              </button>
            </div>
          </form>

          {/* Netlify Deployment Guide */}
          <div className="netlify-card">
            <div className="netlify-header">
              <Globe size={18} className="text-teal-600" />
              <h4 className="netlify-title">3. Netlify 1-Click Deployment</h4>
            </div>
            <p className="netlify-desc">
              We have generated <code>netlify.toml</code> with build commands (<code>npm run build</code>) and SPA redirects.
              To deploy:
            </p>
            <ol className="netlify-steps">
              <li>Push this project directory to GitHub or drag the <code>dist/</code> folder into Netlify Drop.</li>
              <li>Netlify will automatically build and assign a custom HTTPS domain (e.g. <code>apexerp-shopfloor.netlify.app</code>).</li>
              <li>Sayali Madam and plant operators can install it on any mobile or tablet via "Add to Home Screen"!</li>
            </ol>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
