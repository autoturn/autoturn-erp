import { matchOperatorFromSpeech } from './phoneticMatcher.js';

// Sound feedback disabled as per user requirement (silent continuous voice operation)
export function playChime() {
  // Completely silent - no audio beeps or chimes
}

// Convert spoken English/Hindi/Marathi number phrases to actual numbers
export function parseSpokenNumbers(text) {
  if (!text) return '';
  let lower = text.toLowerCase();

  // English compound & spoken numbers
  const englishPhrases = [
    { regex: /\bone thousand\b/gi, val: 1000 },
    { regex: /\bnine hundred\b/gi, val: 900 },
    { regex: /\beight hundred\b/gi, val: 800 },
    { regex: /\bseven hundred\b/gi, val: 700 },
    { regex: /\bsix hundred\b/gi, val: 600 },
    { regex: /\bfive hundred fifty\b/gi, val: 550 },
    { regex: /\bfive hundred twenty\b/gi, val: 520 },
    { regex: /\bfive hundred\b/gi, val: 500 },
    { regex: /\bfour hundred eighty\b/gi, val: 480 },
    { regex: /\bfour hundred fifty\b/gi, val: 450 },
    { regex: /\bfour hundred\b/gi, val: 400 },
    { regex: /\bthree hundred fifty\b/gi, val: 350 },
    { regex: /\bthree hundred\b/gi, val: 300 },
    { regex: /\btwo hundred fifty\b/gi, val: 250 },
    { regex: /\btwo hundred\b/gi, val: 200 },
    { regex: /\bone hundred fifty\b/gi, val: 150 },
    { regex: /\bone hundred twenty\b/gi, val: 120 },
    { regex: /\bone hundred\b/gi, val: 100 },
    { regex: /\bninety\b/gi, val: 90 },
    { regex: /\beighty\b/gi, val: 80 },
    { regex: /\bseventy\b/gi, val: 70 },
    { regex: /\bsixty\b/gi, val: 60 },
    { regex: /\bfifty\b/gi, val: 50 },
    { regex: /\bforty\b/gi, val: 40 },
    { regex: /\bthirty\b/gi, val: 30 },
    { regex: /\btwenty\b/gi, val: 20 }
  ];

  for (const { regex, val } of englishPhrases) {
    lower = lower.replace(regex, ` ${val} `);
  }

  // Hindi & Marathi spoken numbers
  const indianWordMap = {
    'panchse': 500, 'paanch sau': 500, 'panch sau': 500, 'panchsau': 500,
    'dhai sau': 250, 'dhaisau': 250, 'dedh sau': 150,
    'don she': 200, 'do sau': 200, 'dosau': 200,
    'teen she': 300, 'teen sau': 300,
    'char she': 400, 'char sau': 400,
    'saha she': 600, 'chhah sau': 600,
    'saat she': 700, 'saat sau': 700,
    'shambhar': 100, 'sau': 100, 'she': 100,
    'hazaar': 1000, 'hazar': 1000,
    'pachas': 50, 'pannaas': 50,
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'panch': 5,
    'saha': 6, 'chhah': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'daha': 10, 'das': 10
  };

  for (const [word, val] of Object.entries(indianWordMap)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(lower)) {
      lower = lower.replace(regex, ` ${val} `);
    }
  }

  return lower;
}

