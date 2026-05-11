// OpenFDA API Service - Free drug database with millions of medications
const OPENFDA_BASE = 'https://api.fda.gov/drug';

export interface OpenFDADrug {
  id: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  dosageForm: string;
  route: string;
  activeIngredients: Array<{ name: string; strength: string }>;
  indications: string;
  warnings: string;
  adverseReactions: string;
  dosage: string;
  contraindications: string;
  drugInteractions: string;
  pharmClass: string[];
  productNdc: string;
  priceUSD: string;
  priceMAD: string;
}

export interface SearchResult {
  drugs: OpenFDADrug[];
  total: number;
  error?: string;
}

// Exchange rate (approximate)
const USD_TO_MAD = 10.1;

function estimatePrice(drugName: string): { usd: string; mad: string } {
  // Estimated prices based on drug type
  const priceRanges: Record<string, [number, number]> = {
    'antibiotic': [5, 30],
    'analgesic': [3, 15],
    'antidiabetic': [10, 80],
    'antihypertensive': [8, 40],
    'statin': [10, 50],
    'ppi': [8, 25],
    'antihistamine': [5, 20],
    'bronchodilator': [15, 60],
    'corticosteroid': [8, 35],
    'vitamin': [5, 25],
    'default': [5, 30]
  };

  const lowerName = drugName.toLowerCase();
  let range = priceRanges.default;

  if (lowerName.includes('cillin') || lowerName.includes('mycin') || lowerName.includes('floxacin')) {
    range = priceRanges.antibiotic;
  } else if (lowerName.includes('prazole') || lowerName.includes('tidine')) {
    range = priceRanges.ppi;
  } else if (lowerName.includes('statin')) {
    range = priceRanges.statin;
  } else if (lowerName.includes('formin') || lowerName.includes('insulin') || lowerName.includes('gliptin')) {
    range = priceRanges.antidiabetic;
  } else if (lowerName.includes('sartan') || lowerName.includes('pril') || lowerName.includes('dipine')) {
    range = priceRanges.antihypertensive;
  } else if (lowerName.includes('cetamol') || lowerName.includes('profen') || lowerName.includes('fenac')) {
    range = priceRanges.analgesic;
  } else if (lowerName.includes('zine') || lowerName.includes('tadine')) {
    range = priceRanges.antihistamine;
  } else if (lowerName.includes('sone') || lowerName.includes('solone')) {
    range = priceRanges.corticosteroid;
  } else if (lowerName.includes('vitamin') || lowerName.includes('calcium')) {
    range = priceRanges.vitamin;
  }

  return {
    usd: `$${range[0].toFixed(2)} - $${range[1].toFixed(2)}`,
    mad: `${(range[0] * USD_TO_MAD).toFixed(2)} - ${(range[1] * USD_TO_MAD).toFixed(2)} درهم`
  };
}

