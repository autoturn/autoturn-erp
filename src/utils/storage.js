// LocalStorage & Cloud Migration Storage Helpers

export const STORAGE_KEYS = {
  CURRENT_USER: 'erp_current_user',
  RECORDS: 'erp_weighing_records',
  OPERATORS: 'erp_operator_master',
  MACHINES: 'erp_machine_master',
  PARTS: 'erp_parts_master',
  SUPABASE_CONFIG: 'erp_supabase_config',
  VIEW_MODE: 'erp_view_mode' // 'mobile' | 'tablet' | 'desktop'
};

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

/**
 * Auto-detects whether the current time falls under:
 * Day Shift (07:00 AM to 07:00 PM)
 * or Night Shift (07:00 PM to 07:00 AM)
 */
export function getCurrentShift() {
  const now = new Date();
  const hours = now.getHours(); // 0 to 23
  if (hours >= 7 && hours < 19) {
    return 'Day Shift (7:00 AM - 7:00 PM)';
  } else {
    return 'Night Shift (7:00 PM - 7:00 AM)';
  }
}

export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime12h(date = new Date()) {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Export records to CSV for shopfloor Excel sheets
export function downloadRecordsCSV(records, filename = 'shopfloor_weighing_records.csv') {
  if (!records || records.length === 0) {
    alert('No records available to export.');
    return;
  }

  const headers = [
    'Date',
    'Time',
    'Shift',
    'Operator Name',
    'Machine Type',
    'AI / Part Number',
    'Counted Quantity (pcs)',
    'Entry By',
    'Method',
    'Status'
  ];

  const rows = records.map(r => [
    r.date,
    r.timestamp,
    `"${r.shift}"`,
    `"${r.operatorName}"`,
    `"${r.machineType}"`,
    r.aiNumber,
    r.quantity,
    `"${r.entryBy || 'Sayali Madam'}"`,
    `"${r.method || 'Voice Entry'}"`,
    r.status || 'Verified'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Supabase SQL Schema for Cloud Deployment
export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- ApexERP • Shopfloor Weighing Schema for Supabase
-- Paste this script into your Supabase SQL Editor
-- ==========================================

-- 1. Create Weighing Records Table
CREATE TABLE IF NOT EXISTS erp_weighing_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT NOT NULL,
  operator_id TEXT,
  operator_name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  ai_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'pcs',
  weight_kg NUMERIC,
  entry_by TEXT NOT NULL DEFAULT 'Sayali Madam',
  entry_method TEXT DEFAULT 'Voice Entry',
  status TEXT DEFAULT 'Verified'
);

-- 2. Create Operator Master Table
CREATE TABLE IF NOT EXISTS erp_operators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  marathi_name TEXT,
  short_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  department TEXT,
  shift_preference TEXT DEFAULT 'Day',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security Policies
ALTER TABLE erp_weighing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated & anon read/write for shopfloor"
  ON erp_weighing_entries FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read of operator master"
  ON erp_operators FOR ALL
  USING (true)
  WITH CHECK (true);
`;
