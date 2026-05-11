import { useState } from 'react';
import { ChevronDown, ChevronUp, Pill, AlertTriangle, Clock, Shield, ArrowLeftRight, Info, DollarSign, Globe } from 'lucide-react';
import type { OpenFDADrug } from '../services/drugApi';
import TranslateBar from './TranslateBar';

export default function FDADrugCard({ drug, dark }: { drug: OpenFDADrug; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const cut = (t: string, m = 300) => !t ? '' : t.length <= m ? t : t.substring(0, m) + '...';

  // Build full text for translation
  const fullText = [
    `Drug: ${drug.brandName} (${drug.genericName})`,
    drug.indications ? `Uses: ${cut(drug.indications, 500)}` : '',
    drug.dosage ? `Dosage: ${cut(drug.dosage, 400)}` : '',
    drug.warnings ? `Warnings: ${cut(drug.warnings, 400)}` : '',
    drug.contraindications ? `Contraindications: ${cut(drug.contraindications, 300)}` : '',
    drug.adverseReactions ? `Side Effects: ${cut(drug.adverseReactions, 300)}` : '',
    drug.drugInteractions ? `Interactions: ${cut(drug.drugInteractions, 300)}` : '',
  ].filter(Boolean).join('\n\n');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0"><Pill className="w-5 h-5 text-white" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><h3 className="font-black text-gray-900 dark:text-white text-base truncate">{drug.brandName}</h3><Globe className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /></div>
              <p className="text-gray-400 text-xs font-medium">{drug.genericName}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {drug.pharmClass?.[0] && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-[10px] font-bold truncate max-w-[150px]">{drug.pharmClass[0].replace(' [EPC]', '')}</span>}
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-[10px] font-bold">{drug.dosageForm}</span>
              </div>
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold"><DollarSign className="w-3 h-3" />{drug.priceUSD}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold">🇲🇦 {drug.priceMAD}</span>
        </div>
        <p className="text-gray-400 text-[10px] mt-2">{drug.manufacturer} • {drug.route}</p>
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* TRANSLATE BUTTON */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <TranslateBar text={fullText} onResult={setTranslated} dark={dark} />
          </div>

          {/* Show translation if available */}
          {translated && (
            <div className="px-4 py-3 border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20">
              <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mb-2">🌐 Translated Result:</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{translated}</p>
            </div>
          )}

          {/* Original content */}
          <div className="bg-gray-50/50 dark:bg-gray-800/50">
            {!translated && (<>
              {drug.indications && <Sec icon={<Info className="w-4 h-4 text-blue-500"/>} title="Indications"><p className="text-gray-600 dark:text-gray-400 text-sm" dir="ltr">{cut(drug.indications)}</p></Sec>}
              {drug.dosage && <Sec icon={<Clock className="w-4 h-4 text-emerald-500"/>} title="Dosage"><p className="text-gray-600 dark:text-gray-400 text-sm" dir="ltr">{cut(drug.dosage, 400)}</p></Sec>}
              {drug.warnings && <Sec icon={<AlertTriangle className="w-4 h-4 text-amber-500"/>} title="Warnings"><div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3"><p className="text-amber-800 dark:text-amber-400 text-sm" dir="ltr">{cut(drug.warnings, 500)}</p></div></Sec>}
              {drug.contraindications && <Sec icon={<Shield className="w-4 h-4 text-red-500"/>} title="Contraindications"><p className="text-gray-600 dark:text-gray-400 text-sm" dir="ltr">{cut(drug.contraindications)}</p></Sec>}
              {drug.drugInteractions && <Sec icon={<ArrowLeftRight className="w-4 h-4 text-purple-500"/>} title="Interactions"><p className="text-gray-600 dark:text-gray-400 text-sm" dir="ltr">{cut(drug.drugInteractions, 400)}</p></Sec>}
            </>)}
            {drug.productNdc && <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-center"><span className="text-[10px] text-gray-500 font-medium">NDC: </span><span className="text-[10px] font-mono text-gray-700 dark:text-gray-300 font-bold">{drug.productNdc}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Sec({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="p-4 border-b border-gray-100 dark:border-gray-800"><div className="flex items-center gap-2 mb-2">{icon}<h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{title}</h4></div><div className="ml-6">{children}</div></div>;
}
