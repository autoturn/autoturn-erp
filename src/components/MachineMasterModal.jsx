import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Cpu, 
  Search, 
  Trash2, 
  RotateCcw,
  Check,
  Layers,
  Mic
} from 'lucide-react';

export function MachineMasterModal({ 
  isOpen, 
  onClose, 
  machines, 
  onAddMachine, 
  onDeleteMachine, 
  onResetMachines 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Machine Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState('Sliding Head');
  const [department, setDepartment] = useState('Sliding Head Section');
  const [shortCode, setShortCode] = useState('');
  const [aliases, setAliases] = useState('');

  if (!isOpen) return null;

  const handleCreateMachine = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      alert('Please enter machine code or name');
      return;
    }

    const aliasList = aliases
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(a => a.length > 0);

    const newMachine = {
      id: shortCode.trim() || `M-${Date.now().toString().slice(-3)}`,
      code: code.trim(),
      type: type,
      department: department.trim() || `${type} Section`,
      aliases: aliasList
    };

    onAddMachine(newMachine);
    setCode('');
    setType('Sliding Head');
    setDepartment('Sliding Head Section');
    setShortCode('');
    setAliases('');
    setShowAddForm(false);
  };

  const filteredMachines = machines.filter(m => 
    (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.type && m.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.id && m.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.aliases && m.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modern-op-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle-bar"><div className="modal-handle" /></div>
        {/* Modern Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <h2 className="modal-title">Machine Master</h2>
                <span className="op-count-pill" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14,165,233,0.25)' }}>
                  {machines.length} Machines
                </span>
              </div>
              <p className="modal-subtitle">Shopfloor machines with voice recognition aliases</p>
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
                placeholder="Search machine by code, type or voice alias..."
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
                style={!showAddForm ? { background: '#0284c7' } : {}}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus size={15} />
                <span>{showAddForm ? 'Close Form' : 'Register Machine'}</span>
              </button>
              <button 
                type="button"
                className="btn-restore-defaults"
                onClick={onResetMachines}
                title="Restore default machines"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Add Machine Form (Clean Collapsible Card) */}
          {showAddForm && (
            <form onSubmit={handleCreateMachine} className="op-register-card" style={{ borderColor: 'rgba(14, 165, 233, 0.4)' }}>
              <div className="op-register-header">
                <Cpu size={16} style={{ color: '#0284c7' }} />
                <h3 className="op-register-title">Register New Machine</h3>
              </div>

              <div className="op-register-grid">
                <div className="op-input-group">
                  <label className="op-input-label">Machine Code / Name *</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="e.g. Sliding Head 04" 
                    required 
                  />
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Machine Type</label>
                  <select 
                    className="op-form-input op-select"
                    value={type}
                    onChange={e => {
                      const selected = e.target.value;
                      setType(selected);
                      if (selected === 'Sliding Head') setDepartment('Sliding Head Section');
                      else if (selected === 'CNC') setDepartment('CNC Lathe Cell');
                      else if (selected === 'VMC') setDepartment('VMC Milling');
                      else if (selected === 'Grinding') setDepartment('Grinding Line');
                      else if (selected === 'Rolling') setDepartment('Thread Rolling');
                      else if (selected === 'Press') setDepartment('Press Shop');
                    }}
                  >
                    <option value="Sliding Head">Sliding Head</option>
                    <option value="CNC">CNC</option>
                    <option value="VMC">VMC</option>
                    <option value="Grinding">Grinding</option>
                    <option value="Rolling">Rolling</option>
                    <option value="Press">Press</option>
                    <option value="Assembly">Assembly</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Plant Department / Cell</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={department} 
                    onChange={e => setDepartment(e.target.value)} 
                    placeholder="e.g. Sliding Head Section" 
                  />
                </div>

                <div className="op-input-group">
                  <label className="op-input-label">Short Tag / ID</label>
                  <input 
                    type="text" 
                    className="op-form-input" 
                    value={shortCode} 
                    onChange={e => setShortCode(e.target.value)} 
                    placeholder="e.g. SH-04" 
                  />
                </div>
              </div>

              <div className="op-input-group" style={{ gridColumn: '1/-1', marginTop: 4 }}>
                <label className="op-input-label">
                  Voice Phonetic Aliases (comma separated)
                  <span className="op-label-hint">Handles voice variations when Sayali Madam speaks</span>
                </label>
                <input 
                  type="text" 
                  className="op-form-input" 
                  value={aliases} 
                  onChange={e => setAliases(e.target.value)} 
                  placeholder="e.g. sliding 4, slide head four, sh char, char number sliding" 
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
                <button type="submit" className="btn-save-operator" style={{ background: '#0284c7' }}>
                  <Check size={14} />
                  <span>Save Machine</span>
                </button>
              </div>
            </form>
          )}

          {/* Clean Modern Machines Cards */}
          <div className="modern-operator-list">
            {filteredMachines.length === 0 ? (
              <div className="empty-op-state">
                <p className="empty-txt">No machines found matching "{searchTerm}"</p>
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
                {filteredMachines.map(m => {
                  const avatarText = m.type 
                    ? (m.type === 'Sliding Head' ? 'SH' : m.type.slice(0, 3).toUpperCase())
                    : 'MC';
                  return (
                    <div key={m.id || m.code} className="op-person-card">
                      <div className="op-person-header">
                        <div 
                          className="op-avatar" 
                          style={{ 
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            fontSize: '0.68rem',
                            letterSpacing: '0.5px'
                          }}
                        >
                          {avatarText}
                        </div>
                        <div className="op-info-col">
                          <div className="op-name-row">
                            <span className="op-title-eng">{m.code}</span>
                            <span className="op-code-badge">{m.id || 'M-SYS'}</span>
                          </div>
                          <span className="op-marathi-text" style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                            {m.department || `${m.type} Section`}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="btn-delete-op"
                          onClick={() => onDeleteMachine(m.id || m.code)}
                          title="Delete machine"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="op-person-meta">
                        <span className="op-dept-chip">
                          <Layers size={11} />
                          {m.type}
                        </span>
                        <span className="op-shift-chip day" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                          ⚡ Operational
                        </span>
                      </div>

                      {m.aliases && m.aliases.length > 0 && (
                        <div className="op-aliases-list">
                          <Mic size={10} className="text-slate-400 shrink-0" />
                          <div className="op-alias-tags">
                            {m.aliases.map((al, idx) => (
                              <span key={idx} className="op-alias-tag">{al}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
