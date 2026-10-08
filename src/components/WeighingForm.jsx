import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Volume2,
  Zap,
  TrendingUp,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentShift, getTodayDateString, formatTime12h } from '../utils/storage.js';
import { matchOperatorFromSpeech } from '../utils/phoneticMatcher.js';
import { parseWeighingVoiceCommand } from '../utils/voiceParser.js';

// ── Voice Recognition Hook ─────────────────────────────────
function useVoiceRecognition({ onResult, language }) {
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsActive(false);
  }, []);

  const start = useCallback((lang) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;

    // Clean up any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || language || 'en-IN';
    recognition.maxAlternatives = 1;

    let finalAccumulated = '';

    recognition.onstart = () => {
      setIsActive(true);
    };

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';

      // Only process new results from resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalText += transcript + ' ';
          finalAccumulated += transcript + ' ';
        } else {
          interimText = transcript;
        }
      }

      // Show live interim text to user
      const displayText = (finalAccumulated + interimText).trim();
      if (displayText) {
        onResult(displayText, finalText.trim() ? 'final' : 'interim');
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        setIsActive(false);
        alert('Microphone permission denied. Please allow microphone access in your browser settings.');
      }
      // For 'no-speech', 'audio-capture', etc. — let onend handle restart
    };

    recognition.onend = () => {
      setIsActive(false);
      if (shouldListenRef.current) {
        // Auto-restart with a tiny delay to avoid rapid restart loops
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              finalAccumulated = ''; // Reset for new session
              recognitionRef.current.start();
            } catch (e) {
              console.warn('Auto-restart failed:', e);
            }
          }
        }, 150);
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    finalAccumulated = '';

    try {
      recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start:', e);
      return false;
    }
  }, [language, onResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  return { isActive, start, stop };
}

