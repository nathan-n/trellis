import type { OpenFdaMetadata, Medication } from '../types';

const API_BASE = 'https://api.fda.gov/drug/label.json';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSentence = cut.lastIndexOf('. ');
  return (lastSentence > max * 0.5 ? cut.slice(0, lastSentence + 1) : cut) + '...';
}

// Types for search results
export interface OpenFdaSearchResult {
  brandName: string;
  genericName: string;
  splId: string;
}

export interface InteractionWarning {
  existingMedName: string;
  warningText: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function searchDrugLabels(query: string): Promise<OpenFdaSearchResult[]> {
  if (query.length < 2) return [];

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<OpenFdaSearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(query.replace(/[^\w\s]/g, ''));
    const url = `${API_BASE}?search=(openfda.brand_name:${encoded}*+OR+openfda.generic_name:${encoded}*)&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const results = json.results ?? [];

    // Deduplicate by generic name
    const seen = new Set<string>();
    const deduped: OpenFdaSearchResult[] = [];

    for (const r of results) {
      const genericName = r.openfda?.generic_name?.[0] ?? '';
      const brandName = r.openfda?.brand_name?.[0] ?? genericName;
      const splId = r.openfda?.spl_id?.[0] ?? '';

      if (!splId || !genericName) continue;
      const key = genericName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      deduped.push({ brandName, genericName, splId });
    }

    setCache(cacheKey, deduped);
    return deduped;
  } catch (err) {
    console.error('openFDA search error:', err);
    return [];
  }
}

// ─── Fetch Details ───────────────────────────────────────────────────────────

export async function fetchDrugDetails(splId: string): Promise<OpenFdaMetadata | null> {
  const cacheKey = `details:${splId}`;
  const cached = getCached<OpenFdaMetadata>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${API_BASE}?search=openfda.spl_id:"${splId}"&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json();
    const label = json.results?.[0];
    if (!label) return null;

    // Extract available dosages from description or dosage_and_administration
    const dosageText = label.dosage_and_administration?.[0] ?? label.description?.[0] ?? '';
    const dosageMatches: string[] = dosageText.match(/\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU|units?)/gi) ?? [];
    const availableDosages: string[] = [...new Set(dosageMatches.map((d) => d.trim()))];

    const metadata: OpenFdaMetadata = {
      splId,
      brandNames: label.openfda?.brand_name ?? [],
      genericNames: label.openfda?.generic_name ?? [],
      pharmClassEpc: label.openfda?.pharm_class_epc ?? [],
      availableDosages,
      indicationsAndUsage: truncate(label.indications_and_usage?.[0] ?? '', 2000),
      adverseReactions: truncate(label.adverse_reactions?.[0] ?? '', 2000),
      drugInteractions: truncate(label.drug_interactions?.[0] ?? '', 2000),
      warningsAndCautions: truncate(
        label.warnings_and_cautions?.[0] ?? label.warnings?.[0] ?? '',
        2000
      ),
      dailyMedUrl: `https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=${splId}`,
      fetchedAt: Date.now(),
    };

    setCache(cacheKey, metadata);
    return metadata;
  } catch (err) {
    console.error('openFDA detail fetch error:', err);
    return null;
  }
}

// ─── Interaction Cross-Check ─────────────────────────────────────────────────

function searchTextForDrugName(text: string, names: string[]): string | null {
  const lower = text.toLowerCase();
  for (const name of names) {
    if (name.length < 3) continue;
    const idx = lower.indexOf(name.toLowerCase());
    if (idx !== -1) {
      // Extract surrounding context (~300 chars)
      const start = Math.max(0, idx - 100);
      const end = Math.min(text.length, idx + name.length + 200);
      return text.slice(start, end).trim();
    }
  }
  return null;
}

export async function checkInteractions(
  newDrugMeta: OpenFdaMetadata | null,
  newDrugName: string,
  existingMeds: Medication[]
): Promise<InteractionWarning[]> {
  const warnings: InteractionWarning[] = [];
  const activeMeds = existingMeds.filter((m) => m.isActive);

  if (!activeMeds.length) return warnings;

  // Check new drug's interactions text for mentions of existing meds
  if (newDrugMeta?.drugInteractions) {
    for (const med of activeMeds) {
      const names = [med.name];
      if (med.openFda) {
        names.push(...med.openFda.brandNames, ...med.openFda.genericNames);
      }
      const match = searchTextForDrugName(newDrugMeta.drugInteractions, names);
      if (match) {
        warnings.push({ existingMedName: med.name, warningText: match });
      }
    }
  }

  // Check existing meds' stored interactions for mentions of the new drug
  const newNames = [newDrugName];
  if (newDrugMeta) {
    newNames.push(...newDrugMeta.brandNames, ...newDrugMeta.genericNames);
  }

  for (const med of activeMeds) {
    if (!med.openFda?.drugInteractions) continue;
    // Skip if we already found a warning for this med above
    if (warnings.some((w) => w.existingMedName === med.name)) continue;

    const match = searchTextForDrugName(med.openFda.drugInteractions, newNames);
    if (match) {
      warnings.push({ existingMedName: med.name, warningText: match });
    }
  }

  return warnings;
}
