import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Mail, 
  Download, 
  ArrowUpDown, 
  Calendar, 
  Building2, 
  Layers, 
  Sparkles,
  Info,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import octoberScheduleData from '../data/octoberScheduleData.json';

export function ProductionPlanningDashboard({ records, onSwitchToWeighing }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'changeover' | 'excess' | 'pending' | 'zero-plan'
  const [sortField, setSortField] = useState('pending'); // 'pending' | 'schedule' | 'produced' | 'aiNumber'
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedAiDetail, setSelectedAiDetail] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('production@autoturn.com');
  const [emailSubject, setEmailSubject] = useState('AUTOTURN ERP - Production vs October Schedule & Changeover Alert');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // 1. Calculate actual production aggregated by AI Number from Sayali Madam's live weighing entries
  const actualProducedMap = useMemo(() => {
    const map = {};
    for (const r of records) {
      if (!r.aiNumber) continue;
      const cleanAi = r.aiNumber.toUpperCase().trim();
      const normAi = cleanAi.startsWith('AI-') ? cleanAi : `AI-${cleanAi}`;
      const qty = parseFloat(r.quantity) || 0;
      map[normAi] = (map[normAi] || 0) + qty;
    }
    return map;
  }, [records]);

  // 2. Merge October Final Revised Schedule with Madam's Live Production Entries
  const scheduleAnalysis = useMemo(() => {
    return octoberScheduleData.map(item => {
      const produced = actualProducedMap[item.aiNumber] || 0;
      const schedule = item.totalSchedule || 0;
      const pending = Math.max(0, schedule - produced);
      const excess = produced > schedule ? produced - schedule : 0;
      
      const completionPercent = schedule > 0 
        ? Math.min(100, Math.round((produced / schedule) * 100))
        : (produced > 0 ? 100 : 0);

      // Status conditions:
      // Changeover Alert: target reached (100% or excess produced)
      // Excess Alert: produced strictly exceeds final revised schedule
      // In Progress: some produced, but not yet complete
      // Pending: 0 produced
      let status = 'pending';
      let statusLabel = 'Pending';
      let statusColor = 'slate';

      if (excess > 0) {
        status = 'excess';
        statusLabel = 'Excess Produced!';
        statusColor = 'rose';
      } else if (schedule > 0 && produced >= schedule) {
        status = 'changeover';
        statusLabel = 'Changeover Required!';
        statusColor = 'emerald';
      } else if (produced > 0) {
        status = 'in_progress';
        statusLabel = 'In Production';
        statusColor = 'indigo';
      } else if (schedule === 0) {
        status = 'zero_plan';
        statusLabel = 'No Schedule';
        statusColor = 'gray';
      }

      return {
        ...item,
        produced,
        pending,
        excess,
        completionPercent,
        status,
        statusLabel,
        statusColor
      };
    });
  }, [actualProducedMap]);

  // Filter & Sort
  const filteredData = useMemo(() => {
    let list = scheduleAnalysis.filter(item => {
      if (filterStatus === 'changeover' && item.status !== 'changeover') return false;
      if (filterStatus === 'excess' && item.status !== 'excess') return false;
      if (filterStatus === 'pending' && item.pending <= 0) return false;
      if (filterStatus === 'active' && item.totalSchedule === 0 && item.produced === 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.aiNumber.toLowerCase().includes(q) ||
        item.customers.some(c => c.toLowerCase().includes(q)) ||
        item.partNames.some(p => p.toLowerCase().includes(q)) ||
        item.partNumbers.some(p => p.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'aiNumber') {
        const numA = parseInt(a.aiNumber.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.aiNumber.replace(/[^0-9]/g, '')) || 0;
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [scheduleAnalysis, searchQuery, filterStatus, sortField, sortAsc]);

  // Overall KPI stats
  const kpiStats = useMemo(() => {
    let totalPlanned = 0;
    let totalProduced = 0;
    let changeoverCount = 0;
    let excessCount = 0;

    for (const item of scheduleAnalysis) {
      totalPlanned += item.totalSchedule;
      totalProduced += item.produced;
      if (item.status === 'changeover') changeoverCount++;
      if (item.status === 'excess') excessCount++;
    }

    return {
      totalPlanned,
      totalProduced,
      totalPending: Math.max(0, totalPlanned - totalProduced),
      changeoverCount,
      excessCount,
      totalUniqueAIs: scheduleAnalysis.length
    };
  }, [scheduleAnalysis]);

  // Generate Email Content for Plant & Dispatch Management
  const emailBodyContent = useMemo(() => {
    const alertItems = scheduleAnalysis.filter(i => i.status === 'changeover' || i.status === 'excess');
    const topPending = scheduleAnalysis.filter(i => i.pending > 0).slice(0, 10);

    return `Dear Plant & Planning Team,

Here is the live Production vs October Revised Schedule Report from AUTOTURN ERP:

========================================
🚨 CHANGEOVER & EXCESS PRODUCTION ALERTS
========================================
${alertItems.length === 0 ? 'No changeovers or excess production currently.' : alertItems.map(i => 
`• ${i.aiNumber} [${i.status.toUpperCase()}]:
  - Target Schedule: ${i.totalSchedule.toLocaleString()} pcs
  - Produced by Weighing: ${i.produced.toLocaleString()} pcs
  - ${i.excess > 0 ? `EXCESS: +${i.excess.toLocaleString()} pcs` : `STATUS: TARGET COMPLETE (100%) - TOOL CHANGEOVER REQUIRED`}
  - Customers: ${i.customers.join(', ')}`
).join('\n\n')}

========================================
📊 OVERALL MONTHLY PROGRESS
========================================
• Total October Final Schedule : ${kpiStats.totalPlanned.toLocaleString()} pcs
• Actual Produced by Sayali Madam : ${kpiStats.totalProduced.toLocaleString()} pcs
• Net Remaining to Produce : ${kpiStats.totalPending.toLocaleString()} pcs
• Changeover Triggers Active : ${kpiStats.changeoverCount}
• Excess Run Triggers Active : ${kpiStats.excessCount}

========================================
TOP PENDING PART SCHEDULES:
========================================
${topPending.map(i => `• ${i.aiNumber}: Pending ${i.pending.toLocaleString()} pcs (Target: ${i.totalSchedule.toLocaleString()} | Produced: ${i.produced.toLocaleString()})`).join('\n')}

Generated automatically via AUTOTURN ERP • Shopfloor Production Digitalization`;
  }, [scheduleAnalysis, kpiStats]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailBodyContent);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleOpenMailClient = () => {
    const mailto = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyContent)}`;
    window.open(mailto, '_blank');
  };

  return (
    <div className="planning-dashboard-container">
      {/* Top Banner & Mode Switch */}
      <div className="planning-header-card">
        <div className="planning-title-block">
          <div className="planning-icon-badge">
            <BarChart3 size={20} className="text-indigo-600" />
          </div>
          <div>
            <div className="planning-tag-row">
              <span className="planning-status-chip">October Final v6 Master</span>
              <span className="live-data-badge">
                <span className="pulse-emerald-dot" /> Connected to Sayali Madam's Entries
              </span>
            </div>
            <h2 className="planning-main-heading">Production Schedule vs Actual Dashboard</h2>
            <p className="planning-subtext">
              Clubbed Final Revised Schedules live-subtracted by shopfloor weighed quantities
            </p>
          </div>
        </div>

        <div className="planning-actions-right">
          <button 
            type="button" 
            className="planning-email-btn"
            onClick={() => setIsEmailModalOpen(true)}
            title="Generate Changeover & Excess Email Alert"
          >
            <Mail size={15} />
            <span>Generate Dispatch / Alert Email</span>
            {(kpiStats.changeoverCount > 0 || kpiStats.excessCount > 0) && (
              <span className="email-alert-count">
                {kpiStats.changeoverCount + kpiStats.excessCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards: Total Schedule, Produced, Pending, Changeover Alerts */}
      <div className="planning-kpi-grid">
        <div className="planning-kpi-card">
          <div className="planning-kpi-icon indigo">
            <Calendar size={18} />
          </div>
          <div className="planning-kpi-data">
            <span className="planning-kpi-label">Oct Final Schedule</span>
            <span className="planning-kpi-value">{kpiStats.totalPlanned.toLocaleString()} <small>pcs</small></span>
            <span className="planning-kpi-meta">{kpiStats.totalUniqueAIs} AI Part Numbers</span>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="planning-kpi-icon emerald">
            <TrendingUp size={18} />
          </div>
          <div className="planning-kpi-data">
            <span className="planning-kpi-label">Actual Produced</span>
            <span className="planning-kpi-value text-emerald-600">{kpiStats.totalProduced.toLocaleString()} <small>pcs</small></span>
            <span className="planning-kpi-meta">Live from Weighing Entries</span>
          </div>
        </div>

        <div className="planning-kpi-card">
          <div className="planning-kpi-icon amber">
            <Layers size={18} />
          </div>
          <div className="planning-kpi-data">
            <span className="planning-kpi-label">Net Balance Pending</span>
            <span className="planning-kpi-value text-amber-600">{kpiStats.totalPending.toLocaleString()} <small>pcs</small></span>
            <span className="planning-kpi-meta">Auto-Subtracted</span>
          </div>
        </div>

        <div className={`planning-kpi-card alert-card ${kpiStats.changeoverCount > 0 ? 'active' : ''}`}>
          <div className="planning-kpi-icon rose">
            <AlertTriangle size={18} />
          </div>
          <div className="planning-kpi-data">
            <span className="planning-kpi-label">Changeover Triggers</span>
            <span className="planning-kpi-value text-rose-600">{kpiStats.changeoverCount} <small>parts</small></span>
            <span className="planning-kpi-meta">Target 100% Reached</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="planning-toolbar-card">
        <div className="planning-search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="planning-search-input"
            placeholder="Search AI number, customer (e.g. Tata, Capgrid), or part name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        <div className="planning-filter-tabs">
          <button 
            className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All AI Numbers ({scheduleAnalysis.length})
          </button>
          <button 
            className={`filter-pill alert-pill ${filterStatus === 'changeover' ? 'active' : ''}`}
            onClick={() => setFilterStatus('changeover')}
          >
            Changeover Needed ({kpiStats.changeoverCount})
          </button>
          <button 
            className={`filter-pill excess-pill ${filterStatus === 'excess' ? 'active' : ''}`}
            onClick={() => setFilterStatus('excess')}
          >
            Excess Produced ({kpiStats.excessCount})
          </button>
          <button 
            className={`filter-pill ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending Schedules
          </button>
        </div>
      </div>

      {/* Main Table: AI No, Customers Clubbed, Final Schedule, Produced, Pending, Status */}
      <div className="planning-table-card">
        <div className="table-responsive">
          <table className="planning-data-table">
            <thead>
              <tr>
                <th onClick={() => { setSortField('aiNumber'); setSortAsc(!sortAsc); }} className="sortable">
                  AI Number {sortField === 'aiNumber' && (sortAsc ? '▲' : '▼')}
                </th>
                <th>Clubbed Customers</th>
                <th>Part Description</th>
                <th onClick={() => { setSortField('totalSchedule'); setSortAsc(!sortAsc); }} className="sortable text-right">
                  Final Revised Schedule {sortField === 'totalSchedule' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => { setSortField('produced'); setSortAsc(!sortAsc); }} className="sortable text-right">
                  Produced (Weighed) {sortField === 'produced' && (sortAsc ? '▲' : '▼')}
                </th>
                <th onClick={() => { setSortField('pending'); setSortAsc(!sortAsc); }} className="sortable text-right">
                  Remaining Pending {sortField === 'pending' && (sortAsc ? '▲' : '▼')}
                </th>
                <th>Progress & Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state-cell">
                    <Info size={18} />
                    <span>No matching AI numbers found for "{searchQuery || filterStatus}".</span>
                  </td>
                </tr>
              ) : (
                filteredData.slice(0, 100).map((item) => (
                  <tr key={item.aiNumber} className={`planning-row ${item.status}`}>
                    {/* AI Number */}
                    <td>
                      <div className="ai-number-badge">
                        <span className="ai-code">{item.aiNumber}</span>
                        {item.customerCount > 1 && (
                          <span className="clubbed-pill" title={`Clubbed across ${item.customerCount} customers`}>
                            {item.customerCount} Customers Clubbed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customers Clubbed */}
                    <td>
                      <div className="customer-cell">
                        <span className="primary-cust">{item.customers[0] || 'Unassigned'}</span>
                        {item.customers.length > 1 && (
                          <span className="more-cust-badge" onClick={() => setSelectedAiDetail(item)}>
                            +{item.customers.length - 1} more
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Part Name */}
                    <td>
                      <div className="part-info-cell">
                        <span className="part-name-title">
                          {item.partNames[0] || item.partNumbers[0] || '-'}
                        </span>
                        {item.partNumbers.length > 0 && (
                          <span className="part-no-sub">{item.partNumbers[0]}</span>
                        )}
                      </div>
                    </td>

                    {/* Final Revised Schedule */}
                    <td className="text-right mono-font font-bold">
                      {item.totalSchedule.toLocaleString()} <span className="unit-label">pcs</span>
                    </td>

                    {/* Live Weighed Qty Produced */}
                    <td className="text-right mono-font font-bold text-emerald-600">
                      {item.produced > 0 ? (
                        `${item.produced.toLocaleString()} pcs`
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Remaining Pending */}
                    <td className="text-right mono-font font-bold">
                      {item.excess > 0 ? (
                        <span className="excess-tag">+{item.excess.toLocaleString()} Excess</span>
                      ) : (
                        <span className={item.pending > 0 ? 'text-amber-600' : 'text-slate-400'}>
                          {item.pending.toLocaleString()} pcs
                        </span>
                      )}
                    </td>

                    {/* Progress Bar & Alert */}
                    <td>
                      <div className="progress-cell">
                        <div className="progress-track">
                          <div 
                            className={`progress-fill ${item.statusColor}`}
                            style={{ width: `${item.completionPercent}%` }}
                          />
                        </div>
                        <div className="progress-label-row">
                          <span className="pct-num">{item.completionPercent}%</span>
                          <span className={`status-badge-chip ${item.status}`}>
                            {item.statusLabel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Details Action */}
                    <td className="text-center">
                      <button 
                        type="button" 
                        className="btn-view-breakdown"
                        onClick={() => setSelectedAiDetail(item)}
                        title="View Customer Breakdown"
                      >
                        Breakdown
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredData.length > 100 && (
          <div className="table-pagination-notice">
            Showing top 100 of {filteredData.length} records. Use search above to narrow down.
          </div>
        )}
      </div>

      {/* Customer Breakdown Modal */}
      {selectedAiDetail && (
        <div className="erp-modal-overlay" onClick={() => setSelectedAiDetail(null)}>
          <div className="erp-modal-card breakdown-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">AI Number: {selectedAiDetail.aiNumber}</h3>
                <p className="modal-subtitle">
                  Total Clubbed Schedule: <strong>{selectedAiDetail.totalSchedule.toLocaleString()} pcs</strong> | 
                  Produced by Madam: <strong className="text-emerald-600">{selectedAiDetail.produced.toLocaleString()} pcs</strong>
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedAiDetail(null)}>×</button>
            </div>

            <div className="modal-body">
              <h4 className="breakdown-table-title">Customer-Wise Schedule Breakdown:</h4>
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Part Number</th>
                    <th>Part Name</th>
                    <th className="text-right">October Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAiDetail.breakdown.map((b, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{b.customer}</td>
                      <td className="mono-font">{b.partNo || '-'}</td>
                      <td>{b.partName || '-'}</td>
                      <td className="text-right mono-font font-bold">{b.schedule.toLocaleString()} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="breakdown-summary-banner">
                {selectedAiDetail.status === 'changeover' && (
                  <div className="alert-message warning">
                    <AlertTriangle size={18} />
                    <span>
                      <strong>Changeover Alert:</strong> All {selectedAiDetail.totalSchedule.toLocaleString()} pcs have been produced! 
                      Prepare machine for tooling changeover.
                    </span>
                  </div>
                )}
                {selectedAiDetail.status === 'excess' && (
                  <div className="alert-message danger">
                    <AlertTriangle size={18} />
                    <span>
                      <strong>Excess Production Alert:</strong> {selectedAiDetail.excess.toLocaleString()} pcs produced in excess of schedule!
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-modal-close"
                onClick={() => setSelectedAiDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Generation & Alert Notification Modal */}
      {isEmailModalOpen && (
        <div className="erp-modal-overlay" onClick={() => setIsEmailModalOpen(false)}>
          <div className="erp-modal-card email-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Mail size={20} className="text-indigo-600" />
                <div>
                  <h3 className="modal-title">Email Generation: Changeover & Excess Alerts</h3>
                  <p className="modal-subtitle">Automatically formats live schedule status for dispatch and planning</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setIsEmailModalOpen(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group-compact">
                <label>Recipient Plant Email</label>
                <input 
                  type="email" 
                  className="field-input-control" 
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                />
              </div>

              <div className="form-group-compact">
                <label>Email Subject</label>
                <input 
                  type="text" 
                  className="field-input-control" 
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="form-group-compact">
                <label>Generated Report Preview</label>
                <textarea 
                  className="email-preview-textarea mono-font"
                  rows="14"
                  readOnly
                  value={emailBodyContent}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-modal-cancel"
                onClick={() => setIsEmailModalOpen(false)}
              >
                Cancel
              </button>

              <button 
                type="button" 
                className="btn-copy-email"
                onClick={handleCopyEmail}
              >
                {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Body'}</span>
              </button>

              <button 
                type="button" 
                className="btn-open-mailer"
                onClick={handleOpenMailClient}
              >
                <Mail size={14} />
                <span>Open in Email App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
