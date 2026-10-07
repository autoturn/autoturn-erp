// User profiles for multi-login ERP
export const ERP_USERS = [
  {
    id: 'sayali.m',
    name: 'Sayali Madam',
    displayName: 'Sayali M. (Production Incharge)',
    role: 'Production Weighing Officer',
    department: 'Plant Production',
    avatar: '👩‍💼',
    badgeColor: '#6366f1'
  },
  {
    id: 'prakash.p',
    name: 'Prakash Patil',
    displayName: 'Prakash P. (Quality Inspector)',
    role: 'Quality Assurance Inspector',
    department: 'QA & Metrology',
    avatar: '👨‍🔬',
    badgeColor: '#0ea5e9'
  },
  {
    id: 'admin',
    name: 'ERP Administrator',
    displayName: 'System Admin',
    role: 'Master Admin',
    department: 'Digitalization',
    avatar: '🛡️',
    badgeColor: '#8b5cf6'
  }
];

// Master list of Shopfloor Operators (with Marathi phonetics and aliases)
export const INITIAL_OPERATOR_MASTER = [
  {
    id: 'OP-101',
    name: 'Dnyaneshwar Kadam',
    marathiName: 'ज्ञानेश्वर कदम',
    shortName: 'Dnyaneshwar',
    aliases: ['dyaneshwar', 'gyaneshwar', 'janeshwar', 'daneshwar', 'dnyanoba', 'dyanu'],
    department: 'Machining',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-102',
    name: 'Tukaram Shinde',
    marathiName: 'तुकाराम शिंदे',
    shortName: 'Tukaram',
    aliases: ['tuka ram', 'tookaram', 'tukaramji', 'tuka'],
    department: 'Machining',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-103',
    name: 'Sachin Jadhav',
    marathiName: 'सचिन जाधव',
    shortName: 'Sachin',
    aliases: ['sachin', 'sacheen', 'jadhav sachin'],
    department: 'Press Shop',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-104',
    name: 'Pandurang Pawar',
    marathiName: 'पांडुरंग पवार',
    shortName: 'Pandurang',
    aliases: ['pandu rang', 'panduranga', 'pandu'],
    department: 'Machining',
    shiftPreference: 'Night'
  },
  {
    id: 'OP-105',
    name: 'Ramesh Gaikwad',
    marathiName: 'रमेश गायकवाड',
    shortName: 'Ramesh',
    aliases: ['ramesh', 'rames', 'gaikwad ramesh'],
    department: 'Molding',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-106',
    name: 'Santosh Bhosale',
    marathiName: 'संतोष भोसले',
    shortName: 'Santosh',
    aliases: ['santosh', 'santhosh', 'santos'],
    department: 'Press Shop',
    shiftPreference: 'Night'
  },
  {
    id: 'OP-107',
    name: 'Vitthal More',
    marathiName: 'विठ्ठल मोरे',
    shortName: 'Vitthal',
    aliases: ['vittal', 'vithal', 'vithoba', 'withal'],
    department: 'Grinding',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-108',
    name: 'Ganesh Chavan',
    marathiName: 'गणेश चव्हाण',
    shortName: 'Ganesh',
    aliases: ['ganesh', 'ganesha', 'ganes'],
    department: 'Machining',
    shiftPreference: 'Day'
  },
  {
    id: 'OP-109',
    name: 'Nilesh Thorat',
    marathiName: 'निलेश थोरात',
    shortName: 'Nilesh',
    aliases: ['nilesh', 'neelesh', 'niles'],
    department: 'Assembly',
    shiftPreference: 'Night'
  }
];

// Machine Master list (Registered shopfloor machines)
export const INITIAL_MACHINES = [
  { id: 'M-01', code: 'Sliding Head 01', type: 'Sliding Head', aliases: ['sliding head 1', 'sliding head 01', 'sliding head', 'sliding', 'traub', 'swiss turn', 'auto 1', 'automat'] },
  { id: 'M-02', code: 'Sliding Head 02', type: 'Sliding Head', aliases: ['sliding head 2', 'sliding head 02', 'auto 2'] },
  { id: 'M-03', code: 'Sliding Head 03', type: 'Sliding Head', aliases: ['sliding head 3', 'sliding head 03', 'auto 3'] },
  { id: 'M-04', code: 'CNC Lathe 01', type: 'CNC', aliases: ['cnc 1', 'cnc 01', 'cnc lathe 1', 'cnc lathe 01', 'lathe 1', 'lathe 01', 'cnc lathe', 'cnc', 'lathe'] },
  { id: 'M-05', code: 'CNC Lathe 02', type: 'CNC', aliases: ['cnc 2', 'cnc 02', 'cnc lathe 2', 'cnc lathe 02', 'lathe 2', 'lathe 02'] },
  { id: 'M-06', code: 'Centerless Grinder', type: 'Grinding', aliases: ['grinder', 'centerless grinder', 'grinding', 'centerless', 'grinding machine'] },
  { id: 'M-07', code: 'Thread Rolling 01', type: 'Rolling', aliases: ['thread rolling', 'rolling 1', 'rolling 01', 'rolling', 'thread roller'] },
  { id: 'M-08', code: 'VMC Milling 01', type: 'VMC', aliases: ['vmc 1', 'vmc 01', 'vmc milling 1', 'vmc milling 01', 'milling 1', 'milling 01', 'vmc milling', 'vmc', 'milling'] },
  { id: 'M-09', code: 'VMC Milling 02', type: 'VMC', aliases: ['vmc 2', 'vmc 02', 'vmc milling 2', 'vmc milling 02', 'milling 2', 'milling 02'] },
  { id: 'M-10', code: 'Power Press 100T', type: 'Press', aliases: ['power press', 'press 100t', 'press', 'powerpress', 'power press 100t'] }
];

export const INITIAL_PARTS = [];

// Clean initial records: starts with empty list for real production shift entries
export const INITIAL_RECORDS = [];
