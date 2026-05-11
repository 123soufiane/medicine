import { useState } from 'react';
import { ArrowLeftRight, Loader2, Pill, Shield, Sparkles } from 'lucide-react';
import { getStoredApiKey } from '../services/geminiAI';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface Interaction {
  severity: 'high' | 'moderate' | 'low' | 'none';
  summary: string;
  summaryAr: string;
  details: string;
  detailsAr: string;
  recommendations: string[];
  recommendationsAr: string[];
}

export default function DrugInteractionChecker({ dark }: { dark?: boolean }) {
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Interaction | null>(null);
  const [err, setErr] = useState('');

  const check = async () => {
    if (!drug1.trim() || !drug2.trim()) return;
    const key = getStoredApiKey();
    if (!key) { setErr('Please set your Gemini API key first (use Scan feature).'); return; }
    setLoading(true); setResult(null); setErr('');
    try {
      const prompt = `You are a pharmacist. Check drug interaction between "${drug1}" and "${drug2}".
Return ONLY valid JSON — no markdown, no backticks:
{"severity":"high/moderate/low/none","summary":"one line English","summaryAr":"one line Arabic","details":"2-3 sentences English","detailsAr":"2-3 sentences Arabic","recommendations":["rec1","rec2"],"recommendationsAr":["توصية1","توصية2"]}`;

      const res = await fetch(`${GEMINI}?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      let text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      setResult(JSON.parse(text));
    } catch (e) { setErr('Analysis failed. Check API key or try again.'); }
    setLoading(false);
  };

  const sevColor = (s: string) => s === 'high' ? 'bg-red-500' : s === 'moderate' ? 'bg-amber-500' : s === 'low' ? 'bg-yellow-400' : 'bg-emerald-500';
  const sevText = (s: string) => s === 'high' ? 'High Risk ⚠️' : s === 'moderate' ? 'Moderate Risk' : s === 'low' ? 'Low Risk' : 'No Interaction ✓';
  const sevBg = (s: string) => s === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : s === 'moderate' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : s === 'low' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';

  const inputCls = dark ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400';
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const txt = dark ? 'text-gray-100' : 'text-gray-900';
  const txt2 = dark ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${card}`}>
        <div className="flex items-center gap-2 mb-4">
          <ArrowLeftRight className="w-5 h-5 text-violet-500" />
          <h2 className={`text-lg font-black ${txt}`}>Drug Interaction Checker</h2>
        </div>
        <p className={`text-xs mb-4 ${txt2}`}>Check if two drugs can be taken together safely</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input type="text" value={drug1} onChange={e => setDrug1(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="First drug (e.g. Aspirin)" dir="ltr"
              className={`w-full border-2 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 ${inputCls}`} />
          </div>
          <div className="flex items-center justify-center"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}><ArrowLeftRight className="w-4 h-4 text-violet-500" /></div></div>
          <div className="flex-1 relative">
            <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input type="text" value={drug2} onChange={e => setDrug2(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="Second drug (e.g. Ibuprofen)" dir="ltr"
              className={`w-full border-2 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-500 ${inputCls}`} />
          </div>
        </div>

        <button onClick={check} disabled={!drug1.trim() || !drug2.trim() || loading}
          className="w-full mt-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-all active:scale-[0.98]">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</> : <><Sparkles className="w-5 h-5" />Check Interaction</>}
        </button>
      </div>

      {err && <div className={`rounded-xl border-2 p-4 ${dark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}><p className="text-red-600 dark:text-red-400 text-sm font-medium">{err}</p></div>}

      {result && (
        <div className={`rounded-2xl border-2 p-5 ${sevBg(result.severity)}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-4 h-4 rounded-full ${sevColor(result.severity)}`} />
            <h3 className={`font-black text-lg ${txt}`}>{sevText(result.severity)}</h3>
          </div>

          <div className={`rounded-xl p-4 mb-4 ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-xl text-sm font-bold">{drug1}</span>
              <ArrowLeftRight className="w-4 h-4 text-gray-400" />
              <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-bold">{drug2}</span>
            </div>
            <p className={`text-sm font-bold mb-1 ${txt}`}>{result.summary}</p>
            <p className={`text-sm ${txt2}`}>{result.summaryAr}</p>
          </div>

          <div className="mb-4">
            <p className={`text-sm leading-relaxed ${txt2}`}>{result.detailsAr}</p>
            <p className={`text-xs mt-1 italic ${dark ? 'text-gray-500' : 'text-gray-400'}`} dir="ltr">{result.details}</p>
          </div>

          {result.recommendationsAr.length > 0 && (
            <div>
              <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${txt}`}><Shield className="w-3 h-3" />Recommendations</p>
              <ul className="space-y-1.5">
                {result.recommendationsAr.map((r, i) => (
                  <li key={i} className={`text-sm flex items-start gap-2 ${txt2}`}><span className="text-violet-500 mt-1 text-[8px]">●</span>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
