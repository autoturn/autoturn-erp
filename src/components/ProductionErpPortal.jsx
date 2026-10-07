import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Zap,
  Cpu,
  Disc,
  RotateCw,
  Boxes,
  Factory,
  Repeat,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Download,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  TrendingUp,
  Package,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  X,
  Copy,
  Check,
  Info,
  Scale,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { formatTime12h, getTodayDateString } from '../utils/storage.js';
import { ERP_PIN_KEY, getErpPin } from './ErpLoginPage.jsx';
import { ScheduleManager, getStoredSchedules } from './ScheduleManager.jsx';
import '../erp.css';

/* ---------------------------------------------------------
   Master data & helpers
   --------------------------------------------------------- */
const SECTIONS = [
  { id: 'Sliding Head', label: 'Sliding Head', icon: Zap, desc: 'Swiss-type automats' },
  { id: 'CNC', label: 'CNC Turning', icon: Cpu, desc: 'CNC lathes' },
  { id: 'Grinding', label: 'Grinding', icon: Disc, desc: 'Centerless grinding' },
  { id: 'Rolling', label: 'Thread Rolling', icon: RotateCw, desc: 'Rolling machines' },
  { id: 'VMC / Milling', label: 'VMC & Milling', icon: Boxes, desc: 'Machining centres' }
];

function normAi(raw) {
  if (!raw) return '';
  const s = String(raw).toUpperCase().replace(/\s+/g, '');
  const rest = s.replace(/^AI[-_.:]?(NO)?[-_.:]?/, '');
  return `AI-${rest}`;
}

// Classify Sayali Madam's free-text machine name into an ERP machine section
function classifyMachine(machineType) {
  const m = (machineType || '').toLowerCase();
  if (!m) return null;
  if (/(sliding|swiss|traub|automat|\bauto\b|citizen|star)/.test(m)) return 'Sliding Head';
  if (/(grind|centerless|centreless)/.test(m)) return 'Grinding';
  if (/(roll)/.test(m)) return 'Rolling';
  if (/(vmc|mill)/.test(m)) return 'VMC / Milling';
  if (/(cnc|lathe|turn)/.test(m)) return 'CNC';
  return null;
}

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';
}

function recordTime(r) {
  const d = r.date || '';
  return `${d} ${r.timestamp || ''}`.trim();
}

/* Status model
   - excess     : schedule > 0 and produced > schedule        → CHANGEOVER (excess by X)
   - complete   : schedule > 0 and produced === schedule      → CHANGEOVER (target met)
   - unplanned  : schedule === 0 and produced > 0             → CHANGEOVER (not in schedule, all excess)
   - running    : 0 < produced < schedule
   - notstarted : produced === 0 and schedule > 0
   - idle       : schedule === 0 and produced === 0
*/
function buildRow(item, prod) {
  const schedule = item.totalSchedule || 0;
  const produced = prod ? prod.qty : 0;
  const pending = Math.max(0, schedule - produced);
  let status = 'idle';
  let excess = 0;
  if (schedule > 0 && produced > schedule) { status = 'excess'; excess = produced - schedule; }
  else if (schedule > 0 && produced === schedule) status = 'complete';
  else if (schedule === 0 && produced > 0) { status = 'unplanned'; excess = produced; }
  else if (produced > 0) status = 'running';
  else if (schedule > 0) status = 'notstarted';

  const pct = schedule > 0 ? Math.round((produced / schedule) * 100) : (produced > 0 ? 100 : 0);
  const batches = prod ? prod.batches : [];
  const last = batches[0] || null;

  return {
    ...item,
    schedule,
    produced,
    pending,
    excess,
    status,
    pct,
    changeover: status === 'excess' || status === 'complete' || status === 'unplanned',
    batches,
    last
  };
}

const STATUS_META = {
  excess: { label: 'Changeover • Excess', cls: 'red' },
  complete: { label: 'Changeover • Target met', cls: 'green' },
  unplanned: { label: 'Not in schedule', cls: 'violet' },
  running: { label: 'In production', cls: 'blue' },
  notstarted: { label: 'Not started', cls: '' },
  idle: { label: 'No schedule', cls: '' }
};

/* ---------------------------------------------------------
   Component
   --------------------------------------------------------- */
