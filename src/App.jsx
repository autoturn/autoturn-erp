import React, { useState, useEffect } from 'react';
import { 
  ERP_USERS, 
  INITIAL_OPERATOR_MASTER, 
  INITIAL_MACHINES, 
  INITIAL_PARTS 
} from './data/initialData.js';
import { 
  STORAGE_KEYS, 
  loadFromStorage, 
  saveToStorage 
} from './utils/storage.js';
import { 
  pushRecordToSupabase, 
  updateRecordInSupabase, 
  deleteRecordFromSupabase,
  getStoredSupabaseConfig 
} from './utils/supabase.js';
import { Header } from './components/Header.jsx';
import { WeighingForm } from './components/WeighingForm.jsx';
import { RecordsList } from './components/RecordsList.jsx';
import { OperatorMasterModal } from './components/OperatorMasterModal.jsx';
import { MachineMasterModal } from './components/MachineMasterModal.jsx';
import { SupabaseConfigModal } from './components/SupabaseConfigModal.jsx';
import { BottomNav } from './components/BottomNav.jsx';

export default function App() {
  // Permanent default user for shopfloor weighing desk: Sayali Madam (Production Incharge)
  const currentUser = ERP_USERS[0];

  const [records, setRecords] = useState(() => {
    const loaded = loadFromStorage(STORAGE_KEYS.RECORDS, []);
    return (loaded || []).filter(r => !['REC-1001', 'REC-1002', 'REC-1003', 'REC-1004'].includes(r.id));
  });

  const [operatorMaster, setOperatorMaster] = useState(() => 
    loadFromStorage(STORAGE_KEYS.OPERATORS, INITIAL_OPERATOR_MASTER)
  );

  const [machines, setMachines] = useState(() => 
    loadFromStorage(STORAGE_KEYS.MACHINES, INITIAL_MACHINES)
  );
  const [parts] = useState(INITIAL_PARTS);
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'records'

  // Modals
  const [isOperatorsOpen, setIsOperatorsOpen] = useState(false);
  const [isMachinesOpen, setIsMachinesOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(() => {
    const cfg = getStoredSupabaseConfig();
    return Boolean(cfg.url && cfg.key);
  });

  // Local Persistence
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECORDS, records);
  }, [records]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OPERATORS, operatorMaster);
  }, [operatorMaster]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MACHINES, machines);
  }, [machines]);

  // Handlers with automatic Supabase Cloud Sync
  const handleSaveRecord = async (newRecord) => {
    setRecords(prev => [newRecord, ...prev]);
    // Asynchronously push to Supabase Cloud
    pushRecordToSupabase(newRecord).catch(() => {});
  };

  const handleUpdateRecord = async (updatedRecord) => {
    setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    // Asynchronously update in Supabase Cloud
    updateRecordInSupabase(updatedRecord).catch(() => {});
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm('Delete this weighing record?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
      // Asynchronously delete in Supabase Cloud
      deleteRecordFromSupabase(id).catch(() => {});
    }
  };

  const handleAddOperator = (newOp) => {
    setOperatorMaster(prev => [newOp, ...prev]);
  };

  const handleDeleteOperator = (id) => {
    if (window.confirm('Delete operator from master list?')) {
      setOperatorMaster(prev => prev.filter(op => op.id !== id));
    }
  };

  const handleResetOperators = () => {
    if (window.confirm('Reset operator list to default Marathi master?')) {
      setOperatorMaster(INITIAL_OPERATOR_MASTER);
    }
  };

  const handleAddMachine = (newMachine) => {
    setMachines(prev => [newMachine, ...prev]);
  };

  const handleDeleteMachine = (id) => {
    if (window.confirm('Delete machine from master list?')) {
      setMachines(prev => prev.filter(m => m.id !== id && m.code !== id));
    }
  };

  const handleResetMachines = () => {
    if (window.confirm('Reset machine list to defaults?')) {
      setMachines(INITIAL_MACHINES);
    }
  };

  const handleBottomTabSelect = (tab) => {
    if (tab === 'operators') {
      setIsOperatorsOpen(true);
    } else if (tab === 'machines') {
      setIsMachinesOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Dedicated Shopfloor Weighing Desk (Sayali Madam - Direct Uncluttered Access)
  return (
    <div className="erp-app-wrapper">
      <div className="erp-app-container">
        {/* Main AUTOTURN ERP Header */}
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenOperators={() => setIsOperatorsOpen(true)}
          onOpenSupabase={() => setIsSupabaseOpen(true)}
          recordsCount={records.length}
          isCloudConnected={isCloudConnected}
        />

        {/* Tab Navigation Segmented Bar (Only 2 tabs for Sayali Madam: Weighing Form & Shift Records) */}
        <div className="erp-tab-bar">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            🎙️ Weighing & Voice Form
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📋 Shift Records ({records.length})
          </button>
        </div>

        {/* Main Content Area */}
        <main className="erp-main-body">
          {activeTab === 'form' ? (
            <WeighingForm
              currentUser={currentUser}
              operatorMaster={operatorMaster}
              machines={machines}
              parts={parts}
              records={records}
              onSaveRecord={handleSaveRecord}
              onOpenOperatorMaster={() => setIsOperatorsOpen(true)}
              onOpenMachineMaster={() => setIsMachinesOpen(true)}
            />
          ) : (
            <RecordsList
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onUpdateRecord={handleUpdateRecord}
              operatorMaster={operatorMaster}
              machines={machines}
            />
          )}
        </main>

        {/* Mobile App Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleBottomTabSelect}
          recordsCount={records.length}
          operatorsCount={operatorMaster.length}
          machinesCount={machines.length}
        />
      </div>

      {/* Operator Master Modal */}
      <OperatorMasterModal
        isOpen={isOperatorsOpen}
        onClose={() => setIsOperatorsOpen(false)}
        operators={operatorMaster}
        onAddOperator={handleAddOperator}
        onDeleteOperator={handleDeleteOperator}
        onResetOperators={handleResetOperators}
      />

      {/* Machine Master Modal */}
      <MachineMasterModal
        isOpen={isMachinesOpen}
        onClose={() => setIsMachinesOpen(false)}
        machines={machines}
        onAddMachine={handleAddMachine}
        onDeleteMachine={handleDeleteMachine}
        onResetMachines={handleResetMachines}
      />


      {/* Supabase Cloud Connection Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        onConnectionChanged={(connected) => setIsCloudConnected(connected)}
      />
    </div>
  );
}
