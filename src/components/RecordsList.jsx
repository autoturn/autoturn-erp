import React, { useState } from 'react';
import { 
  Download, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Mic, 
  Layers, 
  Clock, 
  User, 
  Cpu, 
  Scale, 
  FileSpreadsheet,
  AlertTriangle,
  Table as TableIcon,
  LayoutGrid,
  Calendar,
  Filter,
  X,
  Save,
  RotateCcw
} from 'lucide-react';
import { downloadRecordsCSV, getTodayDateString } from '../utils/storage';

export function RecordsList({ 
  records, 
  onDeleteRecord, 
  onUpdateRecord, 
  operatorMaster = [], 
  machines = [] 
}) {
  const todayStr = getTodayDateString();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState('all'); // 'all' | 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState(todayStr);
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all' | 'day' | 'night'
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [viewStyle, setViewStyle] = useState('table'); // 'table' | 'cards'
  const [statusMessage, setStatusMessage] = useState('');

  // Editing Record State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Calculate Yesterday's date string
  const yesterday = new Date(Date.now() - 86400000);
  const yY = yesterday.getFullYear();
  const yM = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yD = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yY}-${yM}-${yD}`;

  // Filter records based on active criteria
  const filteredRecords = records.filter(r => {
    // 1. Search text filter
    const matchesSearch = 
      !searchTerm ||
      r.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.aiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.machineType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.date && r.date.includes(searchTerm));

    // 2. Date filter
    let matchesDate = true;
    if (dateFilterMode === 'today') {
      matchesDate = r.date === todayStr;
    } else if (dateFilterMode === 'yesterday') {
      matchesDate = r.date === yesterdayStr;
    } else if (dateFilterMode === 'custom') {
      matchesDate = r.date === customDate;
    }

    // 3. Shift filter
    let matchesShift = true;
    if (shiftFilter === 'day') {
      matchesShift = r.shift && r.shift.includes('Day');
    } else if (shiftFilter === 'night') {
      matchesShift = r.shift && r.shift.includes('Night');
    }

    // 4. Operator filter
    const matchesOperator = 
      operatorFilter === 'all' || 
      r.operatorName.toLowerCase() === operatorFilter.toLowerCase();

    // 5. Machine filter
    const matchesMachine = 
      machineFilter === 'all' || 
      r.machineType.toLowerCase() === machineFilter.toLowerCase();

    return matchesSearch && matchesDate && matchesShift && matchesOperator && matchesMachine;
  });

  // Dynamic KPI calculations for currently filtered records (Weight removed completely)
  const totalPieces = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.quantity) || 0), 0);
  const uniqueOperators = new Set(filteredRecords.map(r => r.operatorName)).size;

  // Unique lists for filter dropdowns
  const availableOperators = Array.from(new Set(records.map(r => r.operatorName).filter(Boolean)));
  const availableMachines = Array.from(new Set(records.map(r => r.machineType).filter(Boolean)));

  const hasActiveFilters = 
    searchTerm || 
    dateFilterMode !== 'all' || 
    shiftFilter !== 'all' || 
    operatorFilter !== 'all' || 
    machineFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setDateFilterMode('all');
    setShiftFilter('all');
    setOperatorFilter('all');
    setMachineFilter('all');
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setEditFormData({
      id: record.id,
      date: record.date || todayStr,
      shift: record.shift || 'Day Shift (7:00 AM - 7:00 PM)',
      operatorName: record.operatorName || '',
      operatorId: record.operatorId || '',
      machineType: record.machineType || '',
      aiNumber: record.aiNumber || '',
      quantity: record.quantity || '',
      status: record.status || 'Verified',
      entryBy: record.entryBy || 'Sayali Madam',
      timestamp: record.timestamp || ''
    });
  };

  // Save Edited Record
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.operatorName.trim()) {
      alert('Operator name is required');
      return;
    }
    if (!editFormData.machineType.trim()) {
      alert('Machine type is required');
      return;
    }
    if (!editFormData.aiNumber.trim()) {
      alert('AI / Part number is required');
      return;
    }
    if (!editFormData.quantity || parseFloat(editFormData.quantity) <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    const updatedRecord = {
      ...editingRecord,
      date: editFormData.date,
      shift: editFormData.shift,
      operatorName: editFormData.operatorName.trim(),
      operatorId: editFormData.operatorId || 'OP-CUSTOM',
      machineType: editFormData.machineType.trim(),
      aiNumber: editFormData.aiNumber.trim().toUpperCase(),
      quantity: parseFloat(editFormData.quantity),
      status: editFormData.status,
      lastModified: new Date().toLocaleTimeString('en-IN')
    };

    onUpdateRecord(updatedRecord);
    setEditingRecord(null);
    setStatusMessage(`Updated ${updatedRecord.aiNumber} (${updatedRecord.quantity} pcs) successfully!`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  return (
    <div className="records-view-container">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="record-toast-banner">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Dynamic Mini KPI Strip (Clean 3-Card Layout, Weight removed) */}
      <div className="compact-kpi-grid kpi-grid-3">
        <div className="mini-kpi-card">
          <div className="mini-kpi-icon bg-indigo-50 text-indigo-600">
            <Layers size={14} />
          </div>
          <div className="mini-kpi-content">
            <span className="mini-kpi-label">Entries {hasActiveFilters ? '(Filtered)' : ''}</span>
            <span className="mini-kpi-val mono-font">{filteredRecords.length}</span>
          </div>
        </div>

        <div className="mini-kpi-card">
          <div className="mini-kpi-icon bg-emerald-50 text-emerald-600">
            <Scale size={14} />
          </div>
          <div className="mini-kpi-content">
            <span className="mini-kpi-label">Pieces Counted</span>
            <span className="mini-kpi-val text-emerald-600 mono-font">{totalPieces.toLocaleString()} pcs</span>
          </div>
        </div>

        <div className="mini-kpi-card">
          <div className="mini-kpi-icon bg-amber-50 text-amber-600">
            <User size={14} />
          </div>
          <div className="mini-kpi-content">
            <span className="mini-kpi-label">Active Operators</span>
            <span className="mini-kpi-val mono-font">{uniqueOperators}</span>
          </div>
        </div>
      </div>

      {/* Date & Filter Selection Toolbar */}
      <div className="records-filter-panel">
        {/* Row 1: Date Filter Selection */}
        <div className="date-filter-row">
          <div className="date-filter-label">
            <Calendar size={13} className="text-indigo-600" />
            <span>Date:</span>
          </div>

          <div className="date-filter-pills">
            <button 
              type="button"
              className={`date-pill ${dateFilterMode === 'all' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('all')}
            >
              All Dates
            </button>
            <button 
              type="button"
              className={`date-pill ${dateFilterMode === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('today')}
            >
              Today
            </button>
            <button 
              type="button"
              className={`date-pill ${dateFilterMode === 'yesterday' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('yesterday')}
            >
              Yesterday
            </button>
            <button 
              type="button"
              className={`date-pill ${dateFilterMode === 'custom' ? 'active' : ''}`}
              onClick={() => setDateFilterMode('custom')}
            >
              Pick Date
            </button>
          </div>

          {dateFilterMode === 'custom' && (
            <input 
              type="date"
              className="custom-date-picker"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
            />
          )}
        </div>

        {/* Row 2: Secondary Dropdown Filters & Search */}
        <div className="secondary-filters-row">
          <div className="search-wrap-box">
            <Search size={14} className="search-ico" />
            <input 
              type="text"
              className="compact-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search AI#, operator, machine..."
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Shift Filter */}
          <select 
            className="filter-dropdown-select"
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="day">☀️ Day Shift</option>
            <option value="night">🌙 Night Shift</option>
          </select>

          {/* Operator Filter */}
          <select 
            className="filter-dropdown-select"
            value={operatorFilter}
            onChange={e => setOperatorFilter(e.target.value)}
          >
            <option value="all">All Operators</option>
            {availableOperators.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {/* Machine Filter */}
          <select 
            className="filter-dropdown-select"
            value={machineFilter}
            onChange={e => setMachineFilter(e.target.value)}
          >
            <option value="all">All Machines</option>
            {availableMachines.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button 
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}

          {/* Table / Card view toggle */}
          <div className="view-toggle-wrap">
            <button 
              className={`view-toggle-btn ${viewStyle === 'table' ? 'active' : ''}`}
              onClick={() => setViewStyle('table')}
              title="Table view"
            >
              <TableIcon size={14} />
            </button>
            <button 
              className={`view-toggle-btn ${viewStyle === 'cards' ? 'active' : ''}`}
              onClick={() => setViewStyle('cards')}
              title="Card view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* Export button */}
          <button 
            className="compact-export-btn"
            onClick={() => downloadRecordsCSV(filteredRecords, `production_records_${dateFilterMode}.csv`)}
            title="Download CSV"
          >
            <FileSpreadsheet size={13} />
            <span>CSV ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Records Content */}
      {filteredRecords.length === 0 ? (
        <div className="compact-empty-state">
          <AlertTriangle size={24} className="text-slate-300" />
          <p className="empty-txt">No records found matching current date and filters.</p>
          {hasActiveFilters && (
            <button 
              type="button" 
              className="btn-link-action"
              onClick={handleResetFilters}
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : viewStyle === 'table' ? (
        /* Accurate ERP Table View with Date & Time column (ID and Weight removed) */
        <div className="records-table-card">
          <table className="erp-records-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Shift</th>
                <th>Operator</th>
                <th>Machine</th>
                <th>AI / Part #</th>
                <th>Quantity</th>
                <th>Method</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const isDay = r.shift && r.shift.includes('Day');
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="table-time-cell">
                        <span className="table-date-text">{r.date}</span>
                        <span className="table-time-text">{r.timestamp || '08:00 AM'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`table-shift-badge ${isDay ? 'day' : 'night'}`}>
                        {isDay ? '☀️ Day' : '🌙 Night'}
                      </span>
                    </td>
                    <td>
                      <div className="table-op-cell">
                        <span className="op-name">{r.operatorName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="machine-text">{r.machineType}</span>
                    </td>
                    <td>
                      <span className="ai-badge mono-font">{r.aiNumber}</span>
                    </td>
                    <td>
                      <span className="qty-highlight mono-font">{r.quantity} <span className="unit">pcs</span></span>
                    </td>
                    <td>
                      {r.method === 'Voice Entry' ? (
                        <span className="voice-entry-tag">
                          <Mic size={10} /> Voice
                        </span>
                      ) : (
                        <span className="manual-tag">Manual</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="table-action-btns">
                        <button 
                          type="button"
                          className="btn-edit-compact"
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Record"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          type="button"
                          className="btn-trash-compact"
                          onClick={() => onDeleteRecord(r.id)}
                          title="Delete Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Compact Card View (Mobile-Friendly, Weight removed) */
        <div className="compact-cards-list">
          {filteredRecords.map((r) => {
            const isDay = r.shift && r.shift.includes('Day');
            return (
              <div key={r.id} className="compact-record-card">
                <div className="card-row-top">
                  <div className="flex items-center gap-2">
                    <span className="r-date-badge">{r.date} • {r.timestamp}</span>
                    <span className={`table-shift-badge ${isDay ? 'day' : 'night'}`}>
                      {isDay ? '☀️ Day' : '🌙 Night'}
                    </span>
                    {r.method === 'Voice Entry' && (
                      <span className="voice-entry-tag">
                        <Mic size={10} /> Voice
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      className="btn-edit-compact"
                      onClick={() => handleOpenEdit(r)}
                      title="Edit Record"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button 
                      type="button"
                      className="btn-trash-compact"
                      onClick={() => onDeleteRecord(r.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="card-row-mid">
                  <div>
                    <div className="op-name">{r.operatorName}</div>
                    <div className="machine-text">{r.machineType}</div>
                  </div>
                  <div className="text-right">
                    <div className="ai-badge mono-font">{r.aiNumber}</div>
                    <div className="qty-highlight mono-font">
                      {r.quantity} <span className="unit">pcs</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Record Modal (Weight removed) */}
      {editingRecord && (
        <div className="modal-backdrop" onClick={() => setEditingRecord(null)}>
          <div className="modal-card edit-record-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  <Edit3 size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="modal-title">Edit Production Record</h2>
                  <p className="modal-subtitle">{editingRecord.date} • {editingRecord.timestamp || 'Recorded by Sayali Madam'}</p>
                </div>
              </div>
              <button 
                type="button"
                className="modal-close-btn" 
                onClick={() => setEditingRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-body edit-modal-body">
              <div className="edit-form-grid">
                {/* Date */}
                <div className="edit-field-group">
                  <label className="edit-label">Entry Date</label>
                  <input 
                    type="date"
                    className="edit-input"
                    value={editFormData.date}
                    onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                    required
                  />
                </div>

                {/* Shift */}
                <div className="edit-field-group">
                  <label className="edit-label">Shift</label>
                  <select 
                    className="edit-input"
                    value={editFormData.shift}
                    onChange={e => setEditFormData({ ...editFormData, shift: e.target.value })}
                  >
                    <option value="Day Shift (7:00 AM - 7:00 PM)">☀️ Day Shift (07:00 AM - 07:00 PM)</option>
                    <option value="Night Shift (7:00 PM - 7:00 AM)">🌙 Night Shift (07:00 PM - 07:00 AM)</option>
                  </select>
                </div>

                {/* Operator Name */}
                <div className="edit-field-group edit-col-full">
                  <label className="edit-label">Operator Name</label>
                  <input 
                    type="text"
                    list="edit-op-options"
                    className="edit-input"
                    value={editFormData.operatorName}
                    onChange={e => setEditFormData({ ...editFormData, operatorName: e.target.value })}
                    placeholder="Type or select operator..."
                    required
                  />
                  <datalist id="edit-op-options">
                    {operatorMaster.map(op => (
                      <option key={op.id} value={op.name}>
                        {op.name} ({op.marathiName || op.shortName})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Machine */}
                <div className="edit-field-group">
                  <label className="edit-label">Machine Type</label>
                  <input 
                    type="text"
                    list="edit-machine-options"
                    className="edit-input"
                    value={editFormData.machineType}
                    onChange={e => setEditFormData({ ...editFormData, machineType: e.target.value })}
                    placeholder="e.g. CNC Lathe 01"
                    required
                  />
                  <datalist id="edit-machine-options">
                    {machines.map(m => (
                      <option key={m.id} value={m.code}>{m.code}</option>
                    ))}
                  </datalist>
                </div>

                {/* AI / Part Number */}
                <div className="edit-field-group">
                  <label className="edit-label">AI / Part Number</label>
                  <input 
                    type="text"
                    className="edit-input mono-font font-bold"
                    value={editFormData.aiNumber}
                    onChange={e => setEditFormData({ ...editFormData, aiNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. AI-1042"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="edit-field-group edit-col-full">
                  <label className="edit-label">Counted Quantity (pcs)</label>
                  <input 
                    type="number"
                    step="1"
                    min="1"
                    className="edit-input mono-font font-bold text-indigo-700 text-base"
                    value={editFormData.quantity}
                    onChange={e => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="edit-modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel-flat"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save-record">
                  <Save size={15} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
