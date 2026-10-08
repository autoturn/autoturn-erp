import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Users, 
  Search, 
  Trash2, 
  RotateCcw,
  Check,
  UserCheck,
  Building2,
  Mic,
  Sparkles
} from 'lucide-react';

export function OperatorMasterModal({
  isOpen,
  onClose,
  operators,
  onAddOperator,
  onDeleteOperator,
  onResetOperators
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Operator Form State
  const [name, setName] = useState('');
  const [marathiName, setMarathiName] = useState('');
  const [shortName, setShortName] = useState('');
  const [aliases, setAliases] = useState('');
  const [department, setDepartment] = useState('Machining');
  const [shiftPreference, setShiftPreference] = useState('Day');

  if (!isOpen) return null;

  const handleCreateOperator = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter operator name');
      return;
    }

    const aliasList = aliases
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(a => a.length > 0);

    const sName = shortName.trim() || name.trim().split(' ')[0];

    const newOp = {
      id: `OP-${Date.now().toString().slice(-3)}`,
      name: name.trim(),
      marathiName: marathiName.trim() || name.trim(),
      shortName: sName,
      aliases: aliasList,
      department,
      shiftPreference
    };

    onAddOperator(newOp);
    setName('');
    setMarathiName('');
    setShortName('');
    setAliases('');
    setShowAddForm(false);
  };

  const filteredOperators = operators.filter(op => 
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (op.marathiName && op.marathiName.includes(searchTerm)) ||
    (op.shortName && op.shortName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (op.aliases && op.aliases.some(a => a.includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modern-op-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle-bar"><div className="modal-handle" /></div>
        {/* Modern Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ background: 'var(--brand-primary-bg)', color: 'var(--brand-primary)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <h2 className="modal-title">Operator Master</h2>
                <span className="op-count-pill">{operators.length} Operators</span>
              </div>
              <p className="modal-subtitle">Shopfloor operators with Marathi voice recognition aliases</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </div>

        <div className="modal-body modern-modal-body">
          {/* Action Toolbar */}
          <div className="op-master-toolbar">
            <div className="op-search-box">
              <Search size={15} className="op-search-ico" />
              <input 
                type="text"
                className="op-search-input"
                placeholder="Search operator by English, Marathi name or voice alias..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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

            <div className="op-toolbar-actions">
              <button 
                type="button" 
                className={`btn-add-operator-toggle ${showAddForm ? 'active' : ''}`}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus size={15} />
                <span>{showAddForm ? 'Close Form' : 'Register Operator'}</span>
              </button>
              <button 
                type="button"
                className="btn-restore-defaults"
                onClick={onResetOperators}
                title="Restore default Marathi operators"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Add Operator Form (Clean Collapsible Card) */}
          {showAddForm && (
            <form onSubmit={handleCreateOperator} className="op-register-card">
              <div className="op-register-header">
                <UserCheck size={16} className="text-indigo-600" />
                <h3 className="op-register-title">Register New Operator</h3>
              </div>

              <div className="op-register-grid">
                <div className="op-input-group">
                  <label className="op-input-label">Full Name (English) *</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Ramesh Borkar" 
                    required 
                  />
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Marathi Name (मराठी नाव)</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={marathiName} 
                    onChange={e => setMarathiName(e.target.value)} 
                    placeholder="उदा. रमेश बोरकर" 
                  />
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Calling / Short Name</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={shortName} 
                    onChange={e => setShortName(e.target.value)} 
                    placeholder="e.g. Ramesh" 
                  />
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Department</label>
                  <select 
                    className="op-form-input op-select"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  >
                    <option value="Machining">Machining</option>
                    <option value="Press Shop">Press Shop</option>
                    <option value="CNC Shop">CNC Shop</option>
                    <option value="Molding">Molding</option>
                    <option value="Grinding">Grinding</option>
                    <option value="Assembly">Assembly</option>
                  </select>
                </div>
              </div>

              <div className="op-input-group mt-3">
                <label className="op-input-label">
                  Voice Phonetic Aliases (comma separated)
                  <span className="op-label-hint">Handles accent variations when Sayali Madam speaks</span>
                </label>
                <input 
                  type="text" 
                  className="op-form-input" 
                  value={aliases} 
                  onChange={e => setAliases(e.target.value)} 
                  placeholder="e.g. borkar, rames, rameshbhai" 
                />
              </div>

              <div className="op-register-footer">
                <button 
                  type="button" 
                  className="btn-cancel-flat"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save-operator">
                  <Check size={14} />
                  <span>Save Operator</span>
                </button>
              </div>
            </form>
          )}

          {/* Clean Modern Operators Table / Cards */}
          <div className="modern-operator-list">
            {filteredOperators.length === 0 ? (
              <div className="empty-op-state">
                <p className="empty-txt">No operators found matching "{searchTerm}"</p>
                <button 
                  type="button" 
                  className="btn-link-action"
                  onClick={() => setSearchTerm('')}
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="op-grid-cards">
                {filteredOperators.map(op => (
                  <div key={op.id} className="op-person-card">
                    <div className="op-person-header">
                      <div className="op-avatar">
                        {op.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="op-info-col">
                        <div className="op-name-row">
                          <span className="op-title-eng">{op.name}</span>
                          <span className="op-code-badge">{op.id}</span>
                        </div>
                        {op.marathiName && (
                          <span className="op-marathi-text">{op.marathiName}</span>
                        )}
                      </div>
                      <button 
                        type="button" 
                        className="btn-delete-op"
                        onClick={() => onDeleteOperator(op.id)}
                        title="Delete operator"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="op-person-meta">
                      <span className="op-dept-chip">
                        <Building2 size={11} />
                        {op.department}
                      </span>
                      <span className={`op-shift-chip ${op.shiftPreference === 'Night' ? 'night' : 'day'}`}>
                        {op.shiftPreference === 'Night' ? '🌙 Night' : '☀️ Day'}
                      </span>
                    </div>

                    {op.aliases && op.aliases.length > 0 && (
                      <div className="op-aliases-list">
                        <Mic size={10} className="text-slate-400 shrink-0" />
                        <div className="op-alias-tags">
                          {op.aliases.map((al, idx) => (
                            <span key={idx} className="op-alias-tag">{al}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
