import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Wifi, Globe, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function MobileAccessModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  
  // Local network IP address
  const networkUrl = 'http://192.168.2.126:5173/';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(networkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card mobile-qr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Smartphone size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="modal-title">Open on Mobile or Tablet</h2>
              <p className="modal-subtitle">Connect phone or weighing tablet on the same Wi-Fi</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body qr-modal-body">
          {/* QR Code Container */}
          <div className="qr-container-card">
            <div className="qr-box">
              <QRCodeSVG 
                value={networkUrl} 
                size={180}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="qr-hint">Scan with your phone camera to open instantly</p>
          </div>

          {/* Network URL Strip */}
          <div className="network-url-card">
            <div className="url-label-row">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Wifi size={13} className="text-emerald-500" /> Wi-Fi Network URL:
              </span>
              <span className="live-status-pill">● Active</span>
            </div>

            <div className="url-copy-row">
              <code className="network-code mono-font">{networkUrl}</code>
              <button 
                type="button" 
                className="btn-copy-url"
                onClick={handleCopy}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Setup tips */}
          <div className="mobile-tips-box">
            <h4 className="tips-title">💡 How to access on mobile:</h4>
            <ol className="tips-list">
              <li>Connect your mobile phone to the <strong>same Wi-Fi network</strong> as your PC.</li>
              <li>Scan the QR code above or type <code>http://192.168.2.126:5173/</code> in Chrome / Safari.</li>
              <li>Tap the browser menu <strong>(⋮ or Share)</strong> and select <strong>"Add to Home Screen"</strong> to use it as a full-screen mobile app!</li>
            </ol>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
