import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Repeat,
  BarChart3,
  BellRing
} from 'lucide-react';
import '../erp.css';

export const ERP_PIN_KEY = 'autoturn_erp_pin';

export function getErpPin() {
  return localStorage.getItem(ERP_PIN_KEY) || '1234';
}

const ERP_ACCOUNTS = {
  'production.head': { name: 'Prakash Patil', role: 'Production Head' },
  'planning': { name: 'Planning Desk', role: 'Production Planner' },
  'supervisor': { name: 'Shift Supervisor', role: 'Machine Supervisor' },
  'admin': { name: 'ERP Administrator', role: 'Administrator' }
};

export function ErpLoginPage({ onLoginSuccess, onGoToWeighing }) {
  const [username, setUsername] = useState(() => localStorage.getItem('autoturn_erp_last_user') || '');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const user = username.trim().toLowerCase();
    if (!user) return setError('Please enter your User ID.');
    if (!pin) return setError('Please enter your password / PIN.');
    if (pin !== getErpPin()) return setError('Incorrect password. Please try again.');

    setLoading(true);
    const account = ERP_ACCOUNTS[user] || { name: username.trim(), role: 'Production User' };
    if (remember) localStorage.setItem('autoturn_erp_last_user', username.trim());
    setTimeout(() => {
      onLoginSuccess({ username: user, name: account.name, role: account.role, loginAt: new Date().toISOString() });
    }, 350);
  };

  return (
    <div className="ax-login">
      {/* Brand panel */}
      <aside className="ax-login-brand">
        <div className="ax-login-logo-row">
          <img src="/logo.png" alt="AUTOTURN" className="ax-login-logo" />
          <div>
            <div className="ax-login-wordmark">AUTOTURN <span>ERP</span></div>
            <div className="ax-login-sub">Manufacturing Execution Suite</div>
          </div>
        </div>

        <div className="ax-login-hero">
          <h2>Production Planning &amp; Changeover Control</h2>
          <p>
            Live October schedule vs. shopfloor production for every machine section —
            Sliding Head, CNC, Grinding, Rolling and VMC — with automatic changeover and excess alerts.
          </p>
          <div className="ax-login-features">
            <div className="ax-login-feature">
              <div className="ax-login-feature-ico"><BarChart3 size={16} /></div>
              <div>
                <b>Schedule vs Produced</b>
                <span>AI-wise target, produced till now and pending balance</span>
              </div>
            </div>
            <div className="ax-login-feature">
              <div className="ax-login-feature-ico"><Repeat size={16} /></div>
              <div>
                <b>Changeover Control</b>
                <span>Triggered the moment produced quantity reaches the schedule</span>
              </div>
            </div>
            <div className="ax-login-feature">
              <div className="ax-login-feature-ico"><BellRing size={16} /></div>
              <div>
                <b>Excess Alerts</b>
                <span>Exact over-production quantity for every AI number</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ax-login-foot">© {new Date().getFullYear()} AUTOTURN • Chakan MIDC, Pune</div>
      </aside>

      {/* Sign-in panel */}
      <main className="ax-login-panel">
        <form className="ax-login-card" onSubmit={handleSubmit} noValidate>
          <h1>Sign in</h1>
          <p className="ax-login-lead">Use your AUTOTURN ERP credentials to continue.</p>

          {error && (
            <div className="ax-alert-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="ax-field">
            <label className="ax-label" htmlFor="erp-user">User ID</label>
            <div className="ax-input-wrap">
              <User size={16} />
              <input
                id="erp-user"
                type="text"
                autoComplete="username"
                placeholder="e.g. production.head"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="ax-field">
            <label className="ax-label" htmlFor="erp-pin">Password / PIN</label>
            <div className="ax-input-wrap">
              <Lock size={16} />
              <input
                id="erp-pin"
                type={showPin ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              <button type="button" className="ax-eye" onClick={() => setShowPin(s => !s)} aria-label="Toggle password">
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="ax-login-row">
            <label>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember User ID
            </label>
          </div>

          <button type="submit" className="ax-btn ax-btn-primary ax-btn-lg" disabled={loading} id="erp-signin-btn">
            {loading ? 'Signing in…' : (<>Sign in <ArrowRight size={16} /></>)}
          </button>

          <div className="ax-login-divider">Shopfloor</div>

          <button type="button" className="ax-btn ax-btn-lg" onClick={onGoToWeighing} id="erp-back-weighing-btn">
            <ArrowLeft size={16} /> Back to Weighing Desk
          </button>

          <div className="ax-login-secure">
            <ShieldCheck size={13} /> Authorized plant personnel only
          </div>
        </form>
      </main>
    </div>
  );
}
