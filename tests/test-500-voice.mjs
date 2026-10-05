import { parseWeighingVoiceCommand } from '../src/utils/voiceParser.js';
import { INITIAL_OPERATOR_MASTER, INITIAL_MACHINES, INITIAL_PARTS } from '../src/data/initialData.js';

console.log('=== RUNNING DISAMBIGUATION TEST FOR AI NO & QUANTITY ===\n');

const testCases = [
  {
    name: "Machine numbers (01) must NOT pollute Quantity",
    phrase: "machine CNC Lathe 01 AI no 1042 qty found 500",
    expectedQty: 500,
    expectedAi: "AI-1042",
    expectedMachine: "CNC Lathe 01"
  },
  {
    name: "Machine numbers (100T) must NOT pollute Quantity or AI",
    phrase: "machine Power Press 100T AI no 8821 qty found 350",
    expectedQty: 350,
    expectedAi: "AI-8821",
    expectedMachine: "Power Press 100T"
  },
  {
    name: "Same numbers in AI and Qty handled accurately",
    phrase: "machine VMC Milling 02 AI no 500 qty found 500",
    expectedQty: 500,
    expectedAi: "AI-500",
    expectedMachine: "VMC Milling 02"
  },
  {
    name: "Reverse order: Qty spoken BEFORE AI no",
    phrase: "qty found 500 AI no 1042",
    expectedQty: 500,
    expectedAi: "AI-1042"
  },
  {
    name: "Speech recognition hears 'I know' instead of 'AI no'",
    phrase: "I know 1042 quantity found 500",
    expectedQty: 500,
    expectedAi: "AI-1042"
  },
  {
    name: "Speech recognition hears 'cutie found' instead of 'qty found'",
    phrase: "AI no 7712 cutie found 450",
    expectedQty: 450,
    expectedAi: "AI-7712"
  },
  {
    name: "ONLY AI Number spoken (Quantity must remain unset)",
    phrase: "AI no 1042",
    expectedAi: "AI-1042",
    expectedQty: undefined
  },
  {
    name: "Machine 01 with ONLY AI number (Quantity must remain unset)",
    phrase: "machine VMC 01 AI no 1042",
    expectedMachine: "VMC Milling 01",
    expectedAi: "AI-1042",
    expectedQty: undefined
  },
  {
    name: "ONLY Quantity spoken (AI number must remain unset)",
    phrase: "qty found 500",
    expectedQty: 500,
    expectedAi: undefined
  },
  {
    name: "Natural compound words (five hundred)",
    phrase: "operator Sachin machine Lathe AI 9910 qty found five hundred",
    expectedOp: "Sachin Jadhav",
    expectedMachine: "CNC Lathe 01",
    expectedAi: "AI-9910",
    expectedQty: 500
  },
  {
    name: "Speech with 'drawing no'",
    phrase: "drawing no 3450 qty found 600",
    expectedAi: "AI-3450",
    expectedQty: 600
  }
];

let passed = 0;
for (const tc of testCases) {
  const result = parseWeighingVoiceCommand(tc.phrase, {
    operatorMaster: INITIAL_OPERATOR_MASTER,
    machines: INITIAL_MACHINES,
    parts: INITIAL_PARTS
  });

  const qtyMatch = result.detected.quantity === tc.expectedQty;
  const aiMatch = result.detected.aiNumber === tc.expectedAi;
  const opMatch = !tc.expectedOp || result.detected.operatorName === tc.expectedOp;
  const machineMatch = !tc.expectedMachine || result.detected.machineType === tc.expectedMachine;

  const ok = qtyMatch && aiMatch && opMatch && machineMatch;

  if (ok) {
    console.log(`[PASS] ${tc.name}`);
    console.log(`       Input: "${tc.phrase}"`);
    console.log(`       -> AI: ${result.detected.aiNumber || 'unset'} | Qty: ${result.detected.quantity !== undefined ? result.detected.quantity : 'unset'}`);
    passed++;
  } else {
    console.error(`[FAIL] ${tc.name}`);
    console.error(`       Input: "${tc.phrase}"`);
    console.error(`       Expected: AI=${tc.expectedAi}, Qty=${tc.expectedQty}`);
    console.error(`       Got:      AI=${result.detected.aiNumber}, Qty=${result.detected.quantity}`);
  }
}

console.log(`\n=== DISAMBIGUATION TEST RESULT: ${passed}/${testCases.length} PASSED ===`);
if (passed !== testCases.length) {
  process.exit(1);
}