export function ProductionErpPortal({ records, currentUser, onLogout, onGoToWeighing, isCloudConnected }) {
  const [view, setView] = useState('dashboard'); // dashboard | section | changeover | settings
  const [section, setSection] = useState('Sliding Head');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState(formatTime12h());
  const [globalQuery, setGlobalQuery] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all', 'today', 'yesterday'

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);
  
  // Schedule Management
  const [schedules, setSchedules] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false);

  useEffect(() => {
    const loaded = getStoredSchedules();
    setSchedules(loaded);
    if (loaded.length > 0) {
      setSelectedMonths([loaded[0].month]); // Select latest/first by default
    }
  }, [scheduleManagerOpen]); // re-fetch when modal closes

  const combinedScheduleData = useMemo(() => {
    const combined = {};
    const activeSchedules = schedules.filter(s => selectedMonths.includes(s.month));
    activeSchedules.forEach(sch => {
      sch.data.forEach(item => {
        if (!combined[item.aiNumber]) {
          combined[item.aiNumber] = { ...item, totalSchedule: 0 };
        }
        combined[item.aiNumber].totalSchedule += (item.totalSchedule || 0);
      });
    });
    return Object.values(combined);
  }, [schedules, selectedMonths]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [drawerRow, setDrawerRow] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [toast, setToast] = useState('');
  const shellRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(formatTime12h()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (shellRef.current && !shellRef.current.contains(e.target)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  /* ---- Production aggregation: section → AI → { qty, batches } ---- */
  const productionBySection = useMemo(() => {
    const map = {};
    SECTIONS.forEach(s => { map[s.id] = {}; });
    
    // Filter records by dateFilterMode
    const todayStr = getTodayDateString();
    const yesterday = new Date(Date.now() - 86400000);
    const yY = yesterday.getFullYear();
    const yM = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yD = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${yY}-${yM}-${yD}`;
    
    let filteredRecords = [...records];
    if (dateFilterMode === 'today') {
      filteredRecords = filteredRecords.filter(r => r.date === todayStr);
    } else if (dateFilterMode === 'yesterday') {
      filteredRecords = filteredRecords.filter(r => r.date === yesterdayStr);
    }

    const sorted = filteredRecords.sort((a, b) => (recordTime(b) > recordTime(a) ? 1 : -1));
    for (const r of sorted) {
      const sec = classifyMachine(r.machineType);
      if (!sec || !r.aiNumber) continue;
      const ai = normAi(r.aiNumber);
      const qty = parseFloat(r.quantity) || 0;
      if (!map[sec][ai]) map[sec][ai] = { qty: 0, batches: [] };
      map[sec][ai].qty += qty;
      map[sec][ai].batches.push(r);
    }
    return map;
  }, [records, dateFilterMode]);

  const unclassifiedCount = useMemo(
    () => records.filter(r => !classifyMachine(r.machineType)).length,
    [records]
  );

  /* ---- Rows per section (schedule + unscheduled production) ---- */
  const rowsBySection = useMemo(() => {
    const out = {};
    for (const s of SECTIONS) {
      const prodMap = productionBySection[s.id];
      const items = combinedScheduleData.filter(i => i.machineCategory === s.id);
      const known = new Set(items.map(i => i.aiNumber));
      const rows = items.map(i => buildRow(i, prodMap[i.aiNumber]));
      Object.keys(prodMap).forEach(ai => {
        if (!known.has(ai)) {
          const fromOther = combinedScheduleData.find(i => i.aiNumber === ai);
          rows.push(buildRow({
            aiNumber: ai,
            totalSchedule: 0,
            machineCategory: s.id,
            partName: fromOther ? `${fromOther.partName} (scheduled under ${fromOther.machineCategory})` : 'Not in selected schedule(s)',
            partNo: fromOther ? fromOther.partNo : '-'
          }, prodMap[ai]));
        }
      });
      out[s.id] = rows;
    }
    return out;
  }, [productionBySection]);

  const sectionStats = useMemo(() => {
    const stats = {};
    for (const s of SECTIONS) {
      const rows = rowsBySection[s.id];
      let schedule = 0, produced = 0, pending = 0, excessPcs = 0, changeover = 0, running = 0, scheduledParts = 0;
      rows.forEach(r => {
        schedule += r.schedule;
        produced += r.produced;
        pending += r.pending;
        excessPcs += r.excess;
        if (r.changeover) changeover++;
        if (r.status === 'running') running++;
        if (r.schedule > 0) scheduledParts++;
      });
      stats[s.id] = {
        schedule, produced, pending, excessPcs, changeover, running, scheduledParts,
        pct: schedule > 0 ? Math.min(100, Math.round((Math.min(produced, schedule) / schedule) * 100)) : 0
      };
    }
    return stats;
  }, [rowsBySection]);

  const plant = useMemo(() => {
    const t = { schedule: 0, produced: 0, pending: 0, excessPcs: 0, changeover: 0, running: 0, scheduledParts: 0 };
    Object.values(sectionStats).forEach(s => {
      t.schedule += s.schedule; t.produced += s.produced; t.pending += s.pending;
      t.excessPcs += s.excessPcs; t.changeover += s.changeover; t.running += s.running; t.scheduledParts += s.scheduledParts;
    });
    return t;
  }, [sectionStats]);

  const changeoverRows = useMemo(() => {
    const all = [];
    SECTIONS.forEach(s => rowsBySection[s.id].forEach(r => { if (r.changeover) all.push(r); }));
    return all.sort((a, b) => b.excess - a.excess);
  }, [rowsBySection]);

  const recentEntries = useMemo(
    () => [...records].sort((a, b) => (recordTime(b) > recordTime(a) ? 1 : -1)).slice(0, 8),
    [records]
  );

  /* ---- Navigation helpers ---- */
  const goSection = (id) => { setSection(id); setView('section'); setNavOpen(false); };
  const goView = (v) => { setView(v); setNavOpen(false); };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    const q = normAi(globalQuery.trim());
    if (!globalQuery.trim()) return;
    for (const s of SECTIONS) {
      const row = rowsBySection[s.id].find(r => r.aiNumber === q);
      if (row) {
        setSection(s.id);
        setView('section');
        setDrawerRow(row);
        setGlobalQuery('');
        return;
      }
    }
    showToast(`${q} not found in any machine section`);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install the AUTOTURN App:\n\n1. Tap the 3 dots (⋮) in the top right corner of Chrome.\n2. Select 'Install app' or 'Add to Home screen'.");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  /* ---- Email notice ---- */
  const emailBody = useMemo(() => {
    const lines = [];
    lines.push('AUTOTURN ERP — CHANGEOVER & EXCESS PRODUCTION NOTICE');
    lines.push(`Schedule: ${selectedMonths.join(', ') || 'No Schedule'} (Final Revised)`);
    lines.push(`Generated: ${new Date().toLocaleDateString('en-GB')} ${clock} by ${currentUser?.name || 'Production'}`);
    lines.push('');
    lines.push('AI NO      | SECTION        | SCHEDULE | PRODUCED | EXCESS | STATUS');
    lines.push('-----------+----------------+----------+----------+--------+---------------------');
    if (changeoverRows.length === 0) lines.push('No changeovers due at this time.');
    changeoverRows.forEach(r => {
      lines.push(
        `${r.aiNumber.padEnd(10)} | ${r.machineCategory.padEnd(14)} | ${String(r.schedule).padStart(8)} | ${String(r.produced).padStart(8)} | ${String(r.excess).padStart(6)} | ${STATUS_META[r.status].label}`
      );
    });
    lines.push('');
    lines.push('SECTION SUMMARY');
    SECTIONS.forEach(s => {
      const st = sectionStats[s.id];
      lines.push(`- ${s.label}: schedule ${fmt(st.schedule)} | produced ${fmt(st.produced)} | pending ${fmt(st.pending)} | changeovers ${st.changeover}`);
    });
    lines.push('');
    lines.push('Action: Stop the machine for listed AI numbers and carry out tooling changeover.');
    return lines.join('\n');
  }, [changeoverRows, sectionStats, clock, currentUser]);

  const [alertEmail, setAlertEmail] = useState(() => localStorage.getItem('autoturn_erp_alert_email') || '');

  const crumbs = (items) => (
    <div className="ax-crumbs">
      <button type="button" onClick={() => goView('dashboard')}>Home</button>
      {items.map((c, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} />
          <span>{c}</span>
        </React.Fragment>
      ))}
    </div>
  );

  const rootCls = `ax-root ${navCollapsed ? 'nav-collapsed' : ''} ${navOpen ? 'nav-open' : ''}`;

  return (
    <div className={rootCls}>
      {/* ================= SHELL BAR ================= */}
      <header className="ax-shellbar" ref={shellRef}>
        <button type="button" className="ax-shell-iconbtn" onClick={() => {
          if (window.innerWidth <= 900) setNavOpen(o => !o); else setNavCollapsed(c => !c);
        }} aria-label="Toggle navigation" id="erp-nav-toggle">
          <Menu size={18} />
        </button>
        <div className="ax-shell-brand">
          <img src="/logo.png" alt="" className="ax-shell-logo" />
          <span className="ax-shell-name">AUTOTURN <span>ERP</span></span>
          <span className="ax-shell-sep" />
          <span className="ax-shell-module">Production Planning</span>
        </div>

        <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
          <select 
            className="ax-input" 
            style={{ padding: '4px 8px', fontSize: '13px', background: 'var(--surface-sunken)', borderColor: 'var(--border-subtle)', maxWidth: '200px' }}
            value={selectedMonths.join(',')}
            onChange={(e) => {
              if (e.target.value) {
                if (e.target.value === 'ALL') {
                  setSelectedMonths(schedules.map(s => s.month));
                } else {
                  setSelectedMonths([e.target.value]);
                }
              }
            }}
          >
            <option value="" disabled>Select Target Month</option>
            {schedules.length > 1 && <option value="ALL">All Active Months ({schedules.length})</option>}
            {schedules.map(s => (
              <option key={s.id} value={s.month}>{s.month}</option>
            ))}
          </select>

          <select 
            className="ax-input" 
            style={{ padding: '4px 8px', fontSize: '13px', background: 'var(--surface-sunken)', borderColor: 'var(--border-subtle)', maxWidth: '140px' }}
            value={dateFilterMode}
            onChange={(e) => setDateFilterMode(e.target.value)}
          >
            <option value="all">All Time Prod.</option>
            <option value="today">Today's Prod.</option>
            <option value="yesterday">Yesterday's Prod.</option>
          </select>
        </div>

        <form className="ax-shell-search" onSubmit={handleGlobalSearch}>
          <Search size={15} />
          <input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Find AI number (e.g. 546) and press Enter"
            id="erp-global-search"
          />
          <kbd>Enter</kbd>
        </form>

        <div className="ax-shell-right">
          <div style={{ position: 'relative' }}>
            <button type="button" className="ax-shell-iconbtn" onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }} aria-label="Notifications" id="erp-notif-btn">
              <Bell size={18} />
              {plant.changeover > 0 && <span className="ax-badge-dot">{plant.changeover > 99 ? '99+' : plant.changeover}</span>}
            </button>
            {notifOpen && (
              <div className="ax-dropdown">
                <div className="ax-dropdown-head">
                  <b>Changeover alerts</b>
                  <span className="ax-chip red">{plant.changeover}</span>
                </div>
                <div className="ax-dropdown-list">
                  {changeoverRows.length === 0 ? (
                    <div className="ax-dropdown-empty">No changeovers due. All machines are within schedule.</div>
                  ) : changeoverRows.slice(0, 12).map(r => (
                    <button type="button" key={r.machineCategory + r.aiNumber} className="ax-dropdown-item" onClick={() => { setNotifOpen(false); setSection(r.machineCategory); setView('section'); setDrawerRow(r); }}>
                      <span className="ico" style={{ background: r.status === 'complete' ? 'var(--ax-green-50)' : 'var(--ax-red-50)', color: r.status === 'complete' ? 'var(--ax-green)' : 'var(--ax-red)' }}>
                        {r.status === 'complete' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                      </span>
                      <span>
                        <b>{r.aiNumber} • {r.machineCategory}</b>
                        <span>
                          {r.status === 'complete'
                            ? `Target met: ${fmt(r.produced)} / ${fmt(r.schedule)} pcs`
                            : `Excess by ${fmt(r.excess)} pcs (${fmt(r.produced)} / ${fmt(r.schedule)})`}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {changeoverRows.length > 0 && (
                  <div style={{ padding: 10, borderTop: '1px solid var(--ax-border-soft)' }}>
                    <button type="button" className="ax-btn" style={{ width: '100%' }} onClick={() => { setNotifOpen(false); goView('changeover'); }}>
                      Open Changeover Control
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button type="button" className="ax-shell-user" onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }} id="erp-user-menu">
              <span className="ax-avatar">{initials(currentUser?.name)}</span>
              <span className="ax-shell-user-meta">
                <b>{currentUser?.name || 'User'}</b>
                <span>{currentUser?.role || 'Production'}</span>
              </span>
              <ChevronDown size={14} />
            </button>
            {userOpen && (
              <div className="ax-dropdown" style={{ width: 240 }}>
                <div className="ax-dropdown-head">
                  <div>
                    <b>{currentUser?.name}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--ax-muted)' }}>{currentUser?.username} • {currentUser?.role}</div>
                  </div>
                </div>
                <button type="button" className="ax-menu-item" onClick={() => { setUserOpen(false); goView('settings'); }}><Settings size={15} /> Settings</button>
                <button type="button" className="ax-menu-item" onClick={() => { setUserOpen(false); onGoToWeighing(); }}><Scale size={15} /> Weighing Desk</button>
                <button type="button" className="ax-menu-item danger" onClick={onLogout}><LogOut size={15} /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= SIDE NAV ================= */}
      <div className="ax-backdrop" onClick={() => setNavOpen(false)} />
      <nav className="ax-nav">
        <div className="ax-nav-group">
          <div className="ax-nav-title">Overview</div>
          <button type="button" title="Dashboard" className={`ax-nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => goView('dashboard')}>
            <LayoutDashboard size={17} /><span className="ax-nav-label">Plant Dashboard</span>
          </button>
          <button type="button" title="Changeover Control" className={`ax-nav-item ${view === 'changeover' ? 'active' : ''}`} onClick={() => goView('changeover')}>
            <Repeat size={17} /><span className="ax-nav-label">Changeover Control</span>
            {plant.changeover > 0 && <span className="ax-nav-count red">{plant.changeover}</span>}
          </button>
        </div>

        <div className="ax-nav-group">
          <div className="ax-nav-title">Machine Sections</div>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const st = sectionStats[s.id];
            return (
              <button
                type="button"
                key={s.id}
                title={s.label}
                className={`ax-nav-item ${view === 'section' && section === s.id ? 'active' : ''}`}
                onClick={() => goSection(s.id)}
              >
                <Icon size={17} />
                <span className="ax-nav-label">{s.label}</span>
                {st.changeover > 0
                  ? <span className="ax-nav-count red">{st.changeover}</span>
                  : <span className="ax-nav-count">{st.scheduledParts}</span>}
              </button>
            );
          })}
        </div>

        <div className="ax-nav-group">
          <div className="ax-nav-title">System</div>
          <button type="button" title="Settings" className={`ax-nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => goView('settings')}>
            <Settings size={17} /><span className="ax-nav-label">Settings</span>
          </button>
          <button type="button" title="Weighing Desk" className="ax-nav-item" onClick={onGoToWeighing}>
            <Scale size={17} /><span className="ax-nav-label">Weighing Desk</span>
          </button>
        </div>

        <div className="ax-nav-foot">
          <button type="button" title="Collapse" className="ax-nav-item" onClick={() => setNavCollapsed(c => !c)}>
            {navCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className="ax-nav-label">Collapse menu</span>
          </button>
          <button type="button" title="Sign out" className="ax-nav-item" onClick={onLogout}>
            <LogOut size={17} /><span className="ax-nav-label">Sign out</span>
          </button>
        </div>
      </nav>

      {/* ================= MAIN ================= */}
      <main className="ax-main">
        {view === 'dashboard' && (
          <DashboardView
            crumbs={crumbs}
            plant={plant}
            sectionStats={sectionStats}
            changeoverRows={changeoverRows}
            recentEntries={recentEntries}
            onOpenSection={goSection}
            onOpenChangeover={() => goView('changeover')}
            onOpenRow={(r) => setDrawerRow(r)}
            onEmail={() => setEmailOpen(true)}
            unclassifiedCount={unclassifiedCount}
            userName={currentUser?.name}
            selectedMonths={selectedMonths}
          />
        )}

        {view === 'section' && (
          <SectionView
            key={section}
            crumbs={crumbs}
            section={SECTIONS.find(s => s.id === section)}
            rows={rowsBySection[section]}
            stats={sectionStats[section]}
            onOpenRow={(r) => setDrawerRow(r)}
            onEmail={() => setEmailOpen(true)}
            onToast={showToast}
          />
        )}

        {view === 'changeover' && (
          <ChangeoverView
            crumbs={crumbs}
            rows={changeoverRows}
            onOpenRow={(r) => setDrawerRow(r)}
            onEmail={() => setEmailOpen(true)}
            onOpenSection={goSection}
            onToast={showToast}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            crumbs={crumbs}
            currentUser={currentUser}
            isCloudConnected={isCloudConnected}
            alertEmail={alertEmail}
            setAlertEmail={setAlertEmail}
            onToast={showToast}
            recordsCount={records.length}
            unclassifiedCount={unclassifiedCount}
            selectedMonths={selectedMonths}
            combinedScheduleData={combinedScheduleData}
            onOpenScheduleManager={() => setScheduleManagerOpen(true)}
          />
        )}
      </main>

      {/* ================= STATUS BAR ================= */}
      <footer className="ax-statusbar">
        <span className="live"><i /> Live</span>
        <span><Clock size={11} style={{ verticalAlign: '-1px' }} /> {clock}</span>
        <span className="hide-sm"><Database size={11} style={{ verticalAlign: '-1px' }} /> {isCloudConnected ? 'Supabase connected' : 'Local storage'}</span>
        <span className="hide-sm">{fmt(records.length)} weighing entries</span>
        <span className="hide-sm">Schedule: {selectedMonths.join(', ') || 'No Schedule'}</span>
        <span className="right">AUTOTURN ERP v2.0</span>
      </footer>

      {/* ================= DRAWER: AI DETAIL ================= */}
      {drawerRow && (
        <div className="ax-overlay" onClick={() => setDrawerRow(null)}>
          <aside className="ax-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ax-dlg-head">
              <div>
                <h3><span className="ax-ai" style={{ fontSize: 16 }}>{drawerRow.aiNumber}</span></h3>
                <p>{drawerRow.partName} • {drawerRow.machineCategory}</p>
              </div>
              <button type="button" className="ax-btn ax-btn-ghost ax-btn-icon" onClick={() => setDrawerRow(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="ax-dlg-body">
              <div className="ax-facts ax-num">
                <div><span>Total schedule</span><b>{fmt(drawerRow.schedule)}</b></div>
                <div><span>Produced till now</span><b className="ax-green-t">{fmt(drawerRow.produced)}</b></div>
                <div><span>Pending</span><b className="ax-amber-t">{fmt(drawerRow.pending)}</b></div>
                <div><span>Excess</span><b className={drawerRow.excess > 0 ? 'ax-red-t' : 'ax-dim'}>{drawerRow.excess > 0 ? `+${fmt(drawerRow.excess)}` : '0'}</b></div>
              </div>

              <ChangeoverBanner row={drawerRow} />

              <h4 style={{ margin: '18px 0 8px', fontSize: 13 }}>Weighing entries ({drawerRow.batches.length})</h4>
              {drawerRow.batches.length === 0 ? (
                <div className="ax-card"><div className="ax-empty"><Info size={22} /><b>No entries yet</b>Entries from the Weighing Desk for this AI number on {drawerRow.machineCategory} will appear here.</div></div>
              ) : (
                <div className="ax-card">
                  <div className="ax-table-wrap">
                    <table className="ax-table ax-num">
                      <thead>
                        <tr>
                          <th>Date &amp; Time</th>
                          <th>Shift</th>
                          <th>Operator</th>
                          <th>Machine</th>
                          <th className="r">Qty</th>
                          <th className="r">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let running = 0;
                          const chrono = [...drawerRow.batches].reverse().map(b => {
                            running += parseFloat(b.quantity) || 0;
                            return { ...b, cum: running };
                          });
                          return chrono.reverse().map(b => (
                            <tr key={b.id} className={drawerRow.schedule > 0 && b.cum > drawerRow.schedule ? 'is-excess' : ''}>
                              <td>{b.date} • {b.timestamp}</td>
                              <td>{b.shift}</td>
                              <td className="ax-strong">{b.operatorName}</td>
                              <td>{b.machineType}</td>
                              <td className="r ax-strong">{fmt(b.quantity)}</td>
                              <td className="r">{fmt(b.cum)}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="ax-dlg-foot">
              <button type="button" className="ax-btn" onClick={() => setDrawerRow(null)}>Close</button>
              {drawerRow.changeover && (
                <button type="button" className="ax-btn ax-btn-primary" onClick={() => { setDrawerRow(null); setEmailOpen(true); }}>
                  <Mail size={14} /> Send changeover notice
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ================= MODAL: EMAIL ================= */}
      {emailOpen && (
        <EmailModal
          body={emailBody}
          defaultTo={alertEmail}
          count={changeoverRows.length}
          onClose={() => setEmailOpen(false)}
          onToast={showToast}
        />
      )}

      {/* ================= MODAL: SCHEDULE MANAGER ================= */}
      {scheduleManagerOpen && (
        <ScheduleManager onClose={() => setScheduleManagerOpen(false)} />
      )}

      {toast && <div className="ax-toast"><CheckCircle2 size={15} /> {toast}</div>}
    </div>
  );
}

/* ---------------------------------------------------------
   Shared bits
   --------------------------------------------------------- */
function Kpi({ label, value, unit, foot, icon: Icon, color, bg }) {
  return (
    <div className="ax-kpi" style={{ '--kpi-color': color, '--kpi-bg': bg }}>
      <div className="ax-kpi-top">
        <span className="ax-kpi-label">{label}</span>
        <span className="ax-kpi-ico"><Icon size={15} /></span>
      </div>
      <div className="ax-kpi-value ax-num">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="ax-kpi-foot">{foot}</div>}
    </div>
  );
}

function StatusChip({ status }) {
  const m = STATUS_META[status];
  return <span className={`ax-chip ${m.cls}`}><span className="dot" />{m.label}</span>;
}

function ProgressCell({ row }) {
  const w = Math.min(100, row.pct);
  const cls = row.status === 'excess' || row.status === 'unplanned' ? 'red' : row.status === 'complete' ? 'green' : '';
  return (
    <div className="ax-progress">
      <div className="ax-progress-track"><div className={`ax-progress-fill ${cls}`} style={{ width: `${w}%` }} /></div>
      <span className="ax-progress-pct ax-num">{row.pct}%</span>
    </div>
  );
}

function ChangeoverCell({ row }) {
  if (row.status === 'excess') {
    return (
      <div className="ax-co">
        <span className="ax-chip red"><AlertTriangle size={12} /> CHANGEOVER REQUIRED</span>
        <small>Excess by <b>{fmt(row.excess)} pcs</b> ({row.pct}% of schedule)</small>
      </div>
    );
  }
  if (row.status === 'complete') {
    return (
      <div className="ax-co">
        <span className="ax-chip green"><CheckCircle2 size={12} /> CHANGEOVER DUE</span>
        <small>Schedule completed exactly — 0 excess</small>
      </div>
    );
  }
  if (row.status === 'unplanned') {
    return (
      <div className="ax-co">
        <span className="ax-chip violet"><AlertTriangle size={12} /> NOT IN SCHEDULE</span>
        <small>Entire <b>{fmt(row.excess)} pcs</b> is excess</small>
      </div>
    );
  }
  if (row.status === 'running') {
    return <span className="ax-chip blue"><span className="dot" />Running — {fmt(row.pending)} pcs to go</span>;
  }
  if (row.status === 'notstarted') return <span className="ax-chip"><span className="dot" />Not started</span>;
  return <span className="ax-dim">—</span>;
}

function ChangeoverBanner({ row }) {
  if (!row.changeover) {
    return (
      <div className="ax-banner" style={{ background: 'var(--ax-primary-50)', borderColor: '#c9daf8', borderLeftColor: 'var(--ax-primary)' }}>
        <Info size={18} style={{ color: 'var(--ax-primary)', flexShrink: 0 }} />
        <div>
          <b style={{ color: 'var(--ax-primary)' }}>No changeover yet</b>
          <span style={{ color: 'var(--ax-text-2)' }}>
            {row.schedule > 0 ? `${fmt(row.pending)} pcs remaining to reach the schedule of ${fmt(row.schedule)} pcs.` : 'No schedule and no production for this AI number.'}
          </span>
        </div>
      </div>
    );
  }
  const met = row.status === 'complete';
  return (
    <div className="ax-banner" style={met ? { background: 'var(--ax-green-50)', borderColor: '#bfe5cf', borderLeftColor: 'var(--ax-green)' } : undefined}>
      {met ? <CheckCircle2 size={18} style={{ color: 'var(--ax-green)', flexShrink: 0 }} /> : <AlertTriangle size={18} className="ax-banner-ico" />}
      <div>
        <b style={met ? { color: 'var(--ax-green)' } : undefined}>
          {met ? 'Changeover due — schedule completed' : row.status === 'unplanned' ? 'Changeover required — part not in schedule' : `Changeover required — excess by ${fmt(row.excess)} pcs`}
        </b>
        <span style={met ? { color: 'var(--ax-text-2)' } : undefined}>
          Produced {fmt(row.produced)} pcs against schedule of {fmt(row.schedule)} pcs. Stop the machine and change over the tooling.
        </span>
      </div>
    </div>
  );
}

function usePaged(list, initialSize = 25) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const safePage = Math.min(page, pages);
  const slice = list.slice((safePage - 1) * size, safePage * size);
  return { page: safePage, setPage, size, setSize, pages, slice, total: list.length };
}

function Pager({ p }) {
  const from = p.total === 0 ? 0 : (p.page - 1) * p.size + 1;
  const to = Math.min(p.total, p.page * p.size);
  return (
    <div className="ax-pager">
      <span>Showing <b>{from}–{to}</b> of <b>{fmt(p.total)}</b></span>
      <div className="ax-pager-ctrl">
        <span>Rows</span>
        <select value={p.size} onChange={(e) => { p.setSize(Number(e.target.value)); p.setPage(1); }}>
          {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" className="ax-btn ax-btn-sm" disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)}><ChevronLeft size={14} /></button>
        <span>Page {p.page} / {p.pages}</span>
        <button type="button" className="ax-btn ax-btn-sm" disabled={p.page >= p.pages} onClick={() => p.setPage(p.page + 1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function SortTh({ label, field, sort, setSort, className = '' }) {
  const active = sort.field === field;
  return (
    <th className={`sortable ${className}`} onClick={() => setSort({ field, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}>
      {label}
      {active && <span className="sort">{sort.dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}</span>}
    </th>
  );
}

function sortRows(rows, sort) {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.field === 'aiNumber') {
      const na = parseInt(a.aiNumber.replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(b.aiNumber.replace(/\D/g, ''), 10) || 0;
      return (na - nb) * dir;
    }
    if (sort.field === 'priority') {
      const rank = { excess: 0, unplanned: 1, complete: 2, running: 3, notstarted: 4, idle: 5 };
      const d = rank[a.status] - rank[b.status];
      if (d !== 0) return d;
      if (a.excess !== b.excess) return b.excess - a.excess;
      return b.schedule - a.schedule;
    }
    return ((a[sort.field] || 0) - (b[sort.field] || 0)) * dir;
  });
}

function exportCsv(filename, rows) {
  const headers = ['AI No', 'Part', 'Section', 'Total Schedule', 'Total Produced Till Now', 'Pending', 'Excess', 'Completion %', 'Changeover Status'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')].concat(rows.map(r => [
    r.aiNumber, r.partName, r.machineCategory, r.schedule, r.produced, r.pending, r.excess, r.pct, STATUS_META[r.status].label
  ].map(esc).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   Views
   --------------------------------------------------------- */
function DashboardView({ crumbs, plant, sectionStats, changeoverRows, recentEntries, onOpenSection, onOpenChangeover, onOpenRow, onEmail, unclassifiedCount, userName, selectedMonths }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="ax-page">
      {crumbs(['Plant Dashboard'])}
      <div className="ax-page-head">
        <div>
          <h1 className="ax-page-title">Plant Dashboard <span className="ax-tag blue">{(selectedMonths || []).join(', ') || 'No Schedule'}</span></h1>
          <p className="ax-page-sub">{greet}, {userName?.split(' ')[0] || 'there'}. Final revised schedule vs. production recorded at the Weighing Desk.</p>
        </div>
        <div className="ax-page-actions">
          <button type="button" className="ax-btn" onClick={onOpenChangeover}><Repeat size={14} /> Changeover Control</button>
          <button type="button" className="ax-btn ax-btn-primary" onClick={onEmail}><Mail size={14} /> Send Alert Notice</button>
        </div>
      </div>

      {plant.changeover > 0 && (
        <div className="ax-banner">
          <AlertTriangle size={20} className="ax-banner-ico" />
          <div>
            <b>{plant.changeover} AI number{plant.changeover > 1 ? 's' : ''} need changeover</b>
            <span>Produced quantity has reached or crossed the schedule.{plant.excessPcs > 0 ? ` Total excess: ${fmt(plant.excessPcs)} pcs.` : ''}</span>
          </div>
          <button type="button" className="ax-btn ax-btn-danger" onClick={onOpenChangeover}>Review now</button>
        </div>
      )}

      <div className="ax-kpis">
        <Kpi label="Total schedule" value={fmt(plant.schedule)} unit="pcs" foot={`${plant.scheduledParts} scheduled AI numbers`} icon={Package} color="#1d5fd1" bg="#eaf1fd" />
        <Kpi label="Produced till now" value={fmt(plant.produced)} unit="pcs" foot="From Weighing Desk entries" icon={TrendingUp} color="#0f9d58" bg="#e7f6ee" />
        <Kpi label="Pending" value={fmt(plant.pending)} unit="pcs" foot="Schedule − produced" icon={Layers} color="#c77700" bg="#fff4e0" />
        <Kpi label="Changeover due" value={plant.changeover} unit="AI" foot={`${plant.running} AI numbers running`} icon={Repeat} color="#d93025" bg="#fdecea" />
        <Kpi label="Excess produced" value={fmt(plant.excessPcs)} unit="pcs" foot="Above schedule" icon={AlertTriangle} color="#6d4bd8" bg="#f0ecfd" />
      </div>

      <div className="ax-card" style={{ marginBottom: 16 }}>
        <div className="ax-card-head">
          <div>
            <h3 className="ax-card-title"><Factory size={16} /> Machine sections</h3>
            <p className="ax-card-sub">Select a section to open its AI-wise schedule register</p>
          </div>
        </div>
        <div className="ax-card-body">
          <div className="ax-section-grid" style={{ marginBottom: 0 }}>
            {SECTIONS.map(s => {
              const st = sectionStats[s.id];
              const Icon = s.icon;
              return (
                <button type="button" key={s.id} className="ax-section-tile" onClick={() => onOpenSection(s.id)}>
                  <div className="ax-section-tile-head">
                    <span className="ax-section-ico"><Icon size={17} /></span>
                    <div>
                      <b>{s.label}</b>
                      <span>{st.scheduledParts} AI numbers</span>
                    </div>
                    {st.changeover > 0
                      ? <span className="ax-chip red">{st.changeover} changeover</span>
                      : <span className="ax-chip green">On track</span>}
                  </div>
                  <div className="ax-section-stats ax-num">
                    <div><span>Schedule</span><b>{fmt(st.schedule)}</b></div>
                    <div><span>Produced</span><b className="ax-green-t">{fmt(st.produced)}</b></div>
                    <div><span>Pending</span><b className="ax-amber-t">{fmt(st.pending)}</b></div>
                  </div>
                  <div className="ax-progress">
                    <div className="ax-progress-track"><div className="ax-progress-fill" style={{ width: `${st.pct}%` }} /></div>
                    <span className="ax-progress-pct ax-num">{st.pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ax-grid-2">
        <div className="ax-card">
          <div className="ax-card-head">
            <div>
              <h3 className="ax-card-title"><Repeat size={16} /> Changeover queue</h3>
              <p className="ax-card-sub">Highest excess first</p>
            </div>
            <button type="button" className="ax-btn ax-btn-sm" onClick={onOpenChangeover}>View all</button>
          </div>
          {changeoverRows.length === 0 ? (
            <div className="ax-empty"><CheckCircle2 size={26} /><b>No changeovers due</b>Every AI number is still within its schedule.</div>
          ) : (
            <div className="ax-table-wrap">
              <table className="ax-table ax-num">
                <thead>
                  <tr><th>AI No</th><th>Section</th><th className="r">Schedule</th><th className="r">Produced</th><th>Changeover</th></tr>
                </thead>
                <tbody>
                  {changeoverRows.slice(0, 8).map(r => (
                    <tr key={r.machineCategory + r.aiNumber} className={`is-${r.status}`} style={{ cursor: 'pointer' }} onClick={() => onOpenRow(r)}>
                      <td><span className="ax-ai">{r.aiNumber}</span></td>
                      <td>{r.machineCategory}</td>
                      <td className="r">{fmt(r.schedule)}</td>
                      <td className="r ax-strong">{fmt(r.produced)}</td>
                      <td><ChangeoverCell row={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ax-card">
          <div className="ax-card-head">
            <div>
              <h3 className="ax-card-title"><Scale size={16} /> Latest weighing entries</h3>
              <p className="ax-card-sub">Live from the Weighing Desk</p>
            </div>
          </div>
          {recentEntries.length === 0 ? (
            <div className="ax-empty"><Info size={24} /><b>No entries yet</b>Entries saved at the Weighing Desk show here instantly.</div>
          ) : recentEntries.map(r => {
            const sec = classifyMachine(r.machineType);
            return (
              <div className="ax-list-row" key={r.id}>
                <span className="ax-avatar" style={{ background: '#eef1f6', color: 'var(--ax-text-2)' }}>{initials(r.operatorName)}</span>
                <div className="meta">
                  <b><span className="ax-ai" style={{ fontSize: 12.5 }}>{normAi(r.aiNumber)}</span> • {fmt(r.quantity)} pcs</b>
                  <span>{r.operatorName} • {r.machineType} • {r.date} {r.timestamp}</span>
                </div>
                {sec ? <span className="ax-chip">{sec}</span> : <span className="ax-chip amber" title="Machine name not mapped to a section">Unmapped</span>}
              </div>
            );
          })}
          {unclassifiedCount > 0 && (
            <div style={{ padding: '10px 16px', fontSize: 11.5, color: 'var(--ax-amber)', borderTop: '1px solid var(--ax-border-soft)' }}>
              {unclassifiedCount} entr{unclassifiedCount > 1 ? 'ies have' : 'y has'} a machine name that is not mapped to a section and is excluded from section totals.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionView({ crumbs, section, rows, stats, onOpenRow, onEmail, onToast }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [hideZero, setHideZero] = useState(true);
  const [sort, setSort] = useState({ field: 'priority', dir: 'desc' });

  const counts = useMemo(() => {
    const c = { all: 0, changeover: 0, running: 0, notstarted: 0 };
    rows.forEach(r => {
      if (hideZero && r.status === 'idle') return;
      c.all++;
      if (r.changeover) c.changeover++;
      if (r.status === 'running') c.running++;
      if (r.status === 'notstarted') c.notstarted++;
    });
    return c;
  }, [rows, hideZero]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter(r => {
      if (hideZero && r.status === 'idle') return false;
      if (filter === 'changeover' && !r.changeover) return false;
      if (filter === 'running' && r.status !== 'running') return false;
      if (filter === 'notstarted' && r.status !== 'notstarted') return false;
      if (!q) return true;
      return r.aiNumber.toLowerCase().includes(q) || (r.partName || '').toLowerCase().includes(q) || (r.partNo || '').toLowerCase().includes(q);
    });
    return sortRows(list, sort);
  }, [rows, filter, query, hideZero, sort]);

  const p = usePaged(filtered, 25);
  const Icon = section.icon;

  return (
    <div className="ax-page">
      {crumbs(['Machine Sections', section.label])}
      <div className="ax-page-head">
        <div>
          <h1 className="ax-page-title"><Icon size={20} /> {section.label} — Schedule Register</h1>
          <p className="ax-page-sub">Produced quantity counts only Weighing Desk entries recorded on {section.label} machines.</p>
        </div>
        <div className="ax-page-actions">
          <button type="button" className="ax-btn" onClick={() => { exportCsv(`AUTOTURN_${section.id.replace(/\W+/g, '_')}_schedule.csv`, filtered); onToast('CSV exported'); }}><Download size={14} /> Export</button>
          <button type="button" className="ax-btn ax-btn-primary" onClick={onEmail}><Mail size={14} /> Alert Notice</button>
        </div>
      </div>

      {stats.changeover > 0 && (
        <div className="ax-banner">
          <AlertTriangle size={20} className="ax-banner-ico" />
          <div>
            <b>{stats.changeover} changeover{stats.changeover > 1 ? 's' : ''} required on {section.label}</b>
            <span>{stats.excessPcs > 0 ? `${fmt(stats.excessPcs)} pcs produced above schedule. ` : ''}Stop the listed machines and change over tooling.</span>
          </div>
          <button type="button" className="ax-btn ax-btn-danger" onClick={() => setFilter('changeover')}>Show changeovers</button>
        </div>
      )}

      <div className="ax-kpis">
        <Kpi label="Total schedule" value={fmt(stats.schedule)} unit="pcs" foot={`${stats.scheduledParts} AI numbers`} icon={Package} color="#1d5fd1" bg="#eaf1fd" />
        <Kpi label="Produced till now" value={fmt(stats.produced)} unit="pcs" foot={`${section.label} entries only`} icon={TrendingUp} color="#0f9d58" bg="#e7f6ee" />
        <Kpi label="Pending" value={fmt(stats.pending)} unit="pcs" foot={`${stats.pct}% of schedule covered`} icon={Layers} color="#c77700" bg="#fff4e0" />
        <Kpi label="Changeover due" value={stats.changeover} unit="AI" foot={`${stats.running} running`} icon={Repeat} color="#d93025" bg="#fdecea" />
        <Kpi label="Excess" value={fmt(stats.excessPcs)} unit="pcs" foot="Produced above schedule" icon={AlertTriangle} color="#6d4bd8" bg="#f0ecfd" />
      </div>

      <div className="ax-card">
        <div className="ax-toolbar">
          <div className="ax-seg">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => { setFilter('all'); p.setPage(1); }}>All <span className="n">{counts.all}</span></button>
            <button type="button" className={filter === 'changeover' ? 'active' : ''} onClick={() => { setFilter('changeover'); p.setPage(1); }}>Changeover <span className={`n ${counts.changeover ? 'red' : ''}`}>{counts.changeover}</span></button>
            <button type="button" className={filter === 'running' ? 'active' : ''} onClick={() => { setFilter('running'); p.setPage(1); }}>Running <span className="n">{counts.running}</span></button>
            <button type="button" className={filter === 'notstarted' ? 'active' : ''} onClick={() => { setFilter('notstarted'); p.setPage(1); }}>Not started <span className="n">{counts.notstarted}</span></button>
          </div>
          <div className="ax-search">
            <Search size={15} />
            <input placeholder="Search AI no, part name or part no…" value={query} onChange={(e) => { setQuery(e.target.value); p.setPage(1); }} />
            {query && <button type="button" className="ax-eye" onClick={() => setQuery('')}><X size={14} /></button>}
          </div>
          <div className="ax-toolbar-right">
            <label className="ax-check">
              <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
              Hide zero-schedule parts
            </label>
          </div>
        </div>

        <div className="ax-table-wrap">
          <table className="ax-table ax-num">
            <thead>
              <tr>
                <SortTh label="AI No" field="aiNumber" sort={sort} setSort={setSort} />
                <SortTh label="Total Schedule" field="schedule" sort={sort} setSort={setSort} className="r" />
                <SortTh label="Total Produced Till Now" field="produced" sort={sort} setSort={setSort} className="r" />
                <SortTh label="Pending" field="pending" sort={sort} setSort={setSort} className="r" />
                <SortTh label="Completion" field="pct" sort={sort} setSort={setSort} />
                <SortTh label="Changeover / Excess" field="priority" sort={sort} setSort={setSort} />
                <th className="c">Details</th>
              </tr>
            </thead>
            <tbody>
              {p.slice.length === 0 ? (
                <tr><td colSpan={7}><div className="ax-empty"><Search size={24} /><b>No matching AI numbers</b>Try a different filter or search term.</div></td></tr>
              ) : p.slice.map(r => (
                <tr key={r.aiNumber} className={r.changeover ? `is-${r.status}` : ''}>
                  <td>
                    <span className="ax-ai">{r.aiNumber}</span>
                    <span className="ax-ai-sub" title={r.partName}>{r.partName}</span>
                  </td>
                  <td className="r ax-strong">{fmt(r.schedule)}</td>
                  <td className={`r ax-strong ${r.produced > 0 ? 'ax-green-t' : 'ax-dim'}`}>{fmt(r.produced)}</td>
                  <td className={`r ax-strong ${r.pending > 0 ? 'ax-amber-t' : 'ax-dim'}`}>{fmt(r.pending)}</td>
                  <td><ProgressCell row={r} /></td>
                  <td><ChangeoverCell row={r} /></td>
                  <td className="c">
                    <button type="button" className="ax-btn ax-btn-sm" onClick={() => onOpenRow(r)}>
                      Open <span className="ax-dim">({r.batches.length})</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager p={p} />
      </div>
    </div>
  );
}

function ChangeoverView({ crumbs, rows, onOpenRow, onEmail, onOpenSection, onToast }) {
  const [sec, setSec] = useState('ALL');
  const list = useMemo(() => rows.filter(r => sec === 'ALL' || r.machineCategory === sec), [rows, sec]);
  const excessTotal = list.reduce((a, r) => a + r.excess, 0);
  const p = usePaged(list, 25);

  return (
    <div className="ax-page">
      {crumbs(['Changeover Control'])}
      <div className="ax-page-head">
        <div>
          <h1 className="ax-page-title"><Repeat size={20} /> Changeover Control</h1>
          <p className="ax-page-sub">Triggered when produced quantity is equal to or greater than the total schedule. Excess = produced − schedule.</p>
        </div>
        <div className="ax-page-actions">
          <button type="button" className="ax-btn" onClick={() => { exportCsv('AUTOTURN_changeover_register.csv', list); onToast('CSV exported'); }}><Download size={14} /> Export</button>
          <button type="button" className="ax-btn ax-btn-primary" onClick={onEmail}><Mail size={14} /> Send Notice</button>
        </div>
      </div>

      <div className="ax-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <Kpi label="Changeovers due" value={list.length} unit="AI" icon={Repeat} color="#d93025" bg="#fdecea" foot="Produced ≥ schedule" />
        <Kpi label="With excess" value={list.filter(r => r.status === 'excess').length} unit="AI" icon={AlertTriangle} color="#d93025" bg="#fdecea" foot="Produced > schedule" />
        <Kpi label="Target met exactly" value={list.filter(r => r.status === 'complete').length} unit="AI" icon={CheckCircle2} color="#0f9d58" bg="#e7f6ee" foot="0 excess" />
        <Kpi label="Total excess" value={fmt(excessTotal)} unit="pcs" icon={Layers} color="#6d4bd8" bg="#f0ecfd" foot="Above schedule" />
      </div>

      <div className="ax-card">
        <div className="ax-toolbar">
          <div className="ax-seg">
            <button type="button" className={sec === 'ALL' ? 'active' : ''} onClick={() => { setSec('ALL'); p.setPage(1); }}>All sections <span className="n">{rows.length}</span></button>
            {SECTIONS.map(s => {
              const n = rows.filter(r => r.machineCategory === s.id).length;
              return (
                <button type="button" key={s.id} className={sec === s.id ? 'active' : ''} onClick={() => { setSec(s.id); p.setPage(1); }}>
                  {s.label} <span className={`n ${n ? 'red' : ''}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="ax-table-wrap">
          <table className="ax-table ax-num">
            <thead>
              <tr>
                <th>AI No</th>
                <th>Section</th>
                <th className="r">Total Schedule</th>
                <th className="r">Produced Till Now</th>
                <th className="r">Excess</th>
                <th>Changeover</th>
                <th>Last entry</th>
                <th className="c">Details</th>
              </tr>
            </thead>
            <tbody>
              {p.slice.length === 0 ? (
                <tr><td colSpan={8}><div className="ax-empty"><CheckCircle2 size={26} /><b>No changeovers due</b>All AI numbers in this view are still within schedule.</div></td></tr>
              ) : p.slice.map(r => (
                <tr key={r.machineCategory + r.aiNumber} className={`is-${r.status}`}>
                  <td><span className="ax-ai">{r.aiNumber}</span><span className="ax-ai-sub" title={r.partName}>{r.partName}</span></td>
                  <td><button type="button" className="ax-btn ax-btn-sm ax-btn-ghost" onClick={() => onOpenSection(r.machineCategory)}>{r.machineCategory}</button></td>
                  <td className="r ax-strong">{fmt(r.schedule)}</td>
                  <td className="r ax-strong ax-green-t">{fmt(r.produced)}</td>
                  <td className={`r ax-strong ${r.excess > 0 ? 'ax-red-t' : 'ax-dim'}`}>{r.excess > 0 ? `+${fmt(r.excess)}` : '0'}</td>
                  <td><ChangeoverCell row={r} /></td>
                  <td>
                    {r.last ? (
                      <div className="ax-co">
                        <span>{r.last.operatorName} • {r.last.machineType}</span>
                        <small>{r.last.date} {r.last.timestamp}</small>
                      </div>
                    ) : <span className="ax-dim">—</span>}
                  </td>
                  <td className="c"><button type="button" className="ax-btn ax-btn-sm" onClick={() => onOpenRow(r)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager p={p} />
      </div>
    </div>
  );
}

function SettingsView({ crumbs, currentUser, isCloudConnected, alertEmail, setAlertEmail, onToast, recordsCount, unclassifiedCount, selectedMonths, combinedScheduleData, onOpenScheduleManager }) {
  const [email, setEmail] = useState(alertEmail);
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const saveEmail = () => {
    localStorage.setItem('autoturn_erp_alert_email', email.trim());
    setAlertEmail(email.trim());
    onToast('Alert email saved');
  };

  const changePin = () => {
    setPinMsg('');
    if (curPin !== getErpPin()) return setPinMsg('Current password is incorrect.');
    if (newPin.length < 4) return setPinMsg('New password must be at least 4 characters.');
    if (newPin !== confirmPin) return setPinMsg('New passwords do not match.');
    localStorage.setItem(ERP_PIN_KEY, newPin);
    setCurPin(''); setNewPin(''); setConfirmPin('');
    onToast('Password updated');
  };

  return (
    <div className="ax-page">
      {crumbs(['Settings'])}
      <div className="ax-page-head">
        <div>
          <h1 className="ax-page-title"><Settings size={20} /> Settings</h1>
          <p className="ax-page-sub">Account, alerts and data source configuration.</p>
        </div>
      </div>

      <div className="ax-card">
        <div className="ax-settings-grid">
          <div><h4>Signed-in user</h4><p>Current ERP session.</p></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ax-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initials(currentUser?.name)}</span>
            <div>
              <b>{currentUser?.name}</b>
              <div style={{ fontSize: 12, color: 'var(--ax-muted)' }}>{currentUser?.username} • {currentUser?.role}</div>
            </div>
          </div>
        </div>

        <div className="ax-settings-grid">
          <div><h4>Change password</h4><p>Applies to the ERP sign-in on this device.</p></div>
          <div>
            {pinMsg && <div className="ax-alert-error"><AlertTriangle size={14} /> {pinMsg}</div>}
            <div className="ax-form-row" style={{ marginBottom: 10 }}>
              <div className="ax-field" style={{ margin: 0 }}><label className="ax-label">Current password</label><input className="ax-input" type="password" value={curPin} onChange={e => setCurPin(e.target.value)} /></div>
              <div />
            </div>
            <div className="ax-form-row" style={{ marginBottom: 12 }}>
              <div className="ax-field" style={{ margin: 0 }}><label className="ax-label">New password</label><input className="ax-input" type="password" value={newPin} onChange={e => setNewPin(e.target.value)} /></div>
              <div className="ax-field" style={{ margin: 0 }}><label className="ax-label">Confirm new password</label><input className="ax-input" type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} /></div>
            </div>
            <button type="button" className="ax-btn ax-btn-primary" onClick={changePin}>Update password</button>
          </div>
        </div>

        <div className="ax-settings-grid">
          <div><h4>Changeover alert email</h4><p>Default recipient for changeover &amp; excess notices.</p></div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 480 }}>
            <input className="ax-input" type="email" placeholder="planning@autoturn.in" value={email} onChange={e => setEmail(e.target.value)} />
            <button type="button" className="ax-btn ax-btn-primary" onClick={saveEmail}>Save</button>
          </div>
        </div>

        <div className="ax-settings-grid">
          <div><h4>Changeover rule</h4><p>How the ERP decides a changeover.</p></div>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--ax-text-2)' }}>
            <div><span className="ax-chip green">Changeover due</span> Produced = Total schedule</div>
            <div><span className="ax-chip red">Changeover required</span> Produced &gt; Total schedule → shows exact excess pcs</div>
            <div><span className="ax-chip violet">Not in schedule</span> Produced on a section where the AI number has no schedule</div>
          </div>
        </div>

        <div className="ax-settings-grid">
          <div><h4>Data sources</h4><p>Where the numbers come from.</p></div>
          <div style={{ fontSize: 12.5, lineHeight: 1.8, color: 'var(--ax-text-2)' }}>
            <div style={{ marginBottom: 12 }}>
              <b>Schedule:</b> Excel uploads via Schedule Manager. Currently selected {selectedMonths.length} month(s) 
              ({combinedScheduleData.length} active AI numbers).
            </div>
            <div><b>Production:</b> Weighing Desk entries — {fmt(recordsCount)} records{unclassifiedCount > 0 ? ` (${unclassifiedCount} with unmapped machine name)` : ''}</div>
            <div><b>Database:</b> {isCloudConnected ? <span className="ax-chip green">Supabase connected</span> : <span className="ax-chip amber">Local storage only</span>}</div>
            <div style={{ marginTop: 12 }}>
              <button className="ax-btn ax-btn-primary" onClick={onOpenScheduleManager}>Manage Master Schedules</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailModal({ body, defaultTo, count, onClose, onToast }) {
  const [to, setTo] = useState(defaultTo || '');
  const [copied, setCopied] = useState(false);
  const subject = `AUTOTURN ERP — ${count} changeover${count === 1 ? '' : 's'} due (${new Date().toLocaleDateString('en-GB')})`;

  const copy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    onToast('Notice copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ax-overlay center" onClick={onClose}>
      <div className="ax-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ax-dlg-head">
          <div>
            <h3>Changeover &amp; Excess Notice</h3>
            <p>{count} AI number{count === 1 ? '' : 's'} included</p>
          </div>
          <button type="button" className="ax-btn ax-btn-ghost ax-btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="ax-dlg-body">
          <div className="ax-field">
            <label className="ax-label">To</label>
            <input className="ax-input" type="email" placeholder="planning@autoturn.in" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="ax-field">
            <label className="ax-label">Subject</label>
            <input className="ax-input" value={subject} readOnly />
          </div>
          <div className="ax-field" style={{ marginBottom: 0 }}>
            <label className="ax-label">Message</label>
            <textarea className="ax-textarea" readOnly value={body} />
          </div>
        </div>
        <div className="ax-dlg-foot">
          <button type="button" className="ax-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ax-btn" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} Copy</button>
          <a className="ax-btn ax-btn-primary" href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
            <Mail size={14} /> Open in email
          </a>
        </div>
      </div>
    </div>
  );
}
