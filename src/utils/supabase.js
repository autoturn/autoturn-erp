import { createClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_KEY = 'autoturn_supabase_config';

export function getStoredSupabaseConfig() {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  const defaultUrl = 'https://womxwyifsxdjtvnosxew.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvbXh3eWlmc3hkanR2bm9zeGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODkzMzcsImV4cCI6MjEwNjc2NTMzN30.634bVF_rnAyd0_B48zPLWGZ1oiRoLyAlUZztI98RWE4';
  
  return {
    url: import.meta.env.VITE_SUPABASE_URL || defaultUrl,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey
  };
}

export function saveStoredSupabaseConfig(url, key) {
  const config = { url: url.trim(), key: key.trim() };
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
  initSupabaseClient(config.url, config.key);
  return config;
}

let supabaseInstance = null;

export function initSupabaseClient(url, key) {
  const config = url && key ? { url, key } : getStoredSupabaseConfig();
  if (config.url && config.key) {
    try {
      supabaseInstance = createClient(config.url, config.key);
      return supabaseInstance;
    } catch (err) {
      console.warn('Supabase initialization failed:', err);
    }
  }
  supabaseInstance = null;
  return null;
}

export function getSupabase() {
  if (!supabaseInstance) {
    initSupabaseClient();
  }
  return supabaseInstance;
}

// Push new record to Supabase
export async function pushRecordToSupabase(record) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('production_weighing_records')
      .upsert({
        id: record.id,
        date: record.date,
        shift: record.shift,
        operator_name: record.operatorName,
        operator_id: record.operatorId || 'OP-CUSTOM',
        machine_type: record.machineType,
        ai_number: record.aiNumber,
        quantity: record.quantity,
        weight: record.weight,
        unit: 'pcs',
        entry_by: record.entryBy || 'Sayali Madam',
        timestamp: record.timestamp,
        method: record.method || 'Voice Entry',
        status: record.status || 'Verified'
      });

    if (error) {
      console.warn('Supabase sync error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase network error:', err);
    return false;
  }
}

// Update existing record in Supabase
export async function updateRecordInSupabase(record) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { error } = await sb
      .from('production_weighing_records')
      .update({
        date: record.date,
        shift: record.shift,
        operator_name: record.operatorName,
        machine_type: record.machineType,
        ai_number: record.aiNumber,
        quantity: record.quantity,
        weight: record.weight,
        status: record.status || 'Verified'
      })
      .eq('id', record.id);

    if (error) console.warn('Supabase update error:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase update failed:', err);
    return false;
  }
}

// Delete record from Supabase
export async function deleteRecordFromSupabase(recordId) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { error } = await sb
      .from('production_weighing_records')
      .delete()
      .eq('id', recordId);

    if (error) console.warn('Supabase delete error:', error.message);
    return !error;
  } catch (err) {
    console.warn('Supabase delete failed:', err);
    return false;
  }
}

// Fetch all weighing records (used by the separate Production ERP page)
export async function fetchRecordsFromSupabase() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const all = [];
    const pageSize = 1000;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await sb
        .from('production_weighing_records')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) {
        console.warn('Supabase fetch error:', error.message);
        return null;
      }
      all.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return all.map(r => ({
      id: r.id,
      date: r.date,
      shift: r.shift,
      operatorName: r.operator_name,
      operatorId: r.operator_id,
      machineType: r.machine_type,
      aiNumber: r.ai_number,
      quantity: Number(r.quantity) || 0,
      unit: r.unit || 'pcs',
      entryBy: r.entry_by,
      timestamp: r.timestamp,
      method: r.method,
      status: r.status
    }));
  } catch (err) {
    console.warn('Supabase fetch failed:', err);
    return null;
  }
}

// Test connection
export async function testSupabaseConnection(url, key) {
  try {
    const client = createClient(url, key);
    const { data, error } = await client.from('production_weighing_records').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Connected successfully to Supabase!' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
