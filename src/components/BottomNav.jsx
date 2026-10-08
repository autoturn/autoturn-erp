import React from 'react';
import { Scale, FileText, Users, Cpu } from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab, recordsCount, operatorsCount, machinesCount }) {
  const tabs = [
    {
      id: 'form',
      icon: Scale,
      label: 'Weigh',
    },
    {
      id: 'records',
      icon: FileText,
      label: 'Records',
      count: recordsCount,
    },
    {
      id: 'operators',
      icon: Users,
      label: 'Operators',
      count: operatorsCount,
      soft: true,
    },
  ];

  return (
    <nav className="erp-bottom-nav">
      {tabs.map(({ id, icon: Icon, label, count, soft }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
          onClick={() => onSelectTab(id)}
        >
          <div className="nav-icon-wrap">
            <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            {count > 0 && (
              <span className={soft ? 'nav-badge-soft' : 'nav-badge'}>{count}</span>
            )}
            {activeTab === id && <span className="active-dot" />}
          </div>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
