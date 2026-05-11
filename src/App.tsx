import { useState, useEffect } from 'react';
import { Search, Pill, Moon, Sun, ScanLine, Globe, Loader2, RefreshCw, Sparkles, Database, Clock, Trash2, Camera, Shield, ArrowLeftRight, Heart, Share2, Languages } from 'lucide-react';
import { searchDrugs, type OpenFDADrug } from './services/drugApi';
import { getAllDrugs, getHistory, clearHistory, deleteDrug, getDrugCount, type SavedDrug, type HistoryEntry } from './services/drugCache';
import FDADrugCard from './components/FDADrugCard';
import AIChat from './components/AIChat';
import MedicineScanner from './components/MedicineScanner';
import DrugInteractionChecker from './components/DrugInteractionChecker';
import { t, getSavedLang, saveLang, AVAILABLE_LANGS, type Lang } from './i18n';

type Tab = 'home' | 'search' | 'chat' | 'saved' | 'history' | 'interactions';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [dark, setDark] = useState(() => localStorage.getItem('dawaouk_dark') === '1');
  const [lang, setLangState] = useState<Lang>(getSavedLang);
  const [scanner, setScanner] = useState(false);
  const [q, setQ] = useState('');
  const [fdaRes, setFdaRes] = useState<OpenFDADrug[]>([]);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [fdaErr, setFdaErr] = useState('');
  const [savedDrugs, setSavedDrugs] = useState<SavedDrug[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedFilter, setSavedFilter] = useState('');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('dawaouk_favs') || '[]'); } catch { return []; } });

  const setLang = (l: Lang) => { setLangState(l); saveLang(l); setShowLangPicker(false); };
  const T = (key: Parameters<typeof t>[0]) => t(key, lang);
  const isRTL = lang === 'ar';

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('dawaouk_dark', dark ? '1' : '0'); }, [dark]);
  useEffect(() => { document.documentElement.dir = isRTL ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang, isRTL]);
  useEffect(() => { setSavedDrugs(getAllDrugs()); setHistory(getHistory()); }, [tab, scanner]);
  useEffect(() => { localStorage.setItem('dawaouk_favs', JSON.stringify(favs)); }, [favs]);

  const toggleFav = (id: string) => setFavs(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);
  const fdaSearch = async () => { if (!q.trim() || q.length < 2) return; setFdaLoading(true); setFdaErr(''); try { const r = await searchDrugs(q, 20); setFdaRes(r.drugs); if (!r.drugs.length) setFdaErr(T('noResults')); } catch { setFdaErr(T('connectionError')); } setFdaLoading(false); };
  const handleDrugFound = (d: OpenFDADrug) => { setFdaRes([d]); setTab('search'); };
  const shareDrug = (d: SavedDrug) => { const tx = `💊 ${d.drugName} (${d.genericName})\n${d.categoryAr}\n💵 ${d.estimatedPriceUSD} | 🇲🇦 ${d.estimatedPriceMAD}\n\n${d.descriptionEn}\n\n— DawaOuk`; if (navigator.share) navigator.share({ title: d.drugName, text: tx }).catch(() => {}); else navigator.clipboard.writeText(tx).catch(() => {}); };

  const bg = dark ? 'bg-gray-950' : 'bg-gray-50';
  const card = dark ? 'bg-gray-900/80 border-gray-800 backdrop-blur-sm' : 'bg-white/80 border-gray-200/60 backdrop-blur-sm';
  const txt = dark ? 'text-white' : 'text-gray-900';
  const txt2 = dark ? 'text-gray-400' : 'text-gray-500';
  const txt3 = dark ? 'text-gray-600' : 'text-gray-400';
  const inputCls = dark ? 'bg-gray-800/90 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white/90 border-gray-200 text-gray-900 placeholder:text-gray-400';
  const filteredSaved = savedFilter ? savedDrugs.filter(d => d.drugName.toLowerCase().includes(savedFilter.toLowerCase()) || d.genericName.toLowerCase().includes(savedFilter.toLowerCase())) : savedDrugs;
  const favDrugs = savedDrugs.filter(d => favs.includes(d.id));
  const curLang = AVAILABLE_LANGS.find(l => l.code === lang)!;

  return (
    <div className={`min-h-screen ${bg} transition-colors`} style={{ backgroundImage: dark ? 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.05) 0%, transparent 50%)' : 'radial-gradient(circle at 20% 50%, rgba(124,58,237,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.06) 0%, transparent 50%)' }}>
      {scanner && <MedicineScanner onDrugFound={handleDrugFound} onClose={() => setScanner(false)} dark={dark} />}

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className={`${dark ? 'bg-gray-950/90' : 'bg-white/80'} backdrop-blur-xl border-b ${dark ? 'border-gray-800' : 'border-gray-200/60'} shadow-lg`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30"><Pill className="w-5 h-5 text-white" /></div>
              <div><h1 className={`font-black text-xl tracking-tight ${txt}`}>{T('appName')}</h1><p className={`text-[10px] font-medium ${txt3}`}>{T('appSlogan')}</p></div>
            </div>
            <nav className="hidden lg:flex items-center gap-1">
              {([['home', T('home')], ['search', T('search')], ['saved', T('saved')], ['interactions', T('interactions')], ['history', T('history')], ['chat', T('ai')]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id as Tab)} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${tab === id ? 'bg-violet-600 text-white shadow-md' : `${dark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}`}>{label}</button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {/* Language Picker */}
              <div className="relative">
                <button onClick={() => setShowLangPicker(!showLangPicker)} className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all text-lg ${dark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>{curLang.flag}</button>
                {showLangPicker && (<>
                  <div className="fixed inset-0 z-50" onClick={() => setShowLangPicker(false)} />
                  <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-44 rounded-2xl border shadow-2xl z-50 overflow-hidden ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-4 py-2.5 border-b text-xs font-bold ${dark ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-600'}`}><Languages className="w-3.5 h-3.5 inline mr-1.5" />{T('language')}</div>
                    {AVAILABLE_LANGS.map(l => (
                      <button key={l.code} onClick={() => setLang(l.code)} className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left transition-colors ${lang === l.code ? (dark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-700') : (dark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-800')}`}>
                        <span className="text-lg">{l.flag}</span>
                        <span className="text-sm font-bold">{l.label}</span>
                        {lang === l.code && <span className="ml-auto text-violet-500 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </>)}
              </div>
              <button onClick={() => setDark(!dark)} className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all ${dark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
              <button onClick={() => setScanner(true)} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25 active:scale-95"><ScanLine className="w-4 h-4" />{T('scan')}</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">

        {/* HOME */}
        {tab === 'home' && (
          <div className="space-y-8">
            <div className="relative overflow-hidden rounded-[2rem] shadow-2xl">
              <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-br from-gray-900 via-violet-950 to-purple-950' : 'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700'}`} />
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
              <div className="relative z-10 p-8 sm:p-12 text-white">
                <div className="flex flex-wrap gap-2 mb-5">
                  {['🤖 Gemini AI', '🌍 FDA', '💾 Auto-Save', '🌐 16 Languages', '⚡ Interactions'].map(b => (
                    <span key={b} className="px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold backdrop-blur-sm border border-white/10">{b}</span>
                  ))}
                </div>
                <h2 className="text-4xl sm:text-6xl font-black mb-4 leading-[1.1]">
                  {T('heroTitle1')}<br />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 bg-clip-text text-transparent">{T('heroTitle2')}</span>
                </h2>
                <p className="text-white/70 text-sm sm:text-base max-w-xl leading-relaxed mb-8">{T('heroDesc')}</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setScanner(true)} className="bg-white text-violet-700 px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2.5 shadow-2xl cursor-pointer hover:bg-violet-50 active:scale-[0.97]"><Camera className="w-5 h-5" />{T('scanMedicine')}</button>
                  <button onClick={() => setTab('search')} className="bg-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2.5 backdrop-blur-sm border border-white/20 cursor-pointer hover:bg-white/20 active:scale-[0.97]"><Globe className="w-5 h-5" />{T('fdaSearch')}</button>
                  <button onClick={() => setTab('interactions')} className="bg-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2.5 backdrop-blur-sm border border-white/20 cursor-pointer hover:bg-white/20 active:scale-[0.97]"><ArrowLeftRight className="w-5 h-5" />{T('checkInteractions')}</button>
                </div>
              </div>
            </div>

            {favDrugs.length > 0 && (
              <div>
                <h3 className={`font-black text-lg mb-4 flex items-center gap-2 ${txt}`}><Heart className="w-5 h-5 text-rose-500 fill-rose-500" />{T('favorites')}</h3>
                <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x">
                  {favDrugs.map(d => (
                    <div key={d.id} className={`rounded-2xl border p-5 min-w-[220px] snap-start flex-shrink-0 ${card}`}>
                      <h4 className={`font-black text-base truncate ${txt}`}>{d.drugName}</h4>
                      <p className="text-violet-500 text-xs font-bold mt-0.5">{d.genericName}</p>
                      <p className={`text-[10px] mt-2 ${txt3}`}>{d.categoryAr}</p>
                      <div className="flex gap-2 mt-3">
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg font-bold">💵{d.estimatedPriceUSD}</span>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg font-bold">🇲🇦{d.estimatedPriceMAD}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { v: String(getDrugCount()), l: T('savedDrugs'), icon: '💾', color: 'from-violet-500 to-purple-600', click: () => setTab('saved') },
                { v: String(favDrugs.length), l: T('favorites'), icon: '❤️', color: 'from-rose-500 to-pink-600', click: () => setTab('saved') },
                { v: String(getHistory().length), l: T('history'), icon: '📋', color: 'from-blue-500 to-indigo-600', click: () => setTab('history') },
                { v: '+1M', l: T('fdaDrugs'), icon: '🌍', color: 'from-emerald-500 to-teal-600', click: () => setTab('search') },
              ].map((s, i) => (
                <button key={i} onClick={s.click} className={`rounded-2xl p-5 border text-center cursor-pointer hover:shadow-xl active:scale-[0.97] transition-all ${card}`}>
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg text-xl`}>{s.icon}</div>
                  <p className={`text-2xl font-black ${txt}`}>{s.v}</p>
                  <p className={`text-[11px] font-bold mt-1 ${txt3}`}>{s.l}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => setScanner(true)} className="relative overflow-hidden rounded-2xl p-6 text-left cursor-pointer group active:scale-[0.98] shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800" />
                <div className="relative z-10 text-white">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Camera className="w-7 h-7" /></div>
                  <h3 className="font-black text-xl mb-1">{T('aiScanner')}</h3>
                  <p className="text-white/60 text-sm">{T('aiScannerDesc')}</p>
                </div>
              </button>
              <button onClick={() => setTab('chat')} className={`rounded-2xl p-6 text-left border cursor-pointer group active:scale-[0.98] hover:shadow-xl ${card}`}>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform"><Sparkles className="w-7 h-7 text-white" /></div>
                <h3 className={`font-black text-xl mb-1 ${txt}`}>{T('aiChat')}</h3>
                <p className={`text-sm ${txt3}`}>{T('aiChatDesc')}</p>
              </button>
              <button onClick={() => setTab('interactions')} className={`rounded-2xl p-6 text-left border cursor-pointer group active:scale-[0.98] hover:shadow-xl ${card}`}>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform"><ArrowLeftRight className="w-7 h-7 text-white" /></div>
                <h3 className={`font-black text-xl mb-1 ${txt}`}>{T('interactions')}</h3>
                <p className={`text-sm ${txt3}`}>{T('interactionsDesc')}</p>
              </button>
            </div>

            <div className={`rounded-2xl p-5 border flex items-start gap-4 ${dark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50/80 border-amber-200/60'}`}>
              <Shield className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div><p className={`font-bold text-sm ${dark ? 'text-amber-400' : 'text-amber-900'}`}>{T('disclaimer')}</p><p className={`text-xs mt-1 leading-relaxed ${dark ? 'text-amber-500/80' : 'text-amber-800'}`}>{T('disclaimerText')}</p></div>
            </div>
          </div>
        )}

        {/* SEARCH */}
        {tab === 'search' && (
          <div className="space-y-6">
            <div className={`rounded-2xl p-6 border ${card}`}>
              <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Globe className="w-5 h-5 text-white" /></div><div><h2 className={`text-xl font-black ${txt}`}>{T('fdaGlobalSearch')}</h2><p className={`text-xs ${txt3}`}>{T('fdaGlobalDesc')}</p></div></div>
              <div className="flex gap-2">
                <div className="relative flex-1"><Search className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} /><input type="text" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && fdaSearch()} placeholder={T('drugName')} dir="ltr" className={`w-full border-2 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-500 ${inputCls}`} /></div>
                <button onClick={fdaSearch} disabled={fdaLoading || q.length < 2} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white px-6 rounded-2xl font-bold cursor-pointer disabled:cursor-not-allowed shadow-lg">{fdaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{['Aspirin', 'Ibuprofen', 'Metformin', 'Omeprazole', 'Atorvastatin', 'Amoxicillin'].map(d => (<button key={d} onClick={() => setQ(d)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-400'}`}>{d}</button>))}</div>
            </div>
            {fdaLoading && <div className={`rounded-2xl p-12 text-center border ${card}`}><Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" /><p className={`font-bold text-lg ${txt}`}>{T('searchingFDA')}</p></div>}
            {fdaErr && !fdaLoading && <div className={`rounded-2xl p-5 text-center border ${dark ? 'bg-amber-950/30 border-amber-900' : 'bg-amber-50 border-amber-200'}`}><p className="text-amber-600 font-medium">{fdaErr}</p></div>}
            {!fdaLoading && fdaRes.length > 0 && <div><div className="flex items-center justify-between mb-4"><p className={`font-bold ${txt2}`}>{fdaRes.length} {T('results')}</p><button onClick={fdaSearch} className="text-violet-500 text-xs font-bold flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3 h-3" />{T('refresh')}</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fdaRes.map(d => <FDADrugCard key={d.id} drug={d} dark={dark} />)}</div></div>}
          </div>
        )}

        {tab === 'interactions' && <DrugInteractionChecker dark={dark} />}

        {/* SAVED */}
        {tab === 'saved' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"><Database className="w-5 h-5 text-white" /></div><div><h2 className={`text-xl font-black ${txt}`}>{T('savedDrugs')} ({savedDrugs.length})</h2><p className={`text-xs ${txt3}`}>{T('autoSaved')}</p></div></div>
            {savedDrugs.length > 0 && <div className="relative"><Search className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} /><input type="text" value={savedFilter} onChange={e => setSavedFilter(e.target.value)} placeholder={T('filterDrugs')} dir="ltr" className={`w-full border-2 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-500 ${inputCls}`} /></div>}
            {savedDrugs.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center border ${card}`}><div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Database className="w-8 h-8 text-white" /></div><h3 className={`font-black text-lg mb-2 ${txt}`}>{T('noSavedDrugs')}</h3><p className={`text-sm mb-5 ${txt2}`}>{T('scanToSave')}</p><button onClick={() => setScanner(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold cursor-pointer inline-flex items-center gap-2 shadow-lg"><ScanLine className="w-4 h-4" />{T('scanNow')}</button></div>
            ) : (
              <div className="space-y-3">{filteredSaved.map(d => (
                <div key={d.id} className={`rounded-2xl border p-5 transition-all hover:shadow-lg ${card}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"><Pill className="w-6 h-6 text-white" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-black text-base truncate ${txt}`}>{d.drugName}</h3>
                        <p className="text-violet-500 text-xs font-bold">{d.genericName}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg text-[10px] font-bold">{d.categoryAr}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold">💵{d.estimatedPriceUSD}</span>
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-bold">🇲🇦{d.estimatedPriceMAD}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => toggleFav(d.id)} className={`p-2 rounded-xl cursor-pointer ${favs.includes(d.id) ? 'text-rose-500' : `${txt3} hover:text-rose-500`}`}><Heart className={`w-4 h-4 ${favs.includes(d.id) ? 'fill-current' : ''}`} /></button>
                      <button onClick={() => shareDrug(d)} className={`p-2 rounded-xl cursor-pointer ${txt3} hover:text-blue-500`}><Share2 className="w-4 h-4" /></button>
                      <button onClick={() => { deleteDrug(d.id); setSavedDrugs(getAllDrugs()); }} className={`p-2 rounded-xl cursor-pointer ${txt3} hover:text-red-500`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className={`text-sm mt-3 leading-relaxed line-clamp-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{d.descriptionAr}</p>
                  <p className={`text-[10px] mt-2 ${txt3}`}>{T('accessed')} {d.timesAccessed}{T('times')} • {new Date(d.savedAt).toLocaleDateString()}</p>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Clock className="w-5 h-5 text-white" /></div><div><h2 className={`text-xl font-black ${txt}`}>{T('history')} ({history.length})</h2><p className={`text-xs ${txt3}`}>{T('activityLog')}</p></div></div>
              {history.length > 0 && <button onClick={() => { clearHistory(); setHistory([]); }} className="text-red-500 text-xs font-bold cursor-pointer flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg"><Trash2 className="w-3 h-3" />{T('clearAll')}</button>}
            </div>
            {history.length === 0 ? (
              <div className={`rounded-2xl p-12 text-center border ${card}`}><Clock className={`w-12 h-12 mx-auto mb-3 ${txt3}`} /><h3 className={`font-bold mb-2 ${txt}`}>{T('noHistory')}</h3><p className={`text-sm ${txt2}`}>{T('historyDesc')}</p></div>
            ) : (
              <div className="space-y-2">{history.map(h => (
                <div key={h.id} className={`rounded-2xl border p-4 flex items-center gap-4 ${card}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${h.source === 'scan' ? 'bg-gradient-to-br from-violet-500 to-purple-600' : h.source === 'cache' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'} shadow-md`}>
                    {h.source === 'scan' ? <Camera className="w-4 h-4 text-white" /> : h.source === 'cache' ? <Database className="w-4 h-4 text-white" /> : <Search className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0"><h4 className={`font-bold text-sm truncate ${txt}`}>{h.drugName}</h4><p className={`text-[11px] ${txt3}`}>{h.genericName} {h.categoryAr && `• ${h.categoryAr}`}</p></div>
                  <div className={`text-${isRTL ? 'left' : 'right'} flex-shrink-0`}><p className={`text-[10px] font-bold ${h.source === 'scan' ? 'text-violet-500' : h.source === 'cache' ? 'text-blue-500' : 'text-emerald-500'}`}>{h.source === 'scan' ? '📷' : h.source === 'cache' ? '💾' : '🔍'}</p><p className={`text-[9px] ${txt3}`}>{new Date(h.timestamp).toLocaleDateString()}</p></div>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {tab === 'chat' && <div className="h-[calc(100vh-8rem)] sm:h-[calc(100vh-7rem)]"><AIChat dark={dark} /></div>}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className={`backdrop-blur-xl border-t safe-pb shadow-2xl ${dark ? 'bg-gray-950/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
          <div className="flex items-center justify-around py-2">
            <button onClick={() => setTab('home')} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl cursor-pointer ${tab === 'home' ? 'text-violet-600 dark:text-violet-400' : txt3}`}><span className="text-lg">🏠</span><span className="text-[9px] font-bold">{T('home')}</span></button>
            <button onClick={() => setTab('search')} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl cursor-pointer ${tab === 'search' ? 'text-violet-600 dark:text-violet-400' : txt3}`}><span className="text-lg">🔍</span><span className="text-[9px] font-bold">{T('search')}</span></button>
            <button onClick={() => setScanner(true)} className="flex flex-col items-center gap-0.5 cursor-pointer -mt-6">
              <div className={`w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/40 border-4 ${dark ? 'border-gray-950' : 'border-white'}`}><ScanLine className="w-7 h-7 text-white" /></div>
              <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 mt-1">{T('scan')}</span>
            </button>
            <button onClick={() => setTab('interactions')} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl cursor-pointer ${tab === 'interactions' ? 'text-violet-600 dark:text-violet-400' : txt3}`}><span className="text-lg">⚡</span><span className="text-[9px] font-bold">{T('interactions')}</span></button>
            <button onClick={() => setTab('chat')} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl cursor-pointer ${tab === 'chat' ? 'text-violet-600 dark:text-violet-400' : txt3}`}><span className="text-lg">🤖</span><span className="text-[9px] font-bold">{T('ai')}</span></button>
          </div>
        </div>
      </nav>
    </div>
  );
}
