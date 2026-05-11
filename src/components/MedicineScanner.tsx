import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Loader2, Search, Pill, ScanLine, CheckCircle2, Zap, RotateCcw, Brain, AlertTriangle, ShieldCheck, Key, Sparkles, Database, Save, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { searchDrugs, type OpenFDADrug } from '../services/drugApi';
import { analyzeImageWithGemini, getStoredApiKey, setStoredApiKey, type GeminiDrugResult } from '../services/geminiAI';
import { saveDrug, findDrug, getDrugCount, addHistory, type SavedDrug } from '../services/drugCache';
import TranslateBar from './TranslateBar';

interface Props { onDrugFound: (drug: OpenFDADrug) => void; onClose: () => void; dark?: boolean; }

type State = 'idle' | 'analyzing' | 'searching' | 'done-fda' | 'done-ai' | 'done-cache' | 'need-key' | 'error';

export default function MedicineScanner({ onDrugFound, onClose, dark }: Props) {
  const [input, setInput] = useState<'upload' | 'camera' | 'text'>('upload');
  const [state, setState] = useState<State>('idle');
  const [query, setQuery] = useState('');
  const [, setStatus] = useState('');
  const [step, setStep] = useState(0);
  const [fdaResults, setFdaResults] = useState<OpenFDADrug[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [ai, setAi] = useState<GeminiDrugResult | null>(null);
  const [cached, setCached] = useState<SavedDrug | null>(null);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKeyState] = useState(() => getStoredApiKey());
  const [keyIn, setKeyIn] = useState(() => getStoredApiKey());
  const [details, setDetails] = useState(true);
  const [translated, setTranslated] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const canRef = useRef<HTMLCanvasElement>(null);
  const strmRef = useRef<MediaStream | null>(null);

  const card = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const txt = dark ? 'text-gray-100' : 'text-gray-900';
  const txt2 = dark ? 'text-gray-400' : 'text-gray-500';
  const txt3 = dark ? 'text-gray-500' : 'text-gray-400';
  const inpCls = dark ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400';

  // ═══ Camera ═══
  const stopCam = useCallback(() => { strmRef.current?.getTracks().forEach(t => t.stop()); strmRef.current = null; setCamOn(false); }, []);
  useEffect(() => () => stopCam(), [stopCam]);

  const openCam = async () => {
    stopCam(); setCamOn(false); setErr('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      strmRef.current = s;
      const attach = () => {
        const v = vidRef.current;
        if (!v || !strmRef.current) { setTimeout(attach, 150); return; }
        v.srcObject = strmRef.current;
        v.muted = true;
        v.setAttribute('playsinline', 'true');
        const p = v.play();
        if (p) p.then(() => setCamOn(true)).catch(() => setTimeout(() => {
          v.play().then(() => setCamOn(true)).catch(() => setErr('Camera play failed. Try uploading a photo.'));
        }, 400));
      };
      setTimeout(attach, 200);
    } catch {
      setErr('Cannot access camera. Check permissions or use HTTPS.');
    }
  };

  // ═══ Mode Switch ═══
  const switchInput = (m: typeof input) => {
    stopCam(); setInput(m); setErr(''); setFdaResults([]); setPreview(null);
    setState('idle'); setAi(null); setCached(null); setSaved(false); setStep(0); setTranslated(null);
    if (m === 'camera') openCam();
  };

  // ═══ Analyze Image ═══
  const analyze = async (img: string) => {
    const k = apiKey || getStoredApiKey();
    if (!k) { setState('need-key'); return; }

    setState('analyzing'); setStep(1); setAi(null); setCached(null);
    setFdaResults([]); setErr(''); setSaved(false); setTranslated(null);
    await new Promise(r => setTimeout(r, 300));

    setStep(2); setStatus('Gemini AI analyzing...');
    const res = await analyzeImageWithGemini(img, k);
    if (!res.success || !res.data) { setErr(res.error || 'Analysis failed'); setState('error'); return; }

    const data = res.data;
    setAi(data);

    // Check local DB
    const local = findDrug(data.drugName) || findDrug(data.genericName);
    if (local) { setCached(local); addHistory(local.drugName, local.genericName, local.categoryAr, 'cache'); setState('done-cache'); return; }

    // FDA
    setStep(3);
    for (const n of [data.drugName, data.genericName].filter(Boolean)) {
      try {
        const f = await searchDrugs(n, 8);
        if (f.drugs.length > 0) {
          setFdaResults(f.drugs); saveDrug(data); setSaved(true);
          addHistory(data.drugName, data.genericName, data.categoryAr, 'scan');
          setState('done-fda'); return;
        }
      } catch { /* next */ }
    }

    // No FDA → save AI
    saveDrug(data); setSaved(true);
    addHistory(data.drugName, data.genericName, data.categoryAr, 'scan');
    setState('done-ai');
  };

  // ═══ Manual Search ═══
  const manualSearch = async () => {
    const name = query.trim();
    if (!name) return;

    setState('searching'); setFdaResults([]); setCached(null); setAi(null); setSaved(false); setTranslated(null);

    // 1. Check local cache
    const local = findDrug(name);
    if (local) { setCached(local); addHistory(local.drugName, local.genericName, local.categoryAr, 'cache'); setState('done-cache'); return; }

    // 2. Search FDA
    try {
      const r = await searchDrugs(name, 10);
      if (r.drugs.length > 0) { setFdaResults(r.drugs); addHistory(name, '', '', 'search'); setState('done-fda'); return; }
    } catch { /* continue */ }

    // 3. If has API key → ask Gemini as text
    const k = apiKey || getStoredApiKey();
    if (k) {
      setState('analyzing'); setStep(2);
      try {
        const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
        const prompt = `You are a pharmaceutical expert. Give me detailed information about the drug "${name}".
Return ONLY valid JSON:
{"drugName":"${name}","genericName":"generic","manufacturer":"","dosageForm":"","strength":"","category":"","categoryAr":"","descriptionEn":"2-3 sentences","descriptionAr":"2-3 sentences Arabic","usesEn":["use1"],"usesAr":["استخدام1"],"sideEffectsEn":["effect1"],"sideEffectsAr":["عرض1"],"warningsEn":["warn1"],"warningsAr":["تحذير1"],"dosageEn":"dosage info","dosageAr":"معلومات الجرعة","estimatedPriceUSD":"$X-$Y","estimatedPriceMAD":"X-Y درهم","confidence":"medium"}`;
        const res = await fetch(`${GEMINI}?key=${k}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } })
        });
        const json = await res.json();
        let text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        const parsed: GeminiDrugResult = JSON.parse(text);
        setAi(parsed); saveDrug(parsed); setSaved(true);
        addHistory(parsed.drugName, parsed.genericName, parsed.categoryAr, 'search');
        setState('done-ai'); return;
      } catch { /* fall through */ }
    }

    setErr(`"${name}" not found. Try a different name.`); setState('error');
  };

  // ═══ Handlers ═══
  const capture = () => {
    const v = vidRef.current, c = canRef.current;
    if (!v || !c || !v.videoWidth) { setErr('Camera not ready yet'); return; }
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const u = c.toDataURL('image/jpeg', 0.85);
    setPreview(u); stopCam(); analyze(u);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    const r = new FileReader();
    r.onload = ev => { const u = ev.target?.result as string; setPreview(u); analyze(u); };
    r.readAsDataURL(f);
  };

  const saveKey = () => { if (keyIn.trim()) { setApiKeyState(keyIn.trim()); setStoredApiKey(keyIn.trim()); setState('idle'); } };
  const reset = () => { setState('idle'); setPreview(null); setFdaResults([]); setErr(''); setAi(null); setCached(null); setSaved(false); setStep(0); setTranslated(null); if (input === 'camera') openCam(); };
  const close = () => { stopCam(); onClose(); };

  // ═══ Build text for translation ═══
  const buildTransText = (drug: GeminiDrugResult) => [
    `Drug: ${drug.drugName} (${drug.genericName})`,
    `Category: ${drug.category}`,
    `Description: ${drug.descriptionEn}`,
    `Uses: ${drug.usesEn.join(', ')}`,
    `Dosage: ${drug.dosageEn}`,
    `Side Effects: ${drug.sideEffectsEn.join(', ')}`,
    `Warnings: ${drug.warningsEn.join(', ')}`,
    `Price: ${drug.estimatedPriceUSD} / ${drug.estimatedPriceMAD}`,
  ].join('\n\n');

  // ═══ Render Drug Info ═══
  const renderDrug = (drug: GeminiDrugResult, fromCache: boolean) => (
    <div className="space-y-3">
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        {/* Header bar */}
        <div className={`px-4 py-2.5 flex items-center justify-between border-b ${dark ? 'border-gray-700' : 'border-gray-100'} ${fromCache ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
          <div className="flex items-center gap-2">
            {fromCache ? <Database className="w-4 h-4 text-blue-500" /> : <Brain className="w-4 h-4 text-violet-500" />}
            <span className={`text-xs font-bold ${txt2}`}>{fromCache ? 'From Saved' : 'Gemini AI'}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${drug.confidence === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : drug.confidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {drug.confidence === 'high' ? '✓ High' : drug.confidence === 'medium' ? '~ Medium' : '! Low'}
          </span>
        </div>

        {/* Drug info */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0"><Pill className="w-6 h-6 text-white" /></div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-black text-lg truncate ${txt}`}>{drug.drugName}</h3>
              <p className="text-violet-500 text-xs font-bold">{drug.genericName}</p>
              <p className={`text-[10px] mt-0.5 ${txt3}`}>{drug.manufacturer} • {drug.dosageForm} {drug.strength}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-lg text-[11px] font-bold">{drug.categoryAr}</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-[11px] font-bold">💵 {drug.estimatedPriceUSD}</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg text-[11px] font-bold">🇲🇦 {drug.estimatedPriceMAD}</span>
          </div>
          <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{drug.descriptionAr}</p>
          <p className={`text-xs mt-1 italic ${txt3}`} dir="ltr">{drug.descriptionEn}</p>
        </div>

        {/* 🌐 TRANSLATE BUTTON — clearly visible */}
        <div className={`px-4 py-3 border-t ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
          <TranslateBar text={buildTransText(drug)} onResult={setTranslated} dark={dark} />
        </div>

        {/* Translated result */}
        {translated && (
          <div className={`px-4 py-4 border-t ${dark ? 'border-violet-800 bg-violet-900/20' : 'border-violet-200 bg-violet-50'}`}>
            <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mb-2">🌐 Translated:</p>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{translated}</p>
          </div>
        )}

        {/* Expand/Collapse */}
        <button onClick={() => setDetails(!details)} className={`w-full px-4 py-2.5 border-t flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${dark ? 'border-gray-700 text-gray-400 hover:bg-gray-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
          {details ? <><ChevronUp className="w-3.5 h-3.5" />Hide Details</> : <><ChevronDown className="w-3.5 h-3.5" />Show Details</>}
        </button>

        {details && (
          <div className={`px-4 pb-4 space-y-3 border-t pt-3 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div><p className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${txt3}`}><Star className="w-3 h-3" />Uses</p>
              <div className="flex flex-wrap gap-1.5">{drug.usesAr.map((u, i) => <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-[11px] font-semibold">{u}</span>)}</div>
            </div>
            <div><p className={`text-[11px] font-bold mb-1 flex items-center gap-1 ${txt3}`}><Clock className="w-3 h-3" />Dosage</p>
              <p className={`text-sm p-3 rounded-xl ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>{drug.dosageAr}</p>
            </div>
            {drug.sideEffectsAr.length > 0 && <div><p className={`text-[11px] font-bold mb-1.5 flex items-center gap-1 ${txt3}`}><AlertTriangle className="w-3 h-3" />Side Effects</p>
              <div className="flex flex-wrap gap-1.5">{drug.sideEffectsAr.map((s, i) => <span key={i} className="px-2 py-1 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded-lg text-[11px]">{s}</span>)}</div>
            </div>}
            {drug.warningsAr.length > 0 && <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <p className="text-[11px] font-bold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Warnings</p>
              <ul className="space-y-1">{drug.warningsAr.map((w, i) => <li key={i} className="text-red-600 dark:text-red-400 text-xs flex items-start gap-1.5"><span className="mt-0.5 text-[8px]">●</span>{w}</li>)}</ul>
            </div>}
          </div>
        )}
      </div>
      {saved && <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
        <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">✅ Saved — won't use AI again for this drug</p>
      </div>}
    </div>
  );

  const cnt = getDrugCount();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center">
      <div className={`${dark ? 'bg-gray-900' : 'bg-[#f8f9fb]'} rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-[480px] max-h-[96vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl sm:m-4`}>

        {/* Header */}
        <div className="relative bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 px-5 pt-5 pb-4 text-white flex-shrink-0">
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20"><Sparkles className="w-5 h-5" /></div>
              <div><h2 className="font-black text-lg">Drug Scanner</h2><p className="text-purple-200 text-[11px]">AI + FDA + Local DB</p></div>
            </div>
            <button onClick={close} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer"><X className="w-5 h-5" /></button>
          </div>

          {['idle', 'need-key'].includes(state) && (
            <div className="flex bg-white/10 rounded-2xl p-1 gap-0.5">
              {(['upload', 'camera', 'text'] as const).map(id => (
                <button key={id} onClick={() => switchInput(id)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-xl cursor-pointer ${input === id ? 'bg-white text-violet-700 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  {id === 'upload' ? '📷 Photo' : id === 'camera' ? '🎥 Camera' : '⌨️ Search'}
                </button>
              ))}
            </div>
          )}
          {cnt > 0 && state === 'idle' && <div className="mt-2 flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1 w-fit"><Database className="w-3 h-3 text-emerald-300" /><span className="text-[10px] font-bold text-emerald-200">{cnt} saved</span></div>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

          {/* API KEY */}
          {state === 'need-key' && (
            <div className="space-y-3">
              <div className="text-center py-2"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${dark ? 'bg-violet-900/30' : 'bg-violet-100'}`}><Key className="w-7 h-7 text-violet-600 dark:text-violet-400" /></div><h3 className={`font-black ${txt}`}>Gemini API Key</h3><p className={`text-xs mt-1 ${txt2}`}>One-time setup — 100% free</p></div>
              <input type="text" value={keyIn} onChange={e => setKeyIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()} placeholder="AIzaSy..." dir="ltr" className={`w-full border-2 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 font-mono ${inpCls}`} />
              <button onClick={saveKey} disabled={!keyIn.trim()} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-3.5 rounded-2xl font-black cursor-pointer disabled:cursor-not-allowed">Save Key</button>
              <div className={`rounded-2xl p-4 border ${card}`}><p className={`text-xs font-bold mb-2 ${txt}`}>How to get free key:</p><ol className={`text-[11px] space-y-1 list-decimal pl-5 ${txt2}`}><li>Go to <b className="text-violet-500">aistudio.google.com</b></li><li>Sign in with Google</li><li>Get API Key → Create</li><li>Paste above</li></ol></div>
              <button onClick={() => { setInput('text'); setState('idle'); }} className={`w-full text-center text-xs font-bold cursor-pointer ${txt3}`}>Search without AI →</button>
            </div>
          )}

          {/* IDLE */}
          {state === 'idle' && (<>
            {/* Upload */}
            {input === 'upload' && (<>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer group active:scale-[0.98] ${dark ? 'border-gray-600 hover:border-violet-500 hover:bg-violet-900/10' : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/30'}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dark ? 'bg-violet-900/30' : 'bg-violet-100'}`}><Upload className="w-7 h-7 text-violet-500" /></div>
                <div className="text-center"><p className={`font-black ${txt}`}>Upload Medicine Photo</p><p className={`text-xs mt-1 ${txt3}`}>AI analyzes → saves → translatable</p></div>
              </button>
            </>)}

            {/* Camera */}
            {input === 'camera' && (<>
              <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3]">
                <video ref={vidRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canRef} className="hidden" />
                {!camOn && !err && <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /><p className="text-xs">Starting camera...</p></div>}
                {err && <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-6 text-center"><Camera className="w-8 h-8 text-red-400" /><p className="text-xs">{err}</p><button onClick={() => switchInput('upload')} className="bg-violet-600 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Upload instead</button></div>}
                {camOn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[72%] h-24 border-2 border-white/40 rounded-xl relative"><div className="absolute top-1/2 inset-x-0 h-[1px] bg-emerald-400/50 animate-pulse" /></div></div>}
              </div>
              <button onClick={capture} disabled={!camOn} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"><Camera className="w-5 h-5" />Capture & Analyze</button>
            </>)}

            {/* Manual Search */}
            {input === 'text' && (
              <div className="space-y-3">
                <div className="relative">
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && manualSearch()} placeholder="e.g. Paracetamol, Aspirin, Doliprane..." dir="ltr" className={`w-full border-2 rounded-2xl pr-4 pl-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 font-medium ${inpCls}`} />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <button onClick={manualSearch} disabled={!query.trim()} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-3.5 rounded-2xl font-black cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"><Search className="w-5 h-5" />Search (FDA + AI)</button>
                <div className="flex flex-wrap gap-1.5">
                  {['Paracetamol', 'Aspirin', 'Ibuprofen', 'Amoxicillin', 'Omeprazole', 'Metformin', 'Doliprane', 'Augmentin'].map(d => (
                    <button key={d} onClick={() => setQuery(d)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-500' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-400'}`}>{d}</button>
                  ))}
                </div>
              </div>
            )}
          </>)}

          {/* Preview */}
          {preview && !['idle', 'need-key'].includes(state) && (
            <div className="relative rounded-2xl overflow-hidden"><img src={preview} alt="" className="w-full h-36 object-contain bg-gray-100 dark:bg-gray-800" /><button onClick={reset} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-gray-700 rounded-xl cursor-pointer shadow"><RotateCcw className="w-4 h-4" /></button></div>
          )}

          {/* Steps */}
          {state === 'analyzing' && (
            <div className={`rounded-2xl border p-5 ${card}`}>
              {[{ s: 1, t: 'Checking saved drugs', i: Database }, { s: 2, t: 'Gemini AI analyzing', i: Brain }, { s: 3, t: 'Searching FDA', i: ScanLine }].map(({ s, t, i: I }) => (
                <div key={s} className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${step === s ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800' : step > s ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : `border ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}`}>
                  {step === s ? <Loader2 className="w-5 h-5 text-violet-600 dark:text-violet-400 animate-spin" /> : step > s ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <I className={`w-5 h-5 ${txt3}`} />}
                  <span className={`text-sm font-bold ${step === s ? 'text-violet-700 dark:text-violet-400' : step > s ? 'text-emerald-700 dark:text-emerald-400' : txt3}`}>{t}</span>
                </div>
              ))}
            </div>
          )}

          {state === 'searching' && <div className={`rounded-2xl border p-6 text-center ${card}`}><Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto mb-2" /><p className={`font-bold text-sm ${txt}`}>Searching...</p></div>}

          {/* Error */}
          {err && state === 'error' && (
            <div className={`rounded-2xl border-2 p-4 ${dark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{err}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={reset} className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1 ${dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}><RotateCcw className="w-3.5 h-3.5" />Retry</button>
                <button onClick={() => { setInput('text'); setState('idle'); }} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer">Manual Search</button>
              </div>
            </div>
          )}

          {/* Results */}
          {cached && state === 'done-cache' && renderDrug(cached, true)}
          {ai && state === 'done-ai' && renderDrug(ai, false)}
          {fdaResults.length > 0 && state === 'done-fda' && (
            <div className="space-y-3">
              {ai && <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2"><Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold flex-1">{ai.drugName} ({ai.genericName})</p>{saved && <Save className="w-3.5 h-3.5 text-emerald-500" />}</div>}
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><h3 className={`font-black text-sm ${txt}`}>FDA Results ({fdaResults.length})</h3></div>
              <div className="space-y-2">{fdaResults.map(drug => (
                <button key={drug.id} onClick={() => { onDrugFound(drug); stopCam(); onClose(); }} className={`w-full border-2 rounded-2xl p-3.5 text-right cursor-pointer group active:scale-[0.98] ${dark ? 'bg-gray-800 border-gray-700 hover:border-violet-600' : 'bg-white border-gray-100 hover:border-violet-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${dark ? 'bg-violet-900/30' : 'bg-violet-100'}`}><Pill className="w-5 h-5 text-violet-600 dark:text-violet-400" /></div>
                    <div className="flex-1 min-w-0"><h4 className={`font-bold text-sm truncate ${txt}`}>{drug.brandName}</h4><p className={`text-[11px] ${txt3}`}>{drug.genericName}</p></div>
                    <div className="text-left flex-shrink-0"><p className="text-[10px] text-emerald-600 font-bold">💵{drug.priceUSD}</p><p className="text-[10px] text-amber-600 font-bold">🇲🇦{drug.priceMAD}</p></div>
                  </div>
                </button>
              ))}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
          <p className={`text-[10px] flex items-center gap-1 ${txt3}`}><Zap className="w-3 h-3 text-violet-400" />AI + FDA + Translate</p>
          <div className="flex items-center gap-3">{cnt > 0 && <span className={`text-[10px] font-bold ${txt3}`}>{cnt} saved</span>}{apiKey && <button onClick={() => setState('need-key')} className={`cursor-pointer ${txt3} hover:text-violet-500`}><Key className="w-3.5 h-3.5" /></button>}</div>
        </div>
      </div>
    </div>
  );
}
