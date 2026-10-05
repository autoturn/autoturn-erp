import { levenshteinDistance, stringSimilarity, marathiPhoneticNormalize, matchOperatorFromSpeech } from '../src/utils/phoneticMatcher.js';
import { parseWeighingVoiceCommand } from '../src/utils/voiceParser.js';
import { INITIAL_OPERATOR_MASTER, INITIAL_MACHINES, INITIAL_PARTS } from '../src/data/initialData.js';
import { getCurrentShift } from '../src/utils/storage.js';

console.log('--- 1. Testing Marathi Phonetic Matching ---');
const testCases = [
  { sound: 'dyaneshwar', expectedShort: 'Dnyaneshwar' },
  { sound: 'gyaneshwar', expectedShort: 'Dnyaneshwar' },
  { sound: 'tookaram', expectedShort: 'Tukaram' },
  { sound: 'vittal', expectedShort: 'Vitthal' },
  { sound: 'sacheen', expectedShort: 'Sachin' },
  { sound: 'pandu rang', expectedShort: 'Pandurang' },
  { sound: 'santos', expectedShort: 'Santosh' },
  { sound: 'neelesh', expectedShort: 'Nilesh' }
];

let matchPass = 0;
for (const tc of testCases) {
  const result = matchOperatorFromSpeech(tc.sound, INITIAL_OPERATOR_MASTER);
  if (result && result.operator.shortName.toLowerCase() === tc.expectedShort.toLowerCase()) {
    console.log(`[PASS] Spoken: "${tc.sound}" -> Matched: "${result.operator.name}" (${result.confidence}%) - ${result.reason}`);
    matchPass++;
  } else {
    console.error(`[FAIL] Spoken: "${tc.sound}" -> Result:`, result);
  }
}

console.log(`\nPhonetic Matcher Results: ${matchPass}/${testCases.length} Passed`);

console.log('\n--- 2. Testing Natural Voice Command Parser ---');
const phrases = [
  {
    input: "Operator Dnyaneshwar machine VMC AI 1042 quantity 250",
    expectedOp: "Dnyaneshwar Kadam",
    expectedMachine: "VMC Milling 01",
    expectedAI: "AI-1042",
    expectedQty: 250
  },
  {
    input: "Tukaram CNC Lathe 01 part number AI 8821 count 480",
    expectedOp: "Tukaram Shinde",
    expectedMachine: "CNC Lathe 01",
    expectedAI: "AI-8821",
    expectedQty: 480
  },
  {
    input: "Sachin Jadhav Power Press AI 7712 quantity 350",
    expectedOp: "Sachin Jadhav",
    expectedMachine: "Power Press 100T",
    expectedAI: "AI-7712",
    expectedQty: 350
  },
  {
    input: "Vitthal More Centerless Grinder AI 4500 count 600",
    expectedOp: "Vitthal More",
    expectedMachine: "Centerless Grinder",
    expectedAI: "AI-4500",
    expectedQty: 600
  }
];

let parsePass = 0;
for (const p of phrases) {
  const parsed = parseWeighingVoiceCommand(p.input, {
    operatorMaster: INITIAL_OPERATOR_MASTER,
    machines: INITIAL_MACHINES,
    parts: INITIAL_PARTS
  });

  const opOk = parsed.detected.operatorName === p.expectedOp;
  const machOk = parsed.detected.machineType === p.expectedMachine;
  const aiOk = parsed.detected.aiNumber === p.expectedAI;
  const qtyOk = parsed.detected.quantity === p.expectedQty;

  if (opOk && machOk && aiOk && qtyOk) {
    console.log(`[PASS] Input: "${p.input}"`);
    console.log(`       -> Operator: ${parsed.detected.operatorName}, Machine: ${parsed.detected.machineType}, AI: ${parsed.detected.aiNumber}, Qty: ${parsed.detected.quantity}`);
    parsePass++;
  } else {
    console.error(`[FAIL] Input: "${p.input}" ->`, parsed.detected);
  }
}
console.log(`Voice Command Parser Results: ${parsePass}/${phrases.length} Passed`);

console.log('\n--- 3. Testing Shift Auto-Detector ---');
const currentShift = getCurrentShift();
console.log(`Current Shift detected at ${new Date().toLocaleTimeString()}:`, currentShift);
console.log('Shift correctly formatted:', currentShift.includes('Shift (7:00'));

console.log('\n=== ALL CORE ENGINE TESTS COMPLETED ===');
