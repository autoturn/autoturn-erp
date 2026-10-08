import React, { useState, useEffect } from 'react';
import { Clock, Database, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { formatTime12h, getCurrentShift } from '../utils/storage.js';

export function Header({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenOperators,
  onOpenSupabase,
  recordsCount,
  isCloudConnected
}) {
  const [currentTime, setCurrentTime] = useState(formatTime12h());
  const [shift, setShift] = useState(getCurrentShift());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime12h());
      setShift(getCurrentShift());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isDay = shift.includes('Day');

  return (
    <header className="erp-main-header">
      {/* Status Bar */}
      <div className="header-status-bar">
        <div className="status-bar-left">
          <span className="status-dot" />
          <span className="status-label">AUTOTURN ERP</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Live Production</span>
        </div>
        <div className="status-bar-right">
          <span className="status-clock">{currentTime}</span>
          <span className="status-shift-pill">
            {isDay ? '☀️' : '🌙'} {isDay ? 'Day' : 'Night'}
          </span>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="header-nav-row">
        <div className="brand-lockup">
          <div className="brand-logo-wrap">
            <img
              src="/logo.png"
              alt="AUTOTURN"
              className="brand-custom-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="brand-text-group">
            <h1 className="brand-main-title">
              AUTOTURN <span className="brand-highlight">ERP</span>
            </h1>
            <p className="brand-tagline">Shopfloor Weighing Desk</p>
          </div>
        </div>

        <div className="nav-controls-group">
          <button
            type="button"
            className={`header-icon-btn ${isCloudConnected ? 'cloud-active' : ''}`}
            onClick={onOpenSupabase}
            title="Cloud Database"
          >
            {isCloudConnected ? (
              <>
                <CheckCircle2 size={13} />
                <span style={{ display: 'none' }} className="btn-text">Cloud On</span>
              </>
            ) : (
              <>
                <Database size={13} />
                <span style={{ display: 'none' }} className="btn-text">Cloud</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
