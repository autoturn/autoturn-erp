import React, { useState } from 'react';
import { X, Check, Shield, User, Key, ArrowRight, Lock } from 'lucide-react';
import { ERP_USERS } from '../data/initialData';

export function LoginModal({ isOpen, onClose, currentUser, onSelectUser }) {
  const [selectedId, setSelectedId] = useState(currentUser.id);
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const user = ERP_USERS.find(u => u.id === selectedId);
    if (!user) {
      setError('Please select a valid user.');
      return;
    }
    onSelectUser(user);
    onClose();
  };

  const handleQuickSwitch = (user) => {
    setSelectedId(user.id);
    onSelectUser(user);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card login-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Shield size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="modal-title">ERP User Authentication</h2>
              <p className="modal-subtitle">Switch profile or authenticate with employee ID</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLoginSubmit} className="modal-body">
          <div className="user-selection-section">
            <label className="section-label">Select Shopfloor Role / User ID:</label>
            <div className="user-cards-grid">
              {ERP_USERS.map(user => {
                const isSelected = selectedId === user.id;
                const isSayali = user.id === 'sayali.m';

                return (
                  <div 
                    key={user.id}
                    className={`user-select-card ${isSelected ? 'selected' : ''} ${isSayali ? 'featured-card' : ''}`}
                    onClick={() => setSelectedId(user.id)}
                  >
                    <div className="card-top">
                      <span className="user-card-avatar">{user.avatar}</span>
                      {isSelected && (
                        <span className="selected-indicator">
                          <Check size={14} />
                        </span>
                      )}
                      {isSayali && (
                        <span className="primary-pill">Primary Weighing User</span>
                      )}
                    </div>

                    <div className="user-card-details">
                      <div className="user-card-name">{user.name}</div>
                      <div className="user-card-id">ID: <code>{user.id}</code></div>
                      <div className="user-card-role">{user.role}</div>
                      <div className="user-card-dept">{user.department}</div>
                    </div>

                    <button 
                      type="button"
                      className="quick-switch-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickSwitch(user);
                      }}
                    >
                      Instant Login <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pin-auth-strip">
            <div className="input-group">
              <label className="field-label">
                <Lock size={14} /> Security PIN / Password (Default: <code>1234</code>)
              </label>
              <input 
                type="password"
                className="text-input"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength={8}
              />
            </div>

            {error && <p className="error-text">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Authenticate & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