// ── Main Component ─────────────────────────────────────────
export function WeighingForm({
  currentUser,
  operatorMaster,
  machines,
  parts,
  records = [],
  onSaveRecord,
  onOpenOperatorMaster,
  onOpenMachineMaster
}) {
  // Form State
  const [date, setDate] = useState(getTodayDateString());
  const [shift, setShift] = useState(getCurrentShift());
  const [operatorName, setOperatorName] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [machineType, setMachineType] = useState('');
  const [aiNumber, setAiNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');

  // UI State
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  const [transcript, setTranscript] = useState('');
  const [detectedTokens, setDetectedTokens] = useState([]);
  const [lastPhoneticMatch, setLastPhoneticMatch] = useState(null);
  const [voiceNotification, setVoiceNotification] = useState('');
  const [isRecordSaved, setIsRecordSaved] = useState(false);
  const [savedRecordInfo, setSavedRecordInfo] = useState(null);

  const activeFieldRef = useRef('master');
  const processingTimeout = useRef(null);

  // ── Voice processing logic ─────────────────────────────
  const handleVoiceResult = useCallback((text, type) => {
    setTranscript(text);

    // Debounce: only process final results or after a short pause
    if (processingTimeout.current) clearTimeout(processingTimeout.current);

    const doProcess = () => {
      const field = activeFieldRef.current;
      if (field === 'master') {
        const parsed = parseWeighingVoiceCommand(text, { operatorMaster, machines, parts });
        setDetectedTokens(parsed.tokensFound);

        if (parsed.detected.date) setDate(parsed.detected.date);
        if (parsed.detected.shift) setShift(parsed.detected.shift);
        if (parsed.detected.operatorName) {
          setOperatorName(parsed.detected.operatorName);
          setOperatorId(parsed.detected.operatorId || '');
          const opToken = parsed.tokensFound.find(t => t.field === 'Operator');
          if (opToken) setLastPhoneticMatch(opToken);
        }
        if (parsed.detected.machineType) setMachineType(parsed.detected.machineType);
        if (parsed.detected.aiNumber) setAiNumber(parsed.detected.aiNumber);
        if (parsed.detected.quantity !== undefined) setQuantity(parsed.detected.quantity.toString());
        if (parsed.detected.weight !== undefined) setWeight(parsed.detected.weight.toString());

        if (parsed.tokensFound.length > 0) {
          setVoiceNotification(`✓ ${parsed.tokensFound.length} field${parsed.tokensFound.length > 1 ? 's' : ''} captured — Say "Save" or press ↵`);
        }

        if (parsed.isSaveCommand) {
          setTimeout(() => handleSubmit(), 600);
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
          setVoiceNotification(`✓ Operator: ${match.operator.name} (${match.confidence}%)`);
        }
      } else if (field === 'machine') {
        const parsed = parseWeighingVoiceCommand(
          text.toLowerCase().startsWith('machine') ? text : `machine ${text}`,
          { operatorMaster, machines, parts }
        );
        if (parsed.detected.machineType) {
          setMachineType(parsed.detected.machineType);
          setVoiceNotification(`✓ Machine: ${parsed.detected.machineType}`);
        }
      } else if (field === 'aiNumber') {
        const parsed = parseWeighingVoiceCommand(
          text.toLowerCase().includes('ai') ? text : `AI no ${text}`,
          { operatorMaster, machines, parts }
        );
        if (parsed.detected.aiNumber) {
          setAiNumber(parsed.detected.aiNumber);
          setVoiceNotification(`✓ Part: ${parsed.detected.aiNumber}`);
        } else {
          const numMatch = text.match(/([0-9]{2,6})/);
          if (numMatch) {
            setAiNumber(`AI-${numMatch[1]}`);
            setVoiceNotification(`✓ Part: AI-${numMatch[1]}`);
          }
        }
      } else if (field === 'quantity') {
        const parsed = parseWeighingVoiceCommand(
          text.toLowerCase().includes('found') || text.toLowerCase().includes('qty') ? text : `qty found ${text}`,
          { operatorMaster, machines, parts }
        );
        if (parsed.detected.quantity !== undefined) {
          setQuantity(parsed.detected.quantity.toString());
          setVoiceNotification(`✓ Quantity: ${parsed.detected.quantity} pcs`);
        } else {
          const qtyMatch = text.match(/([0-9]+(?:\.[0-9]+)?)/);
          if (qtyMatch) {
            setQuantity(qtyMatch[1]);
            setVoiceNotification(`✓ Quantity: ${qtyMatch[1]} pcs`);
          }
        }
      }
    };

    if (type === 'final') {
      doProcess();
    } else {
      // Small delay for interim results to avoid excessive re-renders
      processingTimeout.current = setTimeout(doProcess, 300);
    }
  }, [operatorMaster, machines, parts]);

  const { isActive: isListening, start: startVoice, stop: stopVoice } = useVoiceRecognition({
    onResult: handleVoiceResult,
    language: speechLanguage
  });

  const handleMicToggle = () => {
    if (isListening) {
      stopVoice();
      setTranscript('');
    } else {
      activeFieldRef.current = 'master';
      const ok = startVoice(speechLanguage);
      if (!ok) {
        alert('Speech Recognition is not available. Please use Chrome on HTTPS or localhost.');
      }
    }
  };

  const handleFieldMic = (field) => {
    activeFieldRef.current = field;
    if (!isListening) {
      startVoice(speechLanguage);
    }
  };

  // ── Derived calculations ────────────────────────────────
  const aiNumberTotal = useMemo(() => {
    if (!aiNumber || !records) return 0;
    const standardAi = aiNumber.toUpperCase().startsWith('AI-')
      ? aiNumber.toUpperCase()
      : `AI-${aiNumber}`;
    return records
      .filter(r => r.date === date && r.aiNumber === standardAi)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [aiNumber, records, date]);

  const selectedOperatorObj = useMemo(() =>
    operatorMaster.find(op =>
      op.name.toLowerCase() === operatorName.toLowerCase() ||
      op.shortName?.toLowerCase() === operatorName.toLowerCase()
    ), [operatorMaster, operatorName]
  );

  // Global Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Submission ─────────────────────────────────────────
  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (!operatorName?.trim()) { alert('Please enter Operator Name'); return; }
    if (!machineType?.trim()) { alert('Please enter Machine Type'); return; }
    if (!aiNumber?.trim()) { alert('Please enter AI Number (Part Number)'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { alert('Please enter a valid Quantity'); return; }

    const qtyNum = parseFloat(quantity);
    const weightNum = weight ? parseFloat(weight) : null;
    const normalizedAI = aiNumber.toUpperCase().startsWith('AI-')
      ? aiNumber.toUpperCase()
      : `AI-${aiNumber}`;

    const newRecord = {
      id: `REC-${Date.now().toString().slice(-6)}`,
      date,
      shift,
      operatorId: operatorId || 'OP-CUSTOM',
      operatorName,
      machineType,
      aiNumber: normalizedAI,
      quantity: qtyNum,
      weight: weightNum,
      unit: 'pcs',
      entryBy: currentUser?.name || 'Sayali Madam',
      timestamp: formatTime12h(),
      method: detectedTokens.length > 0 ? 'Voice Entry' : 'Manual Entry',
      status: 'Verified'
    };

    onSaveRecord(newRecord);

    // Confetti celebration
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#4f46e5', '#10b981', '#f59e0b', '#6366f1']
    });

    // Save feedback
    setIsRecordSaved(true);
    setSavedRecordInfo({
      ai: newRecord.aiNumber,
      qty: newRecord.quantity,
      weight: newRecord.weight,
      operator: newRecord.operatorName,
    });

    // Reset for next entry — keep date, shift, operator, machine
    setAiNumber('');
    setQuantity('');
    setWeight('');
    setTranscript('');
    setDetectedTokens([]);
    setLastPhoneticMatch(null);
    setVoiceNotification('');

    setTimeout(() => {
      setIsRecordSaved(false);
      setSavedRecordInfo(null);
    }, 3500);
  };

  const handleReset = () => {
    setAiNumber('');
    setQuantity('');
    setWeight('');
    setMachineType('');
    setOperatorName('');
    setOperatorId('');
    setTranscript('');
    setDetectedTokens([]);
    setVoiceNotification('');
    setLastPhoneticMatch(null);
    setIsRecordSaved(false);
    setSavedRecordInfo(null);
  };

  const operatorInitials = operatorName.trim()
    ? operatorName.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : null;

  return (
    <div className="weighing-fields-form-wrap">

      {/* ── Save Success Toast ──────────────────── */}
      {isRecordSaved && savedRecordInfo && (
        <div className="record-toast-banner">
          <CheckCircle2 size={16} />
          <span>
            <strong>{savedRecordInfo.ai}</strong> · {savedRecordInfo.qty.toLocaleString()} pcs
            {savedRecordInfo.weight && ` · ${savedRecordInfo.weight} Kg`}
            &nbsp;for <strong>{savedRecordInfo.operator}</strong> — Saved!
          </span>
        </div>
      )}

      {/* ── Voice Assistant Card ─────────────────── */}
      <div className={`voice-assistant-card ${isListening ? 'listening' : ''}`}>

        {/* Header Row */}
        <div className="voice-card-header">
          <div className="voice-header-left">
            <div className={`voice-status-badge ${isListening ? 'active' : ''}`}>
              <span className="voice-dot" />
              {isListening ? 'Listening…' : 'Voice Ready'}
            </div>
          </div>
          <div className="voice-lang-tabs">
            {['en-IN', 'mr-IN', 'hi-IN'].map(lang => (
              <button
                key={lang}
                type="button"
                className={`lang-tab-btn ${speechLanguage === lang ? 'active' : ''}`}
                onClick={() => setSpeechLanguage(lang)}
              >
                {lang === 'en-IN' ? 'ENG' : lang === 'mr-IN' ? 'मराठी' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        {/* Mic Button + Text */}
        <div className="voice-mic-zone">
          <button
            type="button"
            className={`big-voice-mic-btn ${isListening ? 'recording' : ''}`}
            onClick={handleMicToggle}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            {isListening && <span className="mic-ring-1" />}
            {isListening && <span className="mic-ring-2" />}
          </button>

          <div className="mic-text-column">
            <div className={`mic-status-line ${isListening ? 'listening' : ''}`}>
              {isListening ? (
                <>
                  <span className="rec-blink" />
                  Continuous Mic Active
                </>
              ) : (
                'Tap mic to start voice entry'
              )}
            </div>
            <div className="mic-hint-line">
              {isListening
                ? 'Say: "Machine VMC, AI no 1042, qty found 500, Operator Tukaram"'
                : <><em>"Machine VMC, AI no 1042, qty 500, Operator Ravi, weight 12 kg"</em></>
              }
            </div>
          </div>
        </div>

        {/* Live Transcript Feed */}
        {(transcript || voiceNotification || lastPhoneticMatch || detectedTokens.length > 0) && (
          <div className="voice-transcript-feed">
            {transcript && (
              <div className="transcript-heard-row">
                <span className="transcript-heard-label">
                  <Volume2 size={10} /> Heard
                </span>
                <span className="transcript-text">"{transcript}"</span>
              </div>
            )}

            {lastPhoneticMatch && (
              <div className="phonetic-match-strip">
                🎯 {lastPhoneticMatch.value} — {lastPhoneticMatch.confidence}% match
              </div>
            )}

            {detectedTokens.length > 0 && (
              <div className="detected-chips-row">
                <span className="detected-label">Captured:</span>
                {detectedTokens.map((t, i) => (
                  <span
                    key={i}
                    className={`detected-chip ${t.field === 'Weight' ? 'chip-weight' : ''}`}
                  >
                    {t.field}: {t.value}
                  </span>
                ))}
              </div>
            )}

            {voiceNotification && (
              <div className="voice-feedback-strip">
                <Zap size={12} />
                {voiceNotification}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Weighing Form ────────────────────────── */}
      <form onSubmit={handleSubmit} className="weighing-fields-form">
        <div className="fields-grid">

          {/* 1. Date */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Calendar size={13} />
                Date
              </label>
              <span className="field-badge auto">Auto</span>
            </div>
            <input
              type="date"
              className="field-input-control"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          {/* 2. Shift */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Clock size={13} />
                Shift
              </label>
              <span className="field-badge auto">Auto</span>
            </div>
            <div className="shift-buttons-grid">
              <button
                type="button"
                className={`shift-card-btn ${shift.includes('Day') ? 'active-day' : ''}`}
                onClick={() => setShift('Day Shift (7:00 AM - 7:00 PM)')}
              >
                <span className="shift-card-title">☀️ Day</span>
                <span className="shift-card-subtitle">7AM–7PM</span>
              </button>
              <button
                type="button"
                className={`shift-card-btn ${shift.includes('Night') ? 'active-night' : ''}`}
                onClick={() => setShift('Night Shift (7:00 PM - 7:00 AM)')}
              >
                <span className="shift-card-title">🌙 Night</span>
                <span className="shift-card-subtitle">7PM–7AM</span>
              </button>
            </div>
          </div>

          {/* 3. Operator (full width) */}
          <div className="field-card field-col-full">
            <div className="field-card-header">
              <label className="field-card-label">
                <User size={13} />
                Operator Name
              </label>
              <div className="field-header-actions">
                <button
                  type="button"
                  className="link-master-btn"
                  onClick={onOpenOperatorMaster}
                >
                  <Plus size={10} /> Master List
                </button>
                <button
                  type="button"
                  className={`mic-circle-btn ${activeFieldRef.current === 'operator' && isListening ? 'active' : ''}`}
                  onClick={() => handleFieldMic('operator')}
                  title="Speak Operator Name"
                >
                  <Mic size={11} />
                </button>
              </div>
            </div>
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
                  op.shortName?.toLowerCase() === val.toLowerCase()
                );
                setOperatorId(matched ? matched.id : '');
              }}
              placeholder="Type name or select from list…"
              required
              autoComplete="off"
            />
            <datalist id="operator-options">
              {operatorMaster.map(op => (
                <option key={op.id} value={op.name}>
                  {op.name} ({op.marathiName || op.shortName})
                </option>
              ))}
            </datalist>

            {selectedOperatorObj && (
              <div className="selected-op-badge">
                <div className="op-avatar-circle">{operatorInitials}</div>
                <div className="op-info-col">
                  <span className="op-display-name">
                    {selectedOperatorObj.marathiName || selectedOperatorObj.name}
                  </span>
                  <span className="op-meta-line">
                    {selectedOperatorObj.id} · {selectedOperatorObj.department}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Machine Type */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Cpu size={13} />
                Machine
              </label>
              <div className="field-header-actions">
                <button
                  type="button"
                  className="link-master-btn"
                  onClick={onOpenMachineMaster}
                >
                  <Plus size={10} /> List
                </button>
                <button
                  type="button"
                  className={`mic-circle-btn ${activeFieldRef.current === 'machine' && isListening ? 'active' : ''}`}
                  onClick={() => handleFieldMic('machine')}
                  title="Speak Machine"
                >
                  <Mic size={11} />
                </button>
              </div>
            </div>
            <input
              type="text"
              list="machine-options"
              className="field-input-control"
              value={machineType}
              onChange={e => setMachineType(e.target.value)}
              placeholder="Select machine…"
              required
              autoComplete="off"
            />
            <datalist id="machine-options">
              {machines.map(m => (
                <option key={m.id} value={m.code}>
                  {m.code} – {m.type}
                </option>
              ))}
            </datalist>
          </div>

          {/* 5. AI Number */}
          <div className="field-card">
            <div className="field-card-header">
              <label className="field-card-label">
                <Hash size={13} />
                AI Number
              </label>
              <button
                type="button"
                className={`mic-circle-btn ${activeFieldRef.current === 'aiNumber' && isListening ? 'active' : ''}`}
                onClick={() => handleFieldMic('aiNumber')}
                title="Speak AI Number"
              >
                <Mic size={11} />
              </button>
            </div>
            <input
              type="text"
              className="field-input-control mono"
              style={{ fontWeight: 800, letterSpacing: '0.02em' }}
              value={aiNumber}
              onChange={e => setAiNumber(e.target.value.toUpperCase())}
              placeholder="AI-1042"
              required
              autoComplete="off"
            />
            {aiNumber.length > 2 && (
              <div className="ai-number-total-tag">
                <TrendingUp size={11} />
                Today total:
                <span className="ai-total-num">{aiNumberTotal.toLocaleString()}</span>
                pcs
              </div>
            )}
          </div>

          {/* 6. Quantity (full width) */}
          <div className="field-card field-col-full">
            <div className="field-card-header">
              <label className="field-card-label">
                <Scale size={13} />
                Counted Quantity
              </label>
              <button
                type="button"
                className={`mic-circle-btn ${activeFieldRef.current === 'quantity' && isListening ? 'active' : ''}`}
                onClick={() => handleFieldMic('quantity')}
                title="Say: qty found 500"
              >
                <Mic size={11} />
              </button>
            </div>
            <div className="qty-direct-row">
              <input
                type="number"
                step="1"
                min="1"
                className="field-input-control qty-main-input"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="e.g. 500"
                required
              />
              <div className="qty-unit-badge">PCS</div>
            </div>
          </div>

          {/* 7. Weight (optional) */}
          <div className="field-card field-col-full">
            <div className="field-card-header">
              <label className="field-card-label">
                <Scale size={13} style={{ color: '#059669' }} />
                Weight (Kg)
              </label>
              <span className="field-badge" style={{ background: '#ecfdf5', color: '#059669' }}>Optional</span>
            </div>
            <div className="qty-direct-row">
              <input
                type="number"
                step="0.01"
                min="0"
                className="field-input-control qty-main-input"
                style={{ color: '#059669' }}
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 15.5"
              />
              <div className="qty-unit-badge" style={{ borderColor: '#a7f3d0', background: '#ecfdf5', color: '#065f46' }}>KG</div>
            </div>
          </div>

        </div>

        {/* Submit Actions */}
        <div className="form-submit-actions">
          <button
            type="button"
            className="btn-clear-form"
            onClick={handleReset}
          >
            <RotateCcw size={14} />
            Clear
          </button>

          <button
            type="submit"
            className="btn-save-record"
          >
            <CheckCircle2 size={18} />
            Save Record (Enter ↵)
          </button>
        </div>
      </form>
    </div>
  );
}
