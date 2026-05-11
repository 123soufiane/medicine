import { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Sparkles, AlertTriangle, Zap, Key, Brain } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/geminiAI';
import { findDrug } from '../services/drugCache';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface Message { id: number; role: 'user' | 'model'; content: string; }

const SYSTEM_PROMPT = `You are DawaOuk AI — a professional pharmaceutical assistant. You help users with drug information, dosage, side effects, interactions, and general medical questions about medications.

Rules:
- Always answer in the SAME LANGUAGE the user writes in (Arabic, English, French, etc.)
- Be accurate, concise, and helpful
- Include drug prices in USD ($) and MAD (Moroccan Dirham) when relevant
- Always add a disclaimer that users should consult their doctor
- Use markdown formatting: ## for headers, **bold**, • for lists
- If asked about drug interactions, warn clearly about risks
- You can discuss symptoms and suggest what type of medication might help, but always recommend seeing a doctor`;

export default function AIChat({ dark }: { dark?: boolean }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [keyInput, setKeyInput] = useState('');
  const [history, setHistory] = useState<Array<{ role: string; parts: Array<{ text: string }> }>>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const send = async (text?: string) => {
    const t = text || inp.trim();
    if (!t || loading) return;

    const key = apiKey || getStoredApiKey();
    if (!key) return;

    // Add user message
    const userMsg: Message = { id: Date.now(), role: 'user', content: t };
    setMsgs(p => [...p, userMsg]);
    setInp('');
    setLoading(true);

    // Check local DB first for quick info
    const local = findDrug(t);
    let localContext = '';
    if (local) {
      localContext = `\n\n[LOCAL DB INFO: ${local.drugName} (${local.genericName}) - ${local.categoryAr} - ${local.descriptionEn} - Uses: ${local.usesEn.join(', ')} - Side Effects: ${local.sideEffectsEn.join(', ')} - Price: ${local.estimatedPriceUSD} / ${local.estimatedPriceMAD}]`;
    }

    // Build conversation history for Gemini
    const newHistory = [
      ...history,
      { role: 'user', parts: [{ text: t + localContext }] }
    ];

    try {
      const res = await fetch(`${GEMINI}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newHistory,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let errMsg = 'Connection error. Try again.';
        if (res.status === 429) errMsg = '⚠️ Rate limit reached. Wait a moment and try again.';
        else if (res.status === 400 || res.status === 403) errMsg = '⚠️ Invalid API key. Please update it.';
        else if (errData?.error?.message) errMsg = errData.error.message;
        setMsgs(p => [...p, { id: Date.now() + 1, role: 'model', content: `## ⚠️ Error\n\n${errMsg}` }]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';

      setMsgs(p => [...p, { id: Date.now() + 1, role: 'model', content: reply }]);

      // Update conversation history
      setHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: reply }] }
      ]);
    } catch {
      setMsgs(p => [...p, { id: Date.now() + 1, role: 'model', content: '## ⚠️ Error\n\nConnection failed. Check your internet.' }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const saveKey = () => {
    if (keyInput.trim()) {
      setApiKey(keyInput.trim());
      setStoredApiKey(keyInput.trim());
      setKeyInput('');
    }
  };

  const clearChat = () => { setMsgs([]); setHistory([]); };

  // Format markdown-like text
  const fmt = (c: string) => c.split('\n').map((l, i) => {
    if (l.startsWith('## ')) return <h2 key={i} className="text-base font-black text-violet-600 dark:text-violet-400 mb-2 mt-1">{l.slice(3)}</h2>;
    if (l.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1 mt-2">{l.slice(4)}</h3>;
    if (l.startsWith('**') && l.endsWith('**')) return <p key={i} className={`font-bold text-sm mb-1 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{l.replace(/\*\*/g, '')}</p>;
    if (l.includes('**')) {
      const parts = l.split(/\*\*(.*?)\*\*/g);
      return <p key={i} className="mb-1 text-sm leading-relaxed">{parts.map((s, j) => j % 2 ? <strong key={j} className={dark ? 'text-gray-200' : 'text-gray-900'}>{s}</strong> : <span key={j} className={dark ? 'text-gray-400' : 'text-gray-600'}>{s}</span>)}</p>;
    }
    if (/^[•\-\*]\s/.test(l)) return <div key={i} className="flex items-start gap-2 mb-1 ml-1"><span className="text-violet-500 mt-1.5 text-[8px] flex-shrink-0">●</span><span className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{l.replace(/^[•\-\*]\s/, '')}</span></div>;
    if (/^\d+\.\s/.test(l)) return <div key={i} className={`text-sm mb-1 ml-1 leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{l}</div>;
    if (l.startsWith('---')) return <hr key={i} className="my-3 border-gray-200 dark:border-gray-700" />;
    if (l.startsWith('> ')) return <blockquote key={i} className={`text-sm italic border-l-3 pl-3 my-1 ${dark ? 'border-violet-600 text-gray-400' : 'border-violet-300 text-gray-500'}`}>{l.slice(2)}</blockquote>;
    if (!l.trim()) return <div key={i} className="h-1.5" />;
    return <p key={i} className={`text-sm mb-1 leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{l}</p>;
  });

  const bg = dark ? 'bg-gray-900' : 'bg-white';
  const bg2 = dark ? 'bg-gray-800' : 'bg-gray-50';

  // No API key state
  if (!apiKey) {
    return (
      <div className={`flex flex-col h-full ${bg} rounded-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'} items-center justify-center p-8`}>
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${dark ? 'bg-violet-900/30' : 'bg-violet-100'}`}>
          <Brain className="w-10 h-10 text-violet-500" />
        </div>
        <h2 className={`font-black text-2xl mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Gemini AI Chat</h2>
        <p className={`text-sm mb-6 text-center max-w-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Enter your free Gemini API key to start chatting with the AI about any medication.
        </p>
        <div className="w-full max-w-sm space-y-3">
          <input type="text" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveKey()}
            placeholder="AIzaSy..." dir="ltr"
            className={`w-full border-2 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-violet-500 font-mono ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
          <button onClick={saveKey} disabled={!keyInput.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black cursor-pointer disabled:cursor-not-allowed shadow-lg">
            Start Chatting
          </button>
          <div className={`rounded-xl p-4 border ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs font-bold mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>🔑 Free API key:</p>
            <ol className={`text-[11px] space-y-0.5 list-decimal pl-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              <li>Go to <b className="text-violet-500">aistudio.google.com</b></li>
              <li>Sign in → Get API Key → Create</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${bg} rounded-2xl overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base">Gemini AI Chat</h2>
              <p className="text-purple-200 text-[10px] flex items-center gap-1"><Zap className="w-3 h-3" />Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {msgs.length > 0 && (
              <button onClick={clearChat} className="text-[10px] font-bold text-white/60 hover:text-white cursor-pointer bg-white/10 px-3 py-1.5 rounded-lg">Clear</button>
            )}
            <button onClick={() => { setApiKey(''); setStoredApiKey(''); }} className="text-white/40 hover:text-white cursor-pointer"><Key className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Welcome or Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 ${bg2}`}>
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-violet-900/30' : 'bg-violet-100'}`}>
              <Sparkles className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className={`font-black text-lg mb-2 ${dark ? 'text-white' : 'text-gray-900'}`}>Ask me anything about drugs</h3>
            <p className={`text-sm mb-6 max-w-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>I can help with drug info, dosage, side effects, interactions, and more. I speak your language!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'What is Paracetamol used for?',
                'ما هي أعراض الأسبرين الجانبية؟',
                'Interaction between Aspirin and Ibuprofen',
                'Quels sont les effets du Doliprane?',
                'Best painkiller for headache',
                'جرعة أموكسيسيلين للأطفال',
              ].map(q => (
                <button key={q} onClick={() => send(q)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all active:scale-95 border ${
                    dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-violet-500 hover:text-violet-400' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600'
                  }`}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gradient-to-br from-violet-500 to-purple-600'
            }`}>
              {m.role === 'user'
                ? <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                : <Sparkles className="w-4 h-4 text-white" />
              }
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-sm shadow-md shadow-violet-500/20'
                : `${bg} border ${dark ? 'border-gray-700' : 'border-gray-100'} rounded-tl-sm shadow-sm`
            }`}>
              {m.role === 'user'
                ? <p className="text-sm leading-relaxed">{m.content}</p>
                : <div>{fmt(m.content)}</div>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className={`${bg} border ${dark ? 'border-gray-700' : 'border-gray-100'} rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm`}>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Thinking...</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className={`border-t flex-shrink-0 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">AI can make mistakes — always verify with a doctor</p>
        </div>
        <div className="flex gap-2 p-3">
          <input
            ref={inputRef}
            type="text"
            value={inp}
            onChange={e => setInp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about any drug..."
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
              dark ? 'bg-gray-700 text-white placeholder:text-gray-500' : 'bg-gray-100 text-gray-900 placeholder:text-gray-400'
            }`}
          />
          <button
            onClick={() => send()}
            disabled={!inp.trim() || loading}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white rounded-2xl px-5 py-3.5 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 disabled:shadow-none active:scale-95 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
