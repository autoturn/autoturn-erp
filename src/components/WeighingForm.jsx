import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Calendar, 
  Clock, 
  User, 
  Cpu, 
  Hash, 
  Scale, 
  CheckCircle2, 
  RotateCcw, 
  Layers,
  Volume2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentShift, getTodayDateString, formatTime12h } from '../utils/storage.js';
import { matchOperatorFromSpeech } from '../utils/phoneticMatcher.js';
import { parseWeighingVoiceCommand, playChime } from '../utils/voiceParser.js';

export function WeighingForm({
  currentUser,
  operatorMaster,
  machines,
  parts,
  onSaveRecord,
  onOpenOperatorMaster
}) {
  // Form State (All clean, no hardcoded sample values)
  const [date, setDate] = useState(getTodayDateString());
  const [shift, setShift] = useState(getCurrentShift());
  const [operatorName, setOperatorName] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [machineType, setMachineType] = useState('');
  const [aiNumber, setAiNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit] = useState('pcs');

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [activeFieldMic, setActiveFieldMic] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  const [detectedTokens, setDetectedTokens] = useState([]);
  const [lastPhoneticMatch, setLastPhoneticMatch] = useState(null);
  const [voiceNotification, setVoiceNotification] = useState('');

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // Global Enter key press to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Web Speech API Initialization with CONTINUOUS listening & auto-reconnect
  const startSpeechRecognition = (field = 'master') => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not available in this browser. Please use Google Chrome or Safari on HTTPS or localhost.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;       // Keep listening continuously!
      recognition.interimResults = true;  // Fast real-time interim recognition
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setActiveFieldMic(field);
        setTranscript('');
        setVoiceNotification('Listening continuously (Silent mode)... Speak machine, AI no, qty found, operator');
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim().length > 0) {
          setTranscript(currentTranscript);
          processVoiceInput(currentTranscript, field);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          isListeningRef.current = false;
          setIsListening(false);
          setActiveFieldMic(null);
          setVoiceNotification('Microphone permission blocked. Please allow mic in browser settings.');
        }
      };

      recognition.onend = () => {
        // Automatically restart if user hasn't explicitly clicked to stop
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // Already active
          }
        } else {
          setIsListening(false);
          setActiveFieldMic(null);
        }
      };

      recognitionRef.current = recognition;
      isListeningRef.current = true;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setActiveFieldMic(null);
    }
  };

  const stopSpeechRecognition = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setActiveFieldMic(null);
  };

  // Process voice input
  const processVoiceInput = (text, field = 'master') => {
    if (!text || text.trim().length === 0) return;

    if (field === 'master') {
      const parsed = parseWeighingVoiceCommand(text, {
        operatorMaster,
        machines,
        parts
      });

      setDetectedTokens(parsed.tokensFound);

      if (parsed.detected.date) {
        setDate(parsed.detected.date);
      }
      if (parsed.detected.shift) {
        setShift(parsed.detected.shift);
      }
      if (parsed.detected.operatorName) {
        setOperatorName(parsed.detected.operatorName);
        setOperatorId(parsed.detected.operatorId || '');
        const opToken = parsed.tokensFound.find(t => t.field === 'Operator');
        if (opToken) {
          setLastPhoneticMatch(opToken);
        }
      }
      if (parsed.detected.machineType) {
        setMachineType(parsed.detected.machineType);
      }
      if (parsed.detected.aiNumber) {
        setAiNumber(parsed.detected.aiNumber);
      }
      if (parsed.detected.quantity !== undefined) {
        setQuantity(parsed.detected.quantity.toString());
      }

      if (parsed.tokensFound.length > 0) {
        setVoiceNotification(`Captured ${parsed.tokensFound.length} field(s)! Say 'Save' or press Enter ↵`);
      }

      if (parsed.isSaveCommand) {
        setTimeout(() => {
          handleSubmit();
        }, 500);
      }
    } else if (field === 'operator') {
      const match = matchOperatorFromSpeech(text, operatorMaster);
      if (match) {
        setOperatorName(match.operator.name);
        setOperatorId(match.operator.id);
        setLastPhoneticMatch({
          field: 'Operator',
          value: match.operator.name,
          confidence: match.confidence,
          reason: match.reason
        });
        setVoiceNotification(`Matched: ${match.operator.name} (${match.confidence}%)`);
      }
    } else if (field === 'machine') {
      const parsed = parseWeighingVoiceCommand(text.toLowerCase().startsWith('machine') ? text : `machine ${text}`, { operatorMaster, machines, parts });
      if (parsed.detected.machineType) {
        setMachineType(parsed.detected.machineType);
        setVoiceNotification(`Machine: ${parsed.detected.machineType}`);
      }
    } else if (field === 'aiNumber') {
      const parsed = parseWeighingVoiceCommand(text.toLowerCase().includes('ai') ? text : `AI no ${text}`, { operatorMaster, machines, parts });
      if (parsed.detected.aiNumber) {
        setAiNumber(parsed.detected.aiNumber);
        setVoiceNotification(`Part: ${parsed.detected.aiNumber}`);
      } else {
        const numMatch = text.match(/([0-9]{2,6})/);
        if (numMatch) {
          setAiNumber(`AI-${numMatch[1]}`);
          setVoiceNotification(`Part: AI-${numMatch[1]}`);
        }
      }
    } else if (field === 'quantity') {
      const parsed = parseWeighingVoiceCommand(text.toLowerCase().includes('found') || text.toLowerCase().includes('qty') ? text : `qty found ${text}`, { operatorMaster, machines, parts });
      if (parsed.detected.quantity !== undefined) {
        setQuantity(parsed.detected.quantity.toString());
        setVoiceNotification(`Quantity: ${parsed.detected.quantity} pcs`);
      } else {
        const qtyMatch = text.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (qtyMatch) {
          setQuantity(qtyMatch[1]);
          setVoiceNotification(`Quantity: ${qtyMatch[1]} pcs`);
        }
      }
    }
  };

  // Form submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (!operatorName || operatorName.trim().length === 0) {
      alert('Please enter or select Operator Name');
      return;
    }
    if (!machineType || machineType.trim().length === 0) {
      alert('Please select or enter Machine Type');
      return;
    }
    if (!aiNumber || aiNumber.trim().length === 0) {
      alert('Please enter AI Number (Part Number)');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Please enter quantity (e.g. 500)');
      return;
    }

    const qtyNum = parseFloat(quantity);

    const newRecord = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      date,
      shift,
      operatorId: operatorId || 'OP-CUSTOM',
      operatorName,
      machineType,
      aiNumber: aiNumber.toUpperCase().startsWith('AI-') ? aiNumber.toUpperCase() : `AI-${aiNumber}`,
      quantity: qtyNum,
      unit: 'pcs',
      entryBy: currentUser.name || 'Sayali Madam',
      timestamp: formatTime12h(),
      method: detectedTokens.length > 0 ? 'Voice Entry' : 'Manual Entry',
      status: 'Verified'
    };

    onSaveRecord(newRecord);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#10b981', '#f59e0b']
    });

    // Automatically clear all entry fields for the next weighing
    setOperatorName('');
    setOperatorId('');
    setMachineType('');
    setAiNumber('');
    setQuantity('');
    setTranscript('');
    setDetectedTokens([]);
    setLastPhoneticMatch(null);
    setVoiceNotification(`✅ Saved: ${newRecord.aiNumber} (${newRecord.quantity} pcs) for ${newRecord.operatorName}. Form cleared!`);
  };

  const handleReset = () => {
    setQuantity('');
    setAiNumber('');
    setMachineType('');
    setOperatorName('');
    setTranscript('');
    setDetectedTokens([]);
    setVoiceNotification('');
    setLastPhoneticMatch(null);
  };

  const selectedOperatorObj = operatorMaster.find(op => 
    op.name.toLowerCase() === operatorName.toLowerCase() || 
    op.shortName.toLowerCase() === operatorName.toLowerCase()
  );

  return (
    <div className="weighing-fields-form-wrap">
      {/* Voice Assistant Section (Continuous, Compact) */}
      <div className={`voice-assistant-card ${isListening ? 'listening' : ''}`}>
        <div className="voice-card-header">
          <div className="voice-header-title">
            <span className="voice-pulse-indicator" />
            <span className="voice-title-text">Voice Assistant (Continuous Listening)</span>
          </div>

          <div className="voice-lang-tabs">
            <span className="lang-tab-label">Lang:</span>
            <button 
              type="button" 
              className={`lang-tab-btn ${speechLanguage === 'en-IN' ? 'active' : ''}`}
              onClick={() => setSpeechLanguage('en-IN')}
            >
              English
            </button>
            <button 
              type="button" 
              className={`lang-tab-btn ${speechLanguage === 'mr-IN' ? 'active' : ''}`}
              onClick={() => setSpeechLanguage('mr-IN')}
            >
              मराठी
            </button>
            <button 
              type="button" 
              className={`lang-tab-btn ${speechLanguage === 'hi-IN' ? 'active' : ''}`}
              onClick={() => setSpeechLanguage('hi-IN')}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Center Mic Action Button */}
        <div className="voice-action-center">
          <div className="mic-interactive-group">
            <button
              type="button"
              className={`big-voice-mic-btn ${isListening ? 'recording' : ''}`}
              onClick={isListening ? stopSpeechRecognition : () => startSpeechRecognition('master')}
              title={isListening ? 'Click to Stop Listening' : 'Click to Turn On Continuous Voice Assistant'}
            >
              {isListening ? <MicOff size={26} /> : <Mic size={26} />}
              {isListening && <span className="mic-wave-1" />}
              {isListening && <span className="mic-wave-2" />}
            </button>

            <div className="mic-hint-text">
              {isListening ? (
                <span className="recording-status">
                  <span className="pulse-red-dot" /> Continuous mic active (Silent mode)... Speak machine, AI no, qty found, operator
                </span>
              ) : (
                <span className="idle-status">
                  Tap mic to start: <em>"Machine VMC, AI no 1042, qty found 500, Operator Tukaram"</em>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Transcript & Feedback */}
        {(transcript || voiceNotification || lastPhoneticMatch || detectedTokens.length > 0) && (
          <div className="voice-feedback-panel">
            {transcript && (
              <div className="live-transcript-row">
                <span className="transcript-tag">
                  <Volume2 size={12} /> Heard:
                </span>
                <p className="transcript-quote">"{transcript}"</p>
              </div>
            )}

            {lastPhoneticMatch && (
              <div className="phonetic-match-row">
                <span className="match-tag">🎯 Phonetic Match:</span>
                <span className="match-detail">
                  {lastPhoneticMatch.value} ({lastPhoneticMatch.confidence}%)
                </span>
              </div>
            )}

            {detectedTokens.length > 0 && (
              <div className="detected-fields-row">
                <span className="detected-label">Detected:</span>
                <div className="detected-chips">
                  {detectedTokens.map((t, idx) => (
                    <span key={idx} className="detected-chip">
                      <strong>{t.field}:</strong> {t.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {voiceNotification && (
              <div className="voice-message-strip">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>{voiceNotification}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Weighing Entry Form */}
      <form onSubmit={handleSubmit} className="weighing-fields-form">
        <div className="fields-grid">
          {/* Field 1: Date */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Calendar size={14} className="text-indigo-600" />
                <span>1. Entry Date</span>
              </label>
              <span className="field-badge-subtle">Auto Today</span>
            </div>
            <input 
              type="date" 
              className="field-input-control"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* Field 2: Shift Selection */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Clock size={14} className="text-indigo-600" />
                <span>2. Shift Selection</span>
              </label>
              <span className="field-badge-subtle">Auto Shift</span>
            </div>

            <div className="shift-buttons-grid">
              <button
                type="button"
                className={`shift-card-btn ${shift.includes('Day') ? 'active-day' : ''}`}
                onClick={() => setShift('Day Shift (7:00 AM - 7:00 PM)')}
              >
                <span className="shift-card-title">☀️ Day Shift</span>
                <span className="shift-card-subtitle">07:00 AM - 07:00 PM</span>
              </button>
              <button
                type="button"
                className={`shift-card-btn ${shift.includes('Night') ? 'active-night' : ''}`}
                onClick={() => setShift('Night Shift (7:00 PM - 7:00 AM)')}
              >
                <span className="shift-card-title">🌙 Night Shift</span>
                <span className="shift-card-subtitle">07:00 PM - 07:00 AM</span>
              </button>
            </div>
          </div>

          {/* Field 3: Operator Name (Type freely OR select from dropdown) */}
          <div className="field-card field-col-full">
            <div className="field-card-header">
              <label className="field-card-label">
                <User size={14} className="text-indigo-600" />
                <span>3. Operator Name (Type or Select)</span>
              </label>
              <div className="field-header-actions">
                <button 
                  type="button" 
                  className="link-btn-text"
                  onClick={onOpenOperatorMaster}
                >
                  + Master List
                </button>
                <button
                  type="button"
                  className={`mic-circle-btn ${activeFieldMic === 'operator' ? 'active' : ''}`}
                  onClick={() => startSpeechRecognition('operator')}
                  title="Speak Operator Name"
                >
                  <Mic size={12} />
                </button>
              </div>
            </div>

            {/* Combobox: User can write custom name OR select from dropdown */}
            <input
              type="text"
              list="operator-options"
              className="field-input-control"
              value={operatorName}
              onChange={(e) => {
                const val = e.target.value;
                setOperatorName(val);
                const matched = operatorMaster.find(op => 
                  op.name.toLowerCase() === val.toLowerCase() ||
                  op.shortName.toLowerCase() === val.toLowerCase()
                );
                if (matched) {
                  setOperatorId(matched.id);
                } else {
                  setOperatorId('');
                }
              }}
              placeholder="Type name or select from list..."
              required
            />
            <datalist id="operator-options">
              {operatorMaster.map(op => (
                <option key={op.id} value={op.name}>
                  {op.name} ({op.marathiName || op.shortName}) — {op.department}
                </option>
              ))}
            </datalist>

            {selectedOperatorObj && (
              <div className="selected-op-badge">
                <span className="op-emoji">👷</span>
                <div className="op-meta">
                  <span className="op-marathi-title">{selectedOperatorObj.marathiName}</span>
                  <span className="op-sub-info">ID: {selectedOperatorObj.id} • Dept: {selectedOperatorObj.department}</span>
                </div>
              </div>
            )}
          </div>

          {/* Field 4: Machine Type (Clean select, no sample buttons) */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Cpu size={14} className="text-indigo-600" />
                <span>4. Machine Type / Code</span>
              </label>
              <button
                type="button"
                className={`mic-circle-btn ${activeFieldMic === 'machine' ? 'active' : ''}`}
                onClick={() => startSpeechRecognition('machine')}
                title="Speak Machine Name"
              >
                <Mic size={12} />
              </button>
            </div>

            <input
              type="text"
              list="machine-options"
              className="field-input-control"
              value={machineType}
              onChange={e => setMachineType(e.target.value)}
              placeholder="Select or enter machine..."
              required
            />
            <datalist id="machine-options">
              {machines.map(m => (
                <option key={m.id} value={m.code}>
                  {m.code} ({m.type})
                </option>
              ))}
            </datalist>
          </div>

          {/* Field 5: AI Number (Clean input, no sample buttons) */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Hash size={14} className="text-indigo-600" />
                <span>5. AI Number (Part Number)</span>
              </label>
              <button
                type="button"
                className={`mic-circle-btn ${activeFieldMic === 'aiNumber' ? 'active' : ''}`}
                onClick={() => startSpeechRecognition('aiNumber')}
                title="Speak AI Number"
              >
                <Mic size={12} />
              </button>
            </div>

            <input 
              type="text"
              className="field-input-control mono-font font-bold"
              value={aiNumber}
              onChange={e => setAiNumber(e.target.value.toUpperCase())}
              placeholder="Enter part / AI number..."
              required
            />
          </div>

          {/* Field 6: Production Quantity (Pieces) */}
          <div className="field-card field-col-full">
            <div className="field-card-header">
              <label className="field-card-label">
                <Scale size={14} className="text-indigo-600" />
                <span>6. Counted Quantity (Pieces / Pcs)</span>
              </label>
              <button
                type="button"
                className={`mic-circle-btn ${activeFieldMic === 'quantity' ? 'active' : ''}`}
                onClick={() => startSpeechRecognition('quantity')}
                title="Speak Quantity (e.g. qty found 500)"
              >
                <Mic size={12} />
              </button>
            </div>

            <div className="qty-direct-row">
              <input 
                type="number"
                step="1"
                min="1"
                className="field-input-control qty-main-input mono-font"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Enter piece count (e.g. 500)"
                required
              />
              <div className="qty-unit-badge">
                <span>Pieces (pcs)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit & Reset Actions */}
        <div className="form-submit-actions">
          <button 
            type="button" 
            className="btn-clear-form"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            <span>Clear</span>
          </button>

          <button 
            type="submit" 
            className="btn-save-record"
          >
            <CheckCircle2 size={18} />
            <span>Save Record & Next (Enter ↵)</span>
          </button>
        </div>
      </form>
    </div>
  );
}