export async function searchDrugs(query: string, limit: number = 20): Promise<SearchResult> {
  try {
    if (!query || query.trim().length < 2) {
      return { drugs: [], total: 0 };
    }

    const encodedQuery = encodeURIComponent(query.trim());
    
    // Search in brand name and generic name
    const url = `${OPENFDA_BASE}/label.json?search=(openfda.brand_name:"${encodedQuery}"+openfda.generic_name:"${encodedQuery}")&limit=${limit}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try alternative search
      const altUrl = `${OPENFDA_BASE}/label.json?search=openfda.brand_name:${encodedQuery}*&limit=${limit}`;
      const altResponse = await fetch(altUrl);
      
      if (!altResponse.ok) {
        return { drugs: [], total: 0, error: 'No results found' };
      }
      
      const altData = await altResponse.json();
      return parseResults(altData);
    }

    const data = await response.json();
    return parseResults(data);
  } catch (error) {
    console.error('OpenFDA API Error:', error);
    return { drugs: [], total: 0, error: 'Failed to fetch data' };
  }
}

export async function searchByNDC(ndc: string): Promise<SearchResult> {
  try {
    const cleanNdc = ndc.replace(/[^0-9-]/g, '');
    const url = `${OPENFDA_BASE}/ndc.json?search=product_ndc:"${cleanNdc}"&limit=5`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return { drugs: [], total: 0, error: 'NDC not found' };
    }

    const data = await response.json();
    return parseNDCResults(data);
  } catch (error) {
    return { drugs: [], total: 0, error: 'Failed to fetch NDC data' };
  }
}

function parseResults(data: any): SearchResult {
  if (!data.results || data.results.length === 0) {
    return { drugs: [], total: 0 };
  }

  const drugs: OpenFDADrug[] = data.results.map((result: any, index: number) => {
    const openfda = result.openfda || {};
    const brandName = openfda.brand_name?.[0] || 'Unknown';
    const genericName = openfda.generic_name?.[0] || 'Unknown';
    const prices = estimatePrice(genericName || brandName);

    return {
      id: `fda-${index}-${Date.now()}`,
      brandName: brandName,
      genericName: genericName,
      manufacturer: openfda.manufacturer_name?.[0] || 'Unknown Manufacturer',
      dosageForm: openfda.dosage_form?.[0] || result.dosage_form?.[0] || 'Various',
      route: openfda.route?.[0] || result.route?.[0] || 'Various',
      activeIngredients: (openfda.substance_name || []).map((name: string) => ({
        name,
        strength: ''
      })),
      indications: extractText(result.indications_and_usage),
      warnings: extractText(result.warnings) || extractText(result.boxed_warning),
      adverseReactions: extractText(result.adverse_reactions),
      dosage: extractText(result.dosage_and_administration),
      contraindications: extractText(result.contraindications),
      drugInteractions: extractText(result.drug_interactions),
      pharmClass: openfda.pharm_class_epc || [],
      productNdc: openfda.product_ndc?.[0] || '',
      priceUSD: prices.usd,
      priceMAD: prices.mad
    };
  });

  // Remove duplicates based on brand name
  const uniqueDrugs = drugs.reduce((acc: OpenFDADrug[], drug) => {
    if (!acc.find(d => d.brandName.toLowerCase() === drug.brandName.toLowerCase())) {
      acc.push(drug);
    }
    return acc;
  }, []);

  return {
    drugs: uniqueDrugs,
    total: data.meta?.results?.total || uniqueDrugs.length
  };
}

function parseNDCResults(data: any): SearchResult {
  if (!data.results || data.results.length === 0) {
    return { drugs: [], total: 0 };
  }

  const drugs: OpenFDADrug[] = data.results.map((result: any, index: number) => {
    const openfda = result.openfda || {};
    const brandName = result.brand_name || openfda.brand_name?.[0] || 'Unknown';
    const genericName = result.generic_name || openfda.generic_name?.[0] || 'Unknown';
    const prices = estimatePrice(genericName || brandName);

    return {
      id: `ndc-${index}-${Date.now()}`,
      brandName: brandName,
      genericName: genericName,
      manufacturer: result.labeler_name || openfda.manufacturer_name?.[0] || 'Unknown',
      dosageForm: result.dosage_form || 'Various',
      route: result.route?.[0] || 'Various',
      activeIngredients: (result.active_ingredients || []).map((ing: any) => ({
        name: ing.name,
        strength: ing.strength
      })),
      indications: '',
      warnings: '',
      adverseReactions: '',
      dosage: '',
      contraindications: '',
      drugInteractions: '',
      pharmClass: openfda.pharm_class_epc || result.pharm_class || [],
      productNdc: result.product_ndc || '',
      priceUSD: prices.usd,
      priceMAD: prices.mad
    };
  });

  return {
    drugs,
    total: data.meta?.results?.total || drugs.length
  };
}

function extractText(field: any): string {
  if (!field) return '';
  if (Array.isArray(field)) {
    return field[0] || '';
  }
  return String(field);
}

// Get drug suggestions for autocomplete
export async function getDrugSuggestions(query: string): Promise<string[]> {
  try {
    if (query.length < 2) return [];
    
    const url = `${OPENFDA_BASE}/label.json?search=openfda.brand_name:${encodeURIComponent(query)}*&limit=10`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    const suggestions = new Set<string>();
    data.results?.forEach((result: any) => {
      if (result.openfda?.brand_name) {
        result.openfda.brand_name.forEach((name: string) => suggestions.add(name));
      }
      if (result.openfda?.generic_name) {
        result.openfda.generic_name.forEach((name: string) => suggestions.add(name));
      }
    });
    
    return Array.from(suggestions).slice(0, 10);
  } catch {
    return [];
  }
}

// Get popular/common drugs
export async function getPopularDrugs(): Promise<OpenFDADrug[]> {
  const popularNames = [
    'Aspirin', 'Ibuprofen', 'Acetaminophen', 'Amoxicillin', 'Metformin',
    'Lisinopril', 'Atorvastatin', 'Omeprazole', 'Amlodipine', 'Albuterol'
  ];
  
  const results: OpenFDADrug[] = [];
  
  for (const name of popularNames.slice(0, 6)) {
    try {
      const result = await searchDrugs(name, 1);
      if (result.drugs.length > 0) {
        results.push(result.drugs[0]);
      }
    } catch {
      continue;
    }
  }
  
  return results;
}
