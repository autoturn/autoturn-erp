import React from 'react';
import { Scale, FileText, Users, Cpu } from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab, recordsCount, operatorsCount, machinesCount }) {
  return (
    <nav className="erp-bottom-nav">
      <button 
        type="button"
        className={`bottom-nav-item ${activeTab === 'form' ? 'active' : ''}`}
        onClick={() => onSelectTab('form')}
      >
        <div className="nav-icon-wrap">
          <Scale size={18} />
          {activeTab === 'form' && <span className="active-dot" />}
        </div>
        <span className="nav-label">Weigh & Enter</span>
      </button>

      <button 
        type="button"
        className={`bottom-nav-item ${activeTab === 'records' ? 'active' : ''}`}
        onClick={() => onSelectTab('records')}
      >
        <div className="nav-icon-wrap">
          <FileText size={18} />
          {recordsCount > 0 && <span className="nav-badge">{recordsCount}</span>}
        </div>
        <span className="nav-label">Shift Logs</span>
      </button>

      <button 
        type="button"
        className={`bottom-nav-item ${activeTab === 'operators' ? 'active' : ''}`}
        onClick={() => onSelectTab('operators')}
      >
        <div className="nav-icon-wrap">
          <Users size={18} />
          <span className="nav-badge-soft">{operatorsCount}</span>
        </div>
        <span className="nav-label">Operators</span>
      </button>
    </nav>
  );
}