// Parse spoken dates (e.g. "today", "aaj", "5 October", "05-10-2026")
function parseSpokenDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  if (/\b(today|aaj|current date|aajchi tarikh)\b/i.test(lower)) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (/\b(yesterday|kal)\b/i.test(lower)) {
    const yest = new Date(now.getTime() - 86400000);
    const y = yest.getFullYear();
    const m = String(yest.getMonth() + 1).padStart(2, '0');
    const d = String(yest.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Look for day and month (e.g. "5 October", "5th Oct", "10-05-2026")
  const dateMatch = lower.match(/\b([0-9]{1,2})(?:st|nd|rd|th)?[\s\-_/]+(october|oct|november|nov|december|dec|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep)\b/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthPrefix = dateMatch[2].slice(0, 3).toLowerCase();
    const monthIdx = months.indexOf(monthPrefix);
    if (monthIdx !== -1 && day >= 1 && day <= 31) {
      const y = now.getFullYear();
      const m = String(monthIdx + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // ISO style date match
  const isoMatch = lower.match(/\b(20[2-3][0-9])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Intelligent Voice Command Parser for Sayali Madam's Weighing Desk
 * Recognizes natural shopfloor dictations:
 * - Machine: Madam says "machine [type/code/name]" or machine name directly
 * - Part Number: Madam says "AI no [number]" or "AI number [number]"
 * - Weighted Quantity: Madam says "qty found [number]" or "quantity found [number]"
 * - Shift: "Day shift" / "Night shift"
 * - Operator: Marathi phonetic matching for shopfloor operators
 */
export function parseWeighingVoiceCommand(transcript, { operatorMaster, machines, parts }) {
  if (!transcript) return {};

  const cleanText = transcript.trim();
  const normalizedText = parseSpokenNumbers(cleanText);
  const detected = {};
  const tokensFound = [];

  // workingText will have recognized non-numeric phrases masked to prevent number leakage
  let workingText = ` ${normalizedText} `;

  // 1. Detect Date
  const parsedDate = parseSpokenDate(normalizedText);
  if (parsedDate) {
    detected.date = parsedDate;
    tokensFound.push({ field: 'Date', value: parsedDate });
    // Mask date terms
    workingText = workingText.replace(/\b(today|aaj|current date|aajchi tarikh|yesterday|kal)\b/gi, ' ');
    workingText = workingText.replace(/\b(20[2-3][0-9])[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12][0-9]|3[01])\b/g, ' ');
    workingText = workingText.replace(/\b[0-9]{1,2}(?:st|nd|rd|th)?[\s\-_/]+(?:october|oct|november|nov|december|dec|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep)\b/gi, ' ');
  }

  // 2. Detect Shift
  if (/\b(day|morning|sakal|divas|day shift)\b/i.test(normalizedText)) {
    detected.shift = 'Day Shift (7:00 AM - 7:00 PM)';
    tokensFound.push({ field: 'Shift', value: 'Day Shift' });
    workingText = workingText.replace(/\b(day shift|night shift|day|morning|sakal|divas)\b/gi, ' ');
  } else if (/\b(night|raat|raatra|night shift)\b/i.test(normalizedText)) {
    detected.shift = 'Night Shift (7:00 PM - 7:00 AM)';
    tokensFound.push({ field: 'Shift', value: 'Night Shift' });
    workingText = workingText.replace(/\b(night shift|day shift|night|raat|raatra)\b/gi, ' ');
  }

  // 3. Detect Operator using Marathi Phonetic Engine
  if (operatorMaster && operatorMaster.length > 0) {
    const opMatch = matchOperatorFromSpeech(normalizedText, operatorMaster);
    if (opMatch) {
      detected.operatorName = opMatch.operator.name;
      detected.operatorId = opMatch.operator.id;
      tokensFound.push({
        field: 'Operator',
        value: opMatch.operator.name,
        confidence: opMatch.confidence,
        reason: opMatch.reason
      });
      // Mask operator name, short name and aliases from working text
      const namesToMask = [opMatch.operator.name, opMatch.operator.shortName, ...(opMatch.operator.aliases || [])];
      for (const n of namesToMask) {
        if (n && n.length > 2) {
          const reg = new RegExp(`\\b${n}\\b`, 'gi');
          workingText = workingText.replace(reg, ' ');
        }
      }
    }
  }

  // 4. Detect Machine: Highly responsive to "machine [name]" or registered machines
  if (machines && machines.length > 0) {
    let matchedMachine = null;

    // Pattern A: Madam says "machine [name/type]"
    const machineSpokenRegex = /\bmachine\s*(?:is|type|no|number|code)?\s*([a-z0-9\s\-]+?)(?=\s+(?:ai|part|qty|quantity|count|found|formed|weighted|operator|date|shift|$))/i;
    const machineMatch = normalizedText.match(machineSpokenRegex);

    if (machineMatch && machineMatch[1]) {
      const spokenMachineTerm = machineMatch[1].trim().toLowerCase();
      // Try exact code or alias match with the captured term
      // Try exact code or exact alias match first
      for (const m of machines) {
        if (m.code.toLowerCase() === spokenMachineTerm) {
          matchedMachine = m;
          break;
        }
        if (m.aliases && m.aliases.some(a => a.toLowerCase() === spokenMachineTerm)) {
          matchedMachine = m;
          break;
        }
      }

      // If not exact, check word boundary inclusion, prioritizing longer aliases
      if (!matchedMachine) {
        const sortedMachines = [...machines].sort((a, b) => b.code.length - a.code.length);
        for (const m of sortedMachines) {
          if (m.code.toLowerCase().includes(spokenMachineTerm) || spokenMachineTerm.includes(m.code.toLowerCase())) {
            matchedMachine = m;
            break;
          }
          const hasAliasMatch = m.aliases && m.aliases.some(a => {
            const reg = new RegExp(`\\b${a}\\b`, 'i');
            return reg.test(spokenMachineTerm);
          });
          if (hasAliasMatch) {
            matchedMachine = m;
            break;
          }
        }
      }

      // Keyword check in spoken term
      if (!matchedMachine) {
        if (/\b(cnc|lathe)\b/i.test(spokenMachineTerm)) {
          matchedMachine = machines.find(m => m.type === 'CNC');
        } else if (/\b(vmc|milling)\b/i.test(spokenMachineTerm)) {
          matchedMachine = machines.find(m => m.type === 'VMC');
        } else if (/\b(press|power press)\b/i.test(spokenMachineTerm)) {
          matchedMachine = machines.find(m => m.type === 'Press');
        } else if (/\b(grind|grinder)\b/i.test(spokenMachineTerm)) {
          matchedMachine = machines.find(m => m.type === 'Grinder');
        }
      }

      // If user dictated custom machine name after "machine", use it
      if (!matchedMachine && spokenMachineTerm.length > 1) {
        const customTitle = spokenMachineTerm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        detected.machineType = customTitle;
        tokensFound.push({ field: 'Machine', value: customTitle });
      }

      // Mask the whole machine phrase from workingText so numbers like "01", "02", "100" are removed!
      workingText = workingText.replace(machineSpokenRegex, ' ');
    }

    // Pattern B: Match against machine master code or aliases anywhere in text
    if (!matchedMachine && !detected.machineType) {
      for (const m of machines) {
        const codeMatch = normalizedText.toLowerCase().includes(m.code.toLowerCase());
        const aliasMatch = m.aliases && m.aliases.some(a => {
          const reg = new RegExp(`\\b${a}\\b`, 'i');
          return reg.test(normalizedText);
        });
        if (codeMatch || aliasMatch) {
          matchedMachine = m;
          break;
        }
      }
    }

    // Pattern C: Generic machine type fallbacks
    if (!matchedMachine && !detected.machineType) {
      if (/\b(cnc|lathe)\b/i.test(normalizedText)) {
        matchedMachine = machines.find(m => m.type === 'CNC');
      } else if (/\b(vmc|milling)\b/i.test(normalizedText)) {
        matchedMachine = machines.find(m => m.type === 'VMC');
      } else if (/\b(press|power press)\b/i.test(normalizedText)) {
        matchedMachine = machines.find(m => m.type === 'Press');
      } else if (/\b(grind|grinder)\b/i.test(normalizedText)) {
        matchedMachine = machines.find(m => m.type === 'Grinder');
      }
    }

    if (matchedMachine && !detected.machineType) {
      detected.machineType = matchedMachine.code;
      tokensFound.push({ field: 'Machine', value: matchedMachine.code });
      // Mask machine code and aliases from workingText
      const mTerms = [matchedMachine.code, ...(matchedMachine.aliases || [])];
      for (const mt of mTerms) {
        const reg = new RegExp(`\\b${mt}\\b`, 'gi');
        workingText = workingText.replace(reg, ' ');
      }
    }
  }

  // Mask remaining structural words to prevent interference
  workingText = workingText.replace(/\b(?:operator|machine|operater|type|shop|shift)\b/gi, ' ');

  // 5. UNAMBIGUOUS SEPARATION OF AI NUMBER & QUANTITY
  // Now workingText contains strictly AI Number and Quantity dictations!

  // STEP A: Detect Part Number (AI Number)
  // Handles: "AI no 1042", "AI number 1042", "a i no 1042", "aye no 1042", "I know 1042", "high no 1042", "hai no 1042", "I no 1042", "part no 1042", "part 1042", "drawing 1042"
  const aiRegex = /\b(?:ai|a\.i\.|a\s+i|aye|eye|i\s+know|i\s+no|high\s+no|hai\s+no|part|drawing)[\s\-_:]*(?:no|num|number|code)?[\s\-_.:]*([0-9]{2,6})\b/i;
  const aiMatch = workingText.match(aiRegex);

  let rawAiNum = null;
  if (aiMatch) {
    rawAiNum = aiMatch[1];
    detected.aiNumber = `AI-${rawAiNum}`;
    tokensFound.push({ field: 'AI Number (Part No)', value: `AI-${rawAiNum}` });
    // Mask the exact matched AI phrase from workingText so its number cannot be mistaken for quantity!
    workingText = workingText.replace(aiMatch[0], ' ');
  } else if (parts && parts.length > 0) {
    for (const p of parts) {
      const bareNum = p.aiNumber.replace(/[^0-9]/g, '');
      if (bareNum && workingText.includes(bareNum)) {
        rawAiNum = bareNum;
        detected.aiNumber = p.aiNumber;
        tokensFound.push({ field: 'AI Number (Part No)', value: p.aiNumber });
        workingText = workingText.replace(bareNum, ' ');
        break;
      }
    }
  }

  // STEP B: Detect Weighted Quantity
  // Priority 1: Direct "qty found [number]" or variations (cutie found, q t found, qty formed, etc.)
  const qtyFoundRegex = /\b(?:qty\s*found|quantity\s*found|qty\s*formed|quantity\s*formed|qt\s*found|cutie\s*found|q\s*t\s*found|qty\s*sound|qty\s*round|qty\s*pound|weight\s*found|weighted\s*qty|weighted\s*quantity|found\s*qty|found\s*quantity)[\s:]*([0-9]+(?:\.[0-9]+)?)\b/i;
  const foundMatch = workingText.match(qtyFoundRegex);

  let foundQty = null;
  if (foundMatch) {
    foundQty = parseFloat(foundMatch[1]);
    workingText = workingText.replace(foundMatch[0], ' ');
  }

  // Priority 2: General Quantity Prefixes ("quantity 500", "qty 500", "count 500", "pieces 500", "voice 500", "wazan 500")
  if (foundQty === null) {
    const generalQtyRegex = /\b(?:quantity|qty|count|pieces|pcs|nug|nag|weight|vajan|wazan|voice|formed)[\s:]*([0-9]+(?:\.[0-9]+)?)\b/i;
    const generalMatch = workingText.match(generalQtyRegex);
    if (generalMatch) {
      foundQty = parseFloat(generalMatch[1]);
      workingText = workingText.replace(generalMatch[0], ' ');
    }
  }

  // Priority 3: Postfix Units ("500 pcs", "500 pieces", "500 units", "500 nag", "500 found")
  if (foundQty === null) {
    const postfixQtyRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(?:pcs|pieces|nug|nag|units|quantity|qty|count|found|formed)\b/i;
    const postMatch = workingText.match(postfixQtyRegex);
    if (postMatch) {
      foundQty = parseFloat(postMatch[1]);
      workingText = workingText.replace(postMatch[0], ' ');
    }
  }

  // Priority 4: If an explicit AI number was ALREADY captured (e.g. "AI no 1042 500"), then any remaining standalone number in workingText is the Quantity!
  if (foundQty === null && detected.aiNumber) {
    const remainingNumbers = [...workingText.matchAll(/\b([0-9]+(?:\.[0-9]+)?)\b/g)]
      .map(m => parseFloat(m[1]))
      .filter(n => n > 0 && String(n) !== rawAiNum);
    if (remainingNumbers.length > 0) {
      foundQty = remainingNumbers[0];
    }
  }

  // Priority 5: If quantity was captured FIRST and NO AI number was captured yet, check if there's a standalone 3-5 digit number in workingText that could be the AI number
  if (!detected.aiNumber && foundQty !== null) {
    const remainingAiCandidates = [...workingText.matchAll(/\b([0-9]{3,5})\b/g)]
      .map(m => m[1])
      .filter(num => parseFloat(num) !== foundQty);
    if (remainingAiCandidates.length > 0) {
      const candidate = remainingAiCandidates[0];
      detected.aiNumber = `AI-${candidate}`;
      tokensFound.push({ field: 'AI Number (Part No)', value: `AI-${candidate}` });
    }
  }

  if (foundQty !== null) {
    detected.quantity = foundQty;
    tokensFound.push({ field: 'Quantity Found', value: `${foundQty} pcs` });
  }

  // 7. Action Commands (Save / Submit)
  const isSaveCommand = /\b(save|submit|confirm|enter|done|theek ahe|zala|jama kara)\b/i.test(normalizedText);

  return {
    detected,
    tokensFound,
    isSaveCommand,
    rawTranscript: cleanText
  };
}
