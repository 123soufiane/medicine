// ═══ Google Gemini AI — Free Tier ═══
// Analyzes medicine images using Gemini vision model

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const DRUG_PROMPT = `You are a pharmaceutical expert. Analyze this medicine image carefully.

IMPORTANT: Return ONLY valid JSON — no markdown, no backticks, no explanation. Just the JSON object.

{
  "drugName": "brand name visible on packaging",
  "genericName": "active ingredient / generic name",
  "manufacturer": "manufacturer name if visible",
  "dosageForm": "tablet/capsule/syrup/etc",
  "strength": "strength if visible like 500mg",
  "category": "drug category in English",
  "categoryAr": "drug category in Arabic",
  "descriptionEn": "brief description of the drug in English (2-3 sentences)",
  "descriptionAr": "brief description of the drug in Arabic (2-3 sentences)",
  "usesEn": ["use 1", "use 2", "use 3"],
  "usesAr": ["استخدام 1", "استخدام 2", "استخدام 3"],
  "sideEffectsEn": ["side effect 1", "side effect 2"],
  "sideEffectsAr": ["عرض جانبي 1", "عرض جانبي 2"],
  "warningsEn": ["warning 1", "warning 2"],
  "warningsAr": ["تحذير 1", "تحذير 2"],
  "dosageEn": "recommended dosage in English",
  "dosageAr": "الجرعة الموصى بها بالعربية",
  "estimatedPriceUSD": "$X - $Y",
  "estimatedPriceMAD": "X - Y درهم",
  "confidence": "high/medium/low"
}

If you cannot identify the medicine, still fill the fields with your best guess based on any visible text. Set confidence to "low" if unsure.`;

export interface GeminiDrugResult {
  drugName: string;
  genericName: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  category: string;
  categoryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  usesEn: string[];
  usesAr: string[];
  sideEffectsEn: string[];
  sideEffectsAr: string[];
  warningsEn: string[];
  warningsAr: string[];
  dosageEn: string;
  dosageAr: string;
  estimatedPriceUSD: string;
  estimatedPriceMAD: string;
  confidence: 'high' | 'medium' | 'low';
}

export async function analyzeImageWithGemini(
  base64Image: string,
  apiKey: string
): Promise<{ success: boolean; data?: GeminiDrugResult; error?: string }> {
  try {
    // Strip data URL prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = base64Image.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';

    const body = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: DRUG_PROMPT }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      if (res.status === 400) return { success: false, error: 'مفتاح API غير صالح أو الصورة غير مدعومة' };
      if (res.status === 403) return { success: false, error: 'مفتاح API مرفوض. تحقق من صلاحيته' };
      if (res.status === 429) return { success: false, error: 'تم تجاوز الحد المجاني. حاول لاحقاً' };
      return { success: false, error: errData?.error?.message || `خطأ HTTP ${res.status}` };
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return { success: false, error: 'لم يتم الحصول على رد من Gemini' };

    // Parse JSON from response (handle markdown code blocks)
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: GeminiDrugResult = JSON.parse(cleaned);
    return { success: true, data: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
    if (msg.includes('JSON')) return { success: false, error: 'تعذر تحليل رد Gemini. حاول بصورة أوضح' };
    return { success: false, error: msg };
  }
}

// ═══ Translate any text via Gemini ═══
export async function translateText(
  text: string,
  targetLang: string,
  apiKey: string
): Promise<{ success: boolean; translated?: string; error?: string }> {
  try {
    const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text, nothing else.\n\nText:\n${text}`;
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    const out = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return out ? { success: true, translated: out.trim() } : { success: false, error: 'Empty response' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Translation failed' };
  }
}

// ═══ Translate full drug result ═══
export async function translateDrugResult(
  drug: GeminiDrugResult,
  targetLang: string,
  apiKey: string
): Promise<{ success: boolean; data?: Partial<GeminiDrugResult>; error?: string }> {
  try {
    const prompt = `Translate the following drug information to ${targetLang}.
Return ONLY valid JSON — no markdown, no backticks.

{
  "categoryAr": "${drug.categoryAr}",
  "descriptionAr": "${drug.descriptionAr}",
  "descriptionEn": "${drug.descriptionEn}",
  "usesAr": ${JSON.stringify(drug.usesAr)},
  "usesEn": ${JSON.stringify(drug.usesEn)},
  "sideEffectsAr": ${JSON.stringify(drug.sideEffectsAr)},
  "sideEffectsEn": ${JSON.stringify(drug.sideEffectsEn)},
  "warningsAr": ${JSON.stringify(drug.warningsAr)},
  "warningsEn": ${JSON.stringify(drug.warningsEn)},
  "dosageAr": "${drug.dosageAr}",
  "dosageEn": "${drug.dosageEn}"
}

Translate ALL values to ${targetLang}. Keep the same JSON keys but replace ALL Arabic ("Ar" suffix) and English ("En" suffix) values with the ${targetLang} translation. Return same structure.`;

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    let text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(text);
    return { success: true, data: parsed };
  } catch {
    return { success: false, error: 'Translation failed' };
  }
}

// API key management
const STORAGE_KEY = 'dawaouk_gemini_key';
export function getStoredApiKey(): string { return localStorage.getItem(STORAGE_KEY) || ''; }
export function setStoredApiKey(key: string) { localStorage.setItem(STORAGE_KEY, key); }
