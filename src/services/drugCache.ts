import type { GeminiDrugResult } from './geminiAI';

const DB_KEY = 'dawaouk_db_v2';
const HIST_KEY = 'dawaouk_history';

export interface SavedDrug extends GeminiDrugResult {
  id: string;
  savedAt: number;
  timesAccessed: number;
}

export interface HistoryEntry {
  id: string;
  drugName: string;
  genericName: string;
  categoryAr: string;
  source: 'scan' | 'search' | 'cache';
  timestamp: number;
  imageThumb?: string;
}

// ─── Drug Database ───
function getDB(): SavedDrug[] {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { return []; }
}
function setDB(d: SavedDrug[]) { localStorage.setItem(DB_KEY, JSON.stringify(d)); }

export function saveDrug(drug: GeminiDrugResult): SavedDrug {
  const db = getDB();
  const idx = db.findIndex(d => d.drugName.toLowerCase() === drug.drugName.toLowerCase() || d.genericName.toLowerCase() === drug.genericName.toLowerCase());
  if (idx >= 0) {
    db[idx] = { ...db[idx], ...drug, timesAccessed: db[idx].timesAccessed + 1 };
    setDB(db);
    return db[idx];
  }
  const entry: SavedDrug = { ...drug, id: `d${Date.now()}`, savedAt: Date.now(), timesAccessed: 1 };
  db.unshift(entry);
  setDB(db);
  return entry;
}

export function findDrug(query: string): SavedDrug | null {
  if (!query || query.length < 2) return null;
  const q = query.toLowerCase();
  const db = getDB();
  const found = db.find(d => d.drugName.toLowerCase().includes(q) || d.genericName.toLowerCase().includes(q) || q.includes(d.drugName.toLowerCase()) || q.includes(d.genericName.toLowerCase()));
  if (found) { found.timesAccessed++; setDB(db); }
  return found || null;
}

export function getAllDrugs(): SavedDrug[] { return getDB(); }
export function getDrugCount(): number { return getDB().length; }
export function deleteDrug(id: string) { setDB(getDB().filter(d => d.id !== id)); }

// ─── History ───
function getHist(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function setHist(h: HistoryEntry[]) { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 100))); }

export function addHistory(drugName: string, genericName: string, categoryAr: string, source: HistoryEntry['source'], imageThumb?: string) {
  const h = getHist();
  h.unshift({ id: `h${Date.now()}`, drugName, genericName, categoryAr, source, timestamp: Date.now(), imageThumb });
  setHist(h);
}

export function getHistory(): HistoryEntry[] { return getHist(); }
export function clearHistory() { localStorage.removeItem(HIST_KEY); }
