/**
 * Advanced Marathi & Indian Name Phonetic Matching Engine
 * Handles typical WebSpeech / STT transcription variations of Marathi names
 */

// Compute Levenshtein distance between two strings
export function levenshteinDistance(a, b) {
  if (!a || !b) return (a || '').length + (b || '').length;
  const matrix = Array.from({ length: a.length + 1 }, () => 
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

// Similarity percentage 0 to 1
export function stringSimilarity(str1, str2) {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

/**
 * Phonetic Normalizer tailored for Marathi / Indian speech variations
 * E.g. 'Dnyaneshwar' vs 'Gyaneshwar' vs 'Dyaneshwar' vs 'Daneshwar'
 * 'Vitthal' vs 'Vittal', 'Tukaram' vs 'Tookaram'
 */
export function marathiPhoneticNormalize(text) {
  if (!text) return '';
  let str = text.toLowerCase().trim();

  // Strip common prefixes/honorifics
  str = str.replace(/\b(operator|shri|mr|shree|worker|kamgar|bhai|ji|saheb|kaka)\b/gi, ' ');

  // Common Marathi conjunct sounds (ज्ञ / Dnya)
  str = str.replace(/dnya|gyan|jnan|dny|jny|dya|dana/g, 'dnya');

  // Vowel variations
  str = str.replace(/ee|ea/g, 'i');
  str = str.replace(/oo|ou/g, 'u');
  str = str.replace(/aa|ah/g, 'a');

  // Aspirated vs unaspirated consonants
  str = str.replace(/th/g, 't');
  str = str.replace(/dh/g, 'd');
  str = str.replace(/bh/g, 'b');
  str = str.replace(/kh/g, 'k');
  str = str.replace(/gh/g, 'g');
  str = str.replace(/ph/g, 'f');
  str = str.replace(/chh/g, 'ch');
  str = str.replace(/sh|shh|zh/g, 's');
  str = str.replace(/w/g, 'v');

  // Repeated consonants
  str = str.replace(/([a-z])\1+/g, '$1');

  // Remove spaces and punctuation
  str = str.replace(/[^a-z0-9]/g, '');

  return str;
}

/**
 * Matches a spoken string or token against the Operator Master list.
 * Returns the best candidate with confidence score and match reason.
 */
export function matchOperatorFromSpeech(spokenText, operatorMaster) {
  if (!spokenText || !operatorMaster || operatorMaster.length === 0) {
    return null;
  }

  const cleanSpoken = spokenText.toLowerCase().trim();
  const phoneticSpoken = marathiPhoneticNormalize(cleanSpoken);

  let bestMatch = null;
  let highestScore = 0;
  let matchReason = '';

  for (const op of operatorMaster) {
    let score = 0;
    let reason = '';

    const fullName = op.name.toLowerCase();
    const shortName = op.shortName.toLowerCase();
    const cleanMarathi = (op.marathiName || '').toLowerCase();

    // 1. Direct substring match in spoken text
    if (cleanSpoken.includes(shortName) || cleanSpoken.includes(fullName)) {
      score = 0.98;
      reason = 'Direct name match';
    }

    // 2. Check aliases (e.g. 'dyaneshwar', 'gyaneshwar', 'tookaram')
    if (op.aliases && op.aliases.length > 0) {
      for (const alias of op.aliases) {
        const aliasLower = alias.toLowerCase();
        if (cleanSpoken.includes(aliasLower)) {
          const aliasScore = 0.95;
          if (aliasScore > score) {
            score = aliasScore;
            reason = `Matched alias "${alias}"`;
          }
        }
      }
    }

    // 3. Marathi script match if spoken in Marathi
    if (cleanMarathi && cleanSpoken.includes(cleanMarathi)) {
      score = 0.99;
      reason = 'Exact Marathi script match';
    }

    // 4. Phonetic normalizer match
    const opPhonetic = marathiPhoneticNormalize(shortName);
    const opFullPhonetic = marathiPhoneticNormalize(fullName);

    // Phonetic similarity
    const phonSimShort = stringSimilarity(phoneticSpoken, opPhonetic);
    const phonSimFull = stringSimilarity(phoneticSpoken, opFullPhonetic);
    const maxPhonSim = Math.max(phonSimShort, phonSimFull);

    if (maxPhonSim > score) {
      score = maxPhonSim * 0.92; // Slightly below exact
      reason = `Phonetic acoustic match (~${Math.round(score * 100)}%)`;
    }

    // 5. Check individual spoken words against operator name & aliases
    const words = cleanSpoken.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const wordPhonetic = marathiPhoneticNormalize(word);
      const wordSim = stringSimilarity(wordPhonetic, opPhonetic);
      if (wordSim > 0.82 && wordSim * 0.9 > score) {
        score = wordSim * 0.9;
        reason = `Spoken token "${word}" matched "${op.shortName}" (${Math.round(score * 100)}%)`;
      }

      // Check word against each alias phonetically
      if (op.aliases) {
        for (const alias of op.aliases) {
          const aliasPhon = marathiPhoneticNormalize(alias);
          const aliasSim = stringSimilarity(wordPhonetic, aliasPhon);
          if (aliasSim > 0.85 && aliasSim * 0.88 > score) {
            score = aliasSim * 0.88;
            reason = `Phonetic match to alias "${alias}" (${Math.round(score * 100)}%)`;
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = op;
      matchReason = reason;
    }
  }

  // Threshold: at least 65% match confidence
  if (highestScore >= 0.65 && bestMatch) {
    return {
      operator: bestMatch,
      confidence: Math.round(highestScore * 100),
      reason: matchReason
    };
  }

  return null;
}
