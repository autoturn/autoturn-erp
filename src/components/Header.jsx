import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users,
  Database
} from 'lucide-react';
import { formatTime12h } from '../utils/storage.js';

export function Header({
  currentUser,
  onOpenOperators,
  onOpenSupabase,
  recordsCount,
  isCloudConnected
}) {
  const [currentTime, setCurrentTime] = useState(formatTime12h());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime12h());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="erp-main-header">
      {/* Top Status Bar: Clock & Live indicator (Day Shift 7-7 removed as requested) */}
      <div className="header-top-bar">
        <div className="top-bar-left">
          <span className="live-indicator-dot" />
          <span className="live-status-label">Shopfloor Production Weighing</span>
          <span className="separator-bullet">•</span>
          <span className="live-clock-pill">
            <Clock size={11} />
            {currentTime}
          </span>
        </div>

        <div className="top-bar-right">
          <div className="sayali-badge">
            <span className="badge-avatar">👩‍💼</span>
            <span className="badge-text">{currentUser?.name || 'Sayali Madam'}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="header-nav-row">
        {/* Brand with User's AI Logo & AUTOTURN ERP */}
        <div className="brand-lockup">
          <img 
            src="/logo.png" 
            alt="AUTOTURN Logo" 
            className="brand-custom-logo" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div>
            <h1 className="brand-main-title">AUTOTURN <span className="brand-highlight">ERP</span></h1>
            <p className="brand-tagline">Precision Shopfloor Weighing Desk</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="nav-controls-group">
          {/* Cloud Database (Supabase) Setup Button */}
          <button 
            type="button"
            className={`header-pill-btn ${isCloudConnected ? 'connected-cloud' : ''}`}
            onClick={onOpenSupabase}
            title="Configure Supabase Cloud Database"
          >
            <Database size={14} className={isCloudConnected ? 'text-emerald-600' : 'text-slate-500'} />
            <span className="btn-text">{isCloudConnected ? 'Cloud Active' : 'Supabase'}</span>
          </button>

          {/* Operator Master */}
          <button 
            type="button"
            className="header-pill-btn"
            onClick={onOpenOperators}
            title="Manage Shopfloor Operators Master List"
          >
            <Users size={14} />
            <span className="btn-text">Operators</span>
          </button>
        </div>
      </div>
    </header>
  );
}
