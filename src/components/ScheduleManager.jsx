import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, Trash2, CheckCircle2, AlertCircle, X, Calendar } from 'lucide-react';
import '../erp.css';

export const SCHEDULES_KEY = 'autoturn_erp_schedules';

export function getStoredSchedules() {
  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredSchedules(schedules) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

// Normalize AI number (AI-XXX)
function normAi(raw) {
  if (!raw) return '';
  let s = String(raw).toUpperCase().replace(/\s+/g, '');
  if (s.endsWith('.0')) s = s.slice(0, -2);
  const rest = s.replace(/^AI[-_.:]?(NO)?[-_.:]?/, '');
  return `AI-${rest}`;
}

export function ScheduleManager({ onClose }) {
  const [schedules, setSchedules] = useState([]);
  const [monthName, setMonthName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setSchedules(getStoredSchedules());
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!monthName.trim()) {
      setError('Please enter a Month/Year (e.g. Oct 2026) before uploading.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      
      // Prefer "Master Sheet", otherwise use first sheet
      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('master')) || wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const aiSummary = {};

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length < 10) continue;

        const rawAi = row[4]; // Column E (0-indexed 4) — AI Number
        if (!rawAi) continue;
        
        const aiStr = String(rawAi).trim().toUpperCase();
        // Skip header rows like "AI No"
        if (aiStr === 'AI NO' || aiStr === 'AI NUMBER' || aiStr.includes('FINAL')) continue;

        const ai = normAi(rawAi);

        // Final revised schedule = Column N (index 13)
        const schVal = row[13];
        const schQty = parseFloat(schVal) || 0;

        const cust = (row[0] || '').toString().trim();
        const partNo = (row[1] || '').toString().trim();
        const partName = (row[5] || '').toString().trim();

        // Column G (index 6) = AUTO/NON AUTO type
        // Column H (index 7) = Machine type code (VMC, ROLLING, GRINDING, etc.)
        // Column J (index 9) = Operation type (MILLING, etc.)
        const c7 = (row[6] || '').toString().trim().toUpperCase();
        const c8 = (row[7] || '').toString().trim().toUpperCase();
        const c10 = (row[9] || '').toString().trim().toUpperCase();

        // Categorize ONLY based on column data — NO part name guessing
        let machineCat = 'Sliding Head';
        if (c7.includes('AUTO') && !c7.includes('NON')) {
          machineCat = 'Sliding Head';
        } else if (c7.includes('NON AUTO')) {
          if (c8.includes('VMC') || c10.includes('MILLING') || c8.includes('MILLING')) {
            machineCat = 'VMC / Milling';
          } else if (c8.includes('ROLLING') || c10.includes('ROLLING')) {
            machineCat = 'Rolling';
          } else if (c8.includes('GRINDING') || c10.includes('GRINDING')) {
            machineCat = 'Grinding';
          } else {
            machineCat = 'CNC';
          }
        }

        // Feature Request: ONLY take schedule for Sliding Head, ignore everything else
        if (machineCat !== 'Sliding Head') {
          continue;
        }

        if (!aiSummary[ai]) {
          aiSummary[ai] = {
            aiNumber: ai,
            totalSchedule: 0,
            machineCategory: machineCat,
            partName: partName || 'Precision Turned Part',
            partNo: partNo || '-',
            customers: []
          };
        }

        aiSummary[ai].totalSchedule += schQty;
        if (cust && !aiSummary[ai].customers.includes(cust)) {
          aiSummary[ai].customers.push(cust);
        }
        if (partName && aiSummary[ai].partName === 'Precision Turned Part') {
          aiSummary[ai].partName = partName;
        }
        if (partNo && aiSummary[ai].partNo === '-') {
          aiSummary[ai].partNo = partNo;
        }
      }

      const outList = Object.values(aiSummary);

      if (outList.length === 0) {
        setError('No valid AI numbers or schedule found in this file. Check that it has a "Master Sheet" tab with AI numbers in Column E and Final Revised Schedule in Column N.');
        setLoading(false);
        return;
      }

      const newSchedule = {
        id: Date.now().toString(),
        month: monthName.trim(),
        uploadedAt: new Date().toISOString(),
        data: outList
      };

      const updated = [...schedules, newSchedule];
      setSchedules(updated);
      saveStoredSchedules(updated);
      
      setSuccess(`Imported ${outList.length} AI numbers for "${monthName}". You can now select this month in the ERP header.`);
      setMonthName('');
    } catch (err) {
      console.error(err);
      setError('Error parsing Excel file. Ensure it is a valid .xlsx file.');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const deleteSchedule = (id) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    saveStoredSchedules(updated);
  };

  return (
    <div className="ax-overlay center" onClick={onClose}>
      <div className="ax-modal" style={{ maxWidth: '600px', width: '90vw' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="ax-dlg-head">
          <div>
            <h3>Manage Master Schedules</h3>
            <p>Upload your monthly "SCHEDULE VS DISPATCH" Excel — supports up to 3 months simultaneously.</p>
          </div>
          <button type="button" className="ax-btn ax-btn-ghost ax-btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="ax-dlg-body">

          {/* Upload section */}
          <div style={{ background: 'var(--ax-surface-2)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--ax-border-soft)' }}>
            <div className="ax-field" style={{ marginBottom: '1rem' }}>
              <label className="ax-label">
                <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                Month / Period Name
              </label>
              <input 
                type="text" 
                className="ax-input" 
                placeholder="e.g. October 2026, Nov-Dec 2026, Q4 2026" 
                value={monthName}
                onChange={(e) => setMonthName(e.target.value)}
              />
            </div>
            
            <label 
              className={`ax-btn ax-btn-primary ${!monthName.trim() || loading ? 'disabled' : ''}`}
              style={{ display: 'flex', justifyContent: 'center', cursor: monthName.trim() && !loading ? 'pointer' : 'not-allowed', opacity: monthName.trim() && !loading ? 1 : 0.5 }}
            >
              <UploadCloud size={16} />
              {loading ? 'Processing Excel...' : 'Upload Excel File (.xlsx)'}
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={!monthName.trim() || loading}
              />
            </label>

            <p style={{ fontSize: '11.5px', color: 'var(--ax-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
              Uses <b>Column E</b> (AI No.), <b>Column G</b> (AUTO/NON AUTO), <b>Column H</b> (Machine type), 
              <b> Column N</b> (Final Revised Schedule). No part name guessing — categorised purely by Excel column data.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--ax-red)', background: 'var(--ax-red-50)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: 13 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--ax-green)', background: 'var(--ax-green-50)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: 13 }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Stored schedules list */}
          <div style={{ borderTop: '1px solid var(--ax-border-soft)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0 }}>Uploaded Schedules ({schedules.length})</h4>
              <span style={{ fontSize: 12, color: 'var(--ax-muted)' }}>Select month from the ERP header dropdown</span>
            </div>
            
            {schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ax-muted)', background: 'var(--ax-surface-2)', borderRadius: '8px' }}>
                <Calendar size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No schedules uploaded yet. Upload your first Excel sheet above.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {schedules.map(sch => {
                  const bySection = {};
                  sch.data.forEach(d => { bySection[d.machineCategory] = (bySection[d.machineCategory] || 0) + 1; });
                  return (
                    <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ax-surface-2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--ax-border-soft)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sch.month}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ax-muted)', marginTop: '0.2rem' }}>
                          {sch.data.length} AI numbers • Uploaded {new Date(sch.uploadedAt).toLocaleDateString('en-IN')}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                          {Object.entries(bySection).map(([sec, count]) => (
                            <span key={sec} className="ax-chip" style={{ fontSize: 10, padding: '1px 6px' }}>{sec}: {count}</span>
                          ))}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => deleteSchedule(sch.id)} 
                        className="ax-btn ax-btn-ghost ax-btn-icon"
                        style={{ color: 'var(--ax-red)', flexShrink: 0 }}
                        title="Delete this schedule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="ax-dlg-foot">
          <button type="button" className="ax-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
