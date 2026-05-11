import { useState } from 'react';
import { Languages, Loader2, Check } from 'lucide-react';
import { getStoredApiKey } from '../services/geminiAI';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const LANGS = [
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'id', label: 'Bahasa', flag: '🇮🇩' },
];

interface Props {
  text: string;
  onResult: (translated: string) => void;
  dark?: boolean;
}

export default function TranslateBar({ text, onResult, dark }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [doneLang, setDoneLang] = useState('');

  const doTranslate = async (langLabel: string) => {
    const key = getStoredApiKey();
    if (!key) { alert('Set Gemini API key first (Scan → API Key)'); return; }
    if (!text.trim()) return;
    setLoading(true); setDoneLang(langLabel); setOpen(false);
    try {
      const res = await fetch(`${GEMINI}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Translate the following pharmaceutical/medical text to ${langLabel}. Return ONLY the translated text, nothing else:\n\n${text}` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
        })
      });
      const json = await res.json();
      const out = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (out) onResult(out.trim());
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} disabled={loading}
        className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm
          ${loading ? 'opacity-70' : ''}
          ${dark
            ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/40 text-violet-300 hover:from-violet-600/40 hover:to-purple-600/40'
            : 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-violet-700 hover:from-violet-100 hover:to-purple-100'
          }`}>
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Translating to {doneLang}...</>
          : <><Languages className="w-5 h-5" />🌐 Translate Result</>
        }
      </button>

      {open && !loading && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className={`absolute bottom-full mb-2 left-0 w-72 rounded-2xl border shadow-2xl z-40 overflow-hidden
          ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`text-sm font-black ${dark ? 'text-gray-200' : 'text-gray-800'}`}>🌐 Translate to</p>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-2 gap-1">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => doTranslate(l.label)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-left
                  ${doneLang === l.label ? (dark ? 'bg-violet-900/30' : 'bg-violet-50') : ''}
                  ${dark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-violet-50 text-gray-800'}`}>
                <span className="text-lg">{l.flag}</span>
                <span className="text-xs font-bold truncate">{l.label}</span>
                {doneLang === l.label && <Check className="w-3 h-3 text-violet-500 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </>)}
    </div>
  );
}
