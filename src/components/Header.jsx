import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users,
  Database,
  Download
} from 'lucide-react';
import { formatTime12h } from '../utils/storage.js';

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
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime12h());
    }, 1000);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <header className="erp-main-header">
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
        </div>
      </div>
    </header>
  );
}
